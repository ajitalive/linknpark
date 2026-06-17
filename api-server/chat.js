const crypto = require('crypto');
// We need Expo Server SDK to send push notifications to the owner
// wait, the push tokens are stored in push_tokens table, and we might need to fetch them
// and use fetch('https://exp.host/--/api/v2/push/send') directly.

const activeSockets = new Map(); // Map of session_id -> { visitor: ws, owner: ws }

function initChatWebSocket(wss, supabase, jwt, JWT_SECRET) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token'); // JWT for owner, random string for visitor
    const sessionId = url.searchParams.get('session_id');
    const role = url.searchParams.get('role'); // 'visitor' or 'owner'

    if (!sessionId || !role || !token) {
      ws.close(1008, 'Missing required params');
      return;
    }

    let authUserEmail = null;

    if (role === 'owner') {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        authUserEmail = decoded.email;
      } catch (err) {
        ws.close(1008, 'Invalid JWT');
        return;
      }
    }

    ws.on('message', async (rawMsg) => {
      try {
        const data = JSON.parse(rawMsg);
        
        if (data.type === 'auth') {
          // Initialize session in memory
          if (!activeSockets.has(sessionId)) {
            activeSockets.set(sessionId, { visitor: null, owner: null });
          }
          const session = activeSockets.get(sessionId);
          session[role] = ws;
          ws.role = role;
          ws.sessionId = sessionId;
          ws.send(JSON.stringify({ type: 'connected', role }));
          return;
        }

        if (data.type === 'message') {
          const content = data.content;
          
          // 1. Save to database
          if (supabase) {
            await supabase.from('chat_messages').insert({
              session_id: sessionId,
              sender_type: role,
              content: content
            });
          }

          // 2. Broadcast to the OTHER party
          const session = activeSockets.get(sessionId);
          if (session) {
            const targetRole = role === 'visitor' ? 'owner' : 'visitor';
            const targetWs = session[targetRole];
            
            if (targetWs && targetWs.readyState === 1 /* OPEN */) {
              targetWs.send(JSON.stringify({
                type: 'message',
                sender_type: role,
                content: content,
                created_at: new Date().toISOString()
              }));
            } else if (role === 'visitor') {
              // Owner is not connected, trigger push notification
              triggerPushNotification(sessionId, content, supabase);
            }
          }
        }
      } catch (e) {
        console.error('[CHAT WS Error]', e);
      }
    });

    ws.on('close', () => {
      const session = activeSockets.get(ws.sessionId);
      if (session && session[ws.role] === ws) {
        session[ws.role] = null;
      }
    });
  });
}

async function triggerPushNotification(sessionId, content, supabase) {
  if (!supabase) return;
  try {
    // Find the owner_email for this session by joining with incidents and stickers
    const { data: sessionData } = await supabase
      .from('chat_sessions')
      .select('incident_id')
      .eq('id', sessionId)
      .single();
      
    if (!sessionData) return;

    const { data: incidentData } = await supabase
      .from('incidents')
      .select('sticker_code')
      .eq('id', sessionData.incident_id)
      .single();
      
    if (!incidentData) return;

    const { data: stickerData } = await supabase
      .from('stickers')
      .select('owner_email, vehicle_name, registration')
      .eq('code', incidentData.sticker_code)
      .single();

    if (!stickerData || !stickerData.owner_email) return;

    const email = stickerData.owner_email;
    const vehicle = stickerData.vehicle_name || stickerData.registration || 'your vehicle';

    // Fetch push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('email', email);

    if (!tokens || tokens.length === 0) return;

    const pushMessages = tokens.map(t => ({
      to: t.token,
      title: `Visitor at ${vehicle}`,
      body: content,
      data: { url: `/chat/${sessionId}` },
      sound: 'default'
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pushMessages)
    });
  } catch (err) {
    console.error('[Push Error]', err);
  }
}

module.exports = { initChatWebSocket };
