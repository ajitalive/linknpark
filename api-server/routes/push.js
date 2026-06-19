'use strict';
/**
 * routes/push.js
 * Expo push token registration.
 *
 * Factory args:
 *   supabase      – Supabase client
 *   requireAuth   – auth middleware from routes/auth.js
 */
module.exports = function createPushRouter({ supabase, requireAuth }) {
  const router = require('express').Router();

  // POST /api/push-token — store Expo push token for authenticated user
  router.post('/api/push-token', requireAuth, async (req, res) => {
    const { token } = req.body;
    if (!token || !token.startsWith('ExponentPushToken[')) {
      return res.status(400).json({ error: 'Valid Expo push token required' });
    }
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({ email: req.user.email, token, updated_at: new Date().toISOString() }, { onConflict: 'email' });
    if (error) return res.status(500).json({ error: error.message });
    console.log(`[PUSH] Token stored for ${req.user.email}`);
    res.json({ ok: true });
  });

  // POST /api/register-token — legacy endpoint kept for prototype app in production
  router.post('/api/register-token', async (req, res) => {
    res.json({ ok: true });
  });

  return { router };
};
