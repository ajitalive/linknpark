const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Redis Pub/Sub (optional)
// If REDIS_URL is set we use two ioredis clients (pub + sub) so that messages
// from one server instance are broadcast to all instances that share the same
// Redis.  When REDIS_URL is not set we fall back to the original in-memory Map
// — local dev works with no extra dependencies.
// ---------------------------------------------------------------------------
let redisPub = null;
let redisSub = null;

if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');

    redisPub = new Redis(process.env.REDIS_URL, { lazyConnect: false });
    redisSub = new Redis(process.env.REDIS_URL, { lazyConnect: false });

    redisPub.on('error', (err) => console.error('[Redis pub error]', err));
    redisSub.on('error', (err) => console.error('[Redis sub error]', err));

    console.log('[Chat] Redis Pub/Sub enabled:', process.env.REDIS_URL);
  } catch (err) {
    console.error('[Chat] Failed to initialise Redis – falling back to in-memory:', err.message);
    redisPub = null;
    redisSub = null;
  }
} else {
  console.log('[Chat] REDIS_URL not set – using in-memory socket map (single-instance mode)');
}

// ---------------------------------------------------------------------------
// In-memory socket store (used in both modes)
// Map<sessionId, { visitor: ws | null, owner: ws | null }>
// In Redis mode this only holds sockets connected to THIS instance.
// ---------------------------------------------------------------------------
const activeSockets = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the Redis channel name for a given session.
 * @param {string} sessionId
 * @returns {string}
 */
function redisChannel(sessionId) {
  return `chat:${sessionId}`;
}

/**
 * Deliver a chat payload to the target role's socket on THIS instance (if present).
 * @param {string} sessionId
 * @param {'visitor'|'owner'} targetRole
 * @param {object} payload  – already-serialisable object
 */
function deliverLocal(sessionId, targetRole, payload) {
  const session = activeSockets.get(sessionId);
  if (!session) return;
  const targetWs = session[targetRole];
  if (targetWs && targetWs.readyState === 1 /* OPEN */) {
    targetWs.send(JSON.stringify(payload));
  }
}

// ---------------------------------------------------------------------------
// Main WebSocket initialiser
// ---------------------------------------------------------------------------

function initChatWebSocket(wss, supabase, jwt, JWT_SECRET) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token      = url.searchParams.get('token');      // JWT for owner, random string for visitor
    const sessionId  = url.searchParams.get('session_id');
    const role       = url.searchParams.get('role');       // 'visitor' or 'owner'

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

    // ------------------------------------------------------------------
    // Per-connection Redis subscription
    // When a message arrives on chat:<sessionId> we deliver it locally.
    // We duplicate the shared redisSub client so each connection has its
    // own subscriber state and can be cleaned up independently.
    // ------------------------------------------------------------------
    let perConnectionSub = null;

    if (redisSub) {
      perConnectionSub = redisSub.duplicate();
      perConnectionSub.on('error', (err) => console.error('[Redis perConnectionSub]', err));

      const channel = redisChannel(sessionId);

      perConnectionSub.subscribe(channel, (err) => {
        if (err) console.error('[Redis subscribe error]', err);
      });

      perConnectionSub.on('message', (_channel, rawPayload) => {
        try {
          const { targetRole, payload } = JSON.parse(rawPayload);
          deliverLocal(sessionId, targetRole, payload);
        } catch (e) {
          console.error('[Redis message parse error]', e);
        }
      });
    }

    // ------------------------------------------------------------------
    // WebSocket message handler
    // ------------------------------------------------------------------
    ws.on('message', async (rawMsg) => {
      try {
        const data = JSON.parse(rawMsg);

        // ---- auth handshake ----
        if (data.type === 'auth') {
          if (!activeSockets.has(sessionId)) {
            activeSockets.set(sessionId, { visitor: null, owner: null });
          }
          const session = activeSockets.get(sessionId);
          session[role] = ws;
          ws.role      = role;
          ws.sessionId = sessionId;
          ws.send(JSON.stringify({ type: 'connected', role }));
          return;
        }

        // ---- chat message ----
        if (data.type === 'message') {
          const content    = data.content;
          const targetRole = role === 'visitor' ? 'owner' : 'visitor';

          // 1. Persist to database (best-effort — table may not exist yet)
          if (supabase) {
            await supabase.from('chat_messages').insert({
              session_id:  sessionId,
              sender_type: role,
              content
            }).then(({ error }) => {
              if (error) console.warn('[Chat] Could not persist message:', error.message);
            });
          }

          const payload = {
            type:        'message',
            sender_type: role,
            content,
            created_at:  new Date().toISOString()
          };

          if (redisPub) {
            // 2a. Redis mode: publish to channel.
            // All instances subscribed to this channel (including this one
            // via perConnectionSub) will call deliverLocal() for their
            // locally-connected socket.
            const subscriberCount = await redisPub.publish(
              redisChannel(sessionId),
              JSON.stringify({ targetRole, payload })
            );

            // If no instance has the target socket open AND the sender is a
            // visitor, send a push notification to the owner's device.
            if (subscriberCount === 0 && role === 'visitor') {
              triggerPushNotification(sessionId, content, supabase);
            }
          } else {
            // 2b. In-memory mode: deliver directly (original behaviour).
            const session = activeSockets.get(sessionId);
            if (session) {
              const targetWs = session[targetRole];
              if (targetWs && targetWs.readyState === 1 /* OPEN */) {
                targetWs.send(JSON.stringify(payload));
              } else if (role === 'visitor') {
                // Owner not connected locally – send push notification
                triggerPushNotification(sessionId, content, supabase);
              }
            }
          }
        }
      } catch (e) {
        console.error('[CHAT WS Error]', e);
      }
    });

    // ------------------------------------------------------------------
    // Cleanup on disconnect
    // ------------------------------------------------------------------
    ws.on('close', () => {
      const session = activeSockets.get(ws.sessionId);
      if (session && session[ws.role] === ws) {
        session[ws.role] = null;
      }

      // Tear down the per-connection Redis subscriber
      if (perConnectionSub) {
        perConnectionSub.unsubscribe().catch(() => {});
        perConnectionSub.quit().catch(() => {});
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Push notification helper (unchanged from original)
// ---------------------------------------------------------------------------

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

    const email   = stickerData.owner_email;
    const vehicle = stickerData.vehicle_name || stickerData.registration || 'your vehicle';

    // Fetch push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('email', email);

    if (!tokens || tokens.length === 0) return;

    const pushMessages = tokens.map(t => ({
      to:    t.token,
      title: `Visitor at ${vehicle}`,
      body:  content,
      data:  { url: `/chat/${sessionId}` },
      sound: 'default'
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(pushMessages)
    });
  } catch (err) {
    console.error('[Push Error]', err);
  }
}

module.exports = { initChatWebSocket };
