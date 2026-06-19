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

  // POST /api/chat/init — scanner creates or resumes a chat session
  router.post('/api/chat/init', async (req, res) => {
    const { incident_id, visitor_token } = req.body;
    if (!incident_id || !visitor_token) {
      return res.status(400).json({ error: 'Missing incident_id or visitor_token' });
    }

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
      if (error) return res.status(500).json({ error: error.message });
      session = newSession;
    }

    res.json({ session });
  });

  // GET /api/chat/:sessionId/messages — fetch messages for a session
  router.get('/api/chat/:sessionId/messages', async (req, res) => {
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', req.params.sessionId)
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ messages });
  });

  // GET /api/incidents/:id/chat — mobile app (owner) fetches active chat session
  router.get('/api/incidents/:id/chat', requireAuth, async (req, res) => {
    let { data: session, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('incident_id', req.params.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    if (!session) {
      const visitor_token = crypto.randomBytes(16).toString('hex');
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert({ incident_id: req.params.id, visitor_token })
        .select()
        .single();
      if (createError) return res.status(500).json({ error: createError.message });
      session = newSession;
    }

    res.json({ session });
  });

  return { router };
};
