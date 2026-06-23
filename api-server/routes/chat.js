'use strict';
/**
 * routes/chat.js
 * Chat REST endpoints (Supabase-backed sessions and messages).
 * NOTE: WebSocket init stays in server.js (via chat.js module).
 *
 * Also includes the legacy in-memory chat routes that were on
 * GET/POST /api/chat/:incidentId (retained for backward compat).
 *
 * Factory args:
 *   supabase      – Supabase client
 *   requireAuth   – auth middleware from routes/auth.js
 *   sendExpoPush  – async function(token, { title, body, data })
 *   chatRooms     – shared in-memory Map { incidentId -> messages[] } from server.js
 */
const crypto = require('crypto');

module.exports = function createChatRouter({ supabase, requireAuth, sendExpoPush, chatRooms }) {
  const router = require('express').Router();

  // ── Legacy in-memory chat (backward compat) ───────────────────────────────

  router.get('/api/chat/:incidentId', (req, res) => {
    const msgs = chatRooms[req.params.incidentId] || [];
    res.json({ messages: msgs });
  });

  router.post('/api/chat/:incidentId', async (req, res) => {
    const { sender, text } = req.body;
    const incidentId = req.params.incidentId;

    if (!chatRooms[incidentId]) chatRooms[incidentId] = [];
    chatRooms[incidentId].push({ sender, text, ts: Date.now() });

    // If scanner sends a message, notify the owner
    if (sender === 'scanner') {
      const { data: incident } = await supabase
        .from('incidents').select('sticker_code').eq('id', incidentId).single();
      if (incident) {
        const code = incident.sticker_code;
        const { data: ownerRow } = await supabase
          .from('stickers').select('owner_email').eq('code', code).single();
        if (ownerRow?.owner_email) {
          const { data: tokenRow } = await supabase
            .from('user_push_tokens').select('token').eq('email', ownerRow.owner_email).single();
          if (tokenRow?.token) {
            await sendExpoPush(tokenRow.token, {
              title: '💬 New Message',
              body: text,
              data: { reportId: incidentId, stickerCode: code },
            });
          }
        }
      }
    }

    res.json({ ok: true });
  });

  // ── Supabase-backed chat sessions ─────────────────────────────────────────

  // In-memory session fallback (used when chat_sessions table doesn't exist yet)
  const memSessions = new Map(); // sessionId -> session object

  function memSession(incident_id, visitor_token) {
    for (const s of memSessions.values()) {
      if (s.incident_id === incident_id && s.visitor_token === visitor_token && s.status === 'active') return s;
    }
    const s = { id: crypto.randomUUID(), incident_id, visitor_token, status: 'active', created_at: new Date().toISOString() };
    memSessions.set(s.id, s);
    return s;
  }

  // POST /api/chat/init — scanner creates or resumes a chat session
  router.post('/api/chat/init', async (req, res) => {
    const { incident_id, visitor_token } = req.body;
    if (!incident_id || !visitor_token) {
      return res.status(400).json({ error: 'Missing incident_id or visitor_token' });
    }

    // Try Supabase first; fall back to in-memory if table doesn't exist yet
    try {
      let { data: session } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('incident_id', incident_id)
        .eq('visitor_token', visitor_token)
        .eq('status', 'active')
        .single();

      if (!session) {
        const { data: newSession, error } = await supabase
          .from('chat_sessions')
          .insert({ incident_id, visitor_token })
          .select()
          .single();
        if (error) throw error;
        session = newSession;
      }

      return res.json({ session });
    } catch (err) {
      console.warn('[Chat] Supabase unavailable, using in-memory session:', err.message);
      return res.json({ session: memSession(incident_id, visitor_token) });
    }
  });

  // POST /api/chat/message — async REST send (used for non-live reasons)
  router.post('/api/chat/message', async (req, res) => {
    const { session_id, content, visitor_token } = req.body;
    if (!session_id || !content) return res.status(400).json({ error: 'Missing session_id or content' });

    // Persist message (best-effort)
    try {
      await supabase.from('chat_messages').insert({ session_id, sender_type: 'visitor', content });
    } catch(e) {
      console.warn('[Chat] Could not persist async message:', e.message);
    }

    // Push-notify owner via incident → sticker → owner_email → push token
    try {
      const { data: session } = await supabase.from('chat_sessions').select('incident_id').eq('id', session_id).single();
      if (session?.incident_id) {
        const { data: incident } = await supabase.from('incidents').select('sticker_code').eq('id', session.incident_id).single();
        if (incident?.sticker_code) {
          const { data: sticker } = await supabase.from('stickers').select('owner_email, registration').eq('code', incident.sticker_code).single();
          if (sticker?.owner_email) {
            const { data: tokens } = await supabase.from('push_tokens').select('token').eq('email', sticker.owner_email);
            const plate = sticker.registration || incident.sticker_code;
            for (const { token } of (tokens || [])) {
              await sendExpoPush(token, {
                title: `💬 Message about ${plate}`,
                body: content,
                data: { reportId: session.incident_id },
              });
            }
          }
        }
      }
    } catch(e) {
      console.warn('[Chat] Push notify failed:', e.message);
    }

    res.json({ ok: true });
  });

  // GET /api/chat/:sessionId/messages — fetch messages for a session
  router.get('/api/chat/:sessionId/messages', async (req, res) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', req.params.sessionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      res.json({ messages });
    } catch {
      res.json({ messages: [] }); // in-memory mode: no history
    }
  });

  // GET /api/incidents/:id/chat — mobile app (owner) fetches active chat session
  router.get('/api/incidents/:id/chat', requireAuth, async (req, res) => {
    try {
      let { data: session, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('incident_id', req.params.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      if (!session) {
        const visitor_token = crypto.randomBytes(16).toString('hex');
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({ incident_id: req.params.id, visitor_token })
          .select()
          .single();
        if (createError) throw createError;
        session = newSession;
      }

      return res.json({ session });
    } catch (err) {
      console.warn('[Chat] Supabase unavailable for owner chat:', err.message);
      // Find or create in-memory session for this incident
      for (const s of memSessions.values()) {
        if (s.incident_id === req.params.id && s.status === 'active') {
          return res.json({ session: s });
        }
      }
      const s = memSession(req.params.id, crypto.randomBytes(8).toString('hex'));
      return res.json({ session: s });
    }
  });

  return { router };
};
