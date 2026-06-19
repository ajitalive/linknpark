'use strict';
/**
 * routes/stickers.js
 * Sticker CRUD — all routes require authentication.
 *
 * Factory args:
 *   supabase      – Supabase client
 *   requireAuth   – auth middleware from routes/auth.js
 */
module.exports = function createStickersRouter({ supabase, requireAuth }) {
  const router = require('express').Router();

  // GET /api/stickers — list stickers owned by the authenticated user
  router.get('/api/stickers', requireAuth, async (req, res) => {
    const { data, error } = await supabase
      .from('stickers')
      .select('*')
      .eq('owner_email', req.user.email)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ stickers: data });
  });

  // POST /api/stickers — claim a pre-registered sticker code
  router.post('/api/stickers', requireAuth, async (req, res) => {
    const { code, vehicle_name, vehicle_type, color, registration, backup_phone, tag_type, tag_title } = req.body;
    if (!code || !vehicle_type || !registration) {
      return res.status(400).json({ error: 'code, vehicle_type, registration required' });
    }

    const normalizedCode = code.toUpperCase();

    // 1. Check the code exists and is unclaimed
    const { data: existing, error: lookupError } = await supabase
      .from('stickers')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (lookupError) return res.status(500).json({ error: lookupError.message });

    if (!existing) {
      return res.status(400).json({ error: 'Invalid sticker code. This code is not recognized.' });
    }

    if (existing.owner_email && existing.status !== 'unclaimed') {
      return res.status(409).json({ error: 'This sticker has already been registered.' });
    }

    // 2. Claim via UPDATE
    const { data, error } = await supabase.from('stickers').update({
      owner_email: req.user.email,
      vehicle_type,
      vehicle_name: vehicle_name || null,
      registration: registration.toUpperCase(),
      color: color || null,
      backup_phone: backup_phone || null,
      tag_type: tag_type || 'vehicle',
      tag_title: tag_title || null,
      status: 'active',
    }).eq('code', normalizedCode).select().single();

    if (error) return res.status(500).json({ error: error.message });
    console.log(`[STICKER] ${req.user.email} activated ${normalizedCode}`);
    res.json({ sticker: data });
  });

  // PATCH /api/stickers/:id — update a sticker (owner only)
  router.patch('/api/stickers/:id', requireAuth, async (req, res) => {
    const updates = {};
    ['vehicle_name', 'registration', 'color', 'status', 'backup_phone', 'tag_type', 'tag_title'].forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    const { data, error } = await supabase
      .from('stickers')
      .update(updates)
      .eq('id', req.params.id)
      .eq('owner_email', req.user.email)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Sticker not found' });
    res.json({ sticker: data });
  });

  // DELETE /api/stickers/:id — delete a sticker (owner only)
  router.delete('/api/stickers/:id', requireAuth, async (req, res) => {
    const { error } = await supabase
      .from('stickers')
      .delete()
      .eq('id', req.params.id)
      .eq('owner_email', req.user.email);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  });

  return { router };
};
