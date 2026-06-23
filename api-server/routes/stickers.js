'use strict';
/**
 * routes/stickers.js
 * Sticker CRUD — all routes require authentication.
 *
 * Factory args:
 *   supabase      – Supabase client
 *   requireAuth   – auth middleware from routes/auth.js
 */
const crypto = require('crypto');

module.exports = function createStickersRouter({ supabase, requireAuth }) {
  const router = require('express').Router();

  // POST /api/etag — register a free virtual eTag (no physical sticker)
  // Creates a sticker row keyed by a synthetic code so the plate becomes
  // scannable/notifiable and shows up in the owner's vehicle list.
  router.post('/api/etag', requireAuth, async (req, res) => {
    const { registration, vehicle_type, owner_name } = req.body;
    if (!registration || registration.replace(/\s+/g, '').length < 4) {
      return res.status(400).json({ error: 'A valid registration number is required.' });
    }
    const plate = registration.toUpperCase().replace(/\s+/g, '');

    // Dedupe on plate across all active stickers (physical or eTag)
    const { data: existing } = await supabase
      .from('stickers')
      .select('code, owner_email, tag_type, registration, vehicle_type, vehicle_name')
      .eq('registration', plate)
      .neq('status', 'unclaimed')
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (existing.owner_email === req.user.email) {
        // Already registered to this user — return the existing one (idempotent)
        return res.json({ ok: true, duplicate: true, etag: existing });
      }
      return res.status(409).json({ error: 'This plate is already registered on LinkNPark.' });
    }

    const code = 'ETAG-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const { data, error } = await supabase.from('stickers').insert({
      code,
      owner_email: req.user.email,
      registration: plate,
      vehicle_type: vehicle_type || 'car',
      vehicle_name: owner_name || null,
      tag_type: 'etag',
      status: 'active',
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, etag: data });
  });

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
    const { code, vehicle_name, vehicle_type, color, registration, backup_phone, tag_type, tag_title, parking_slot } = req.body;
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
      parking_slot: parking_slot ? parking_slot.toUpperCase() : null,
      status: 'active',
    }).eq('code', normalizedCode).select().single();

    if (error) return res.status(500).json({ error: error.message });
    console.log(`[STICKER] ${req.user.email} activated ${normalizedCode}`);
    res.json({ sticker: data });
  });

  // PATCH /api/stickers/:id — update a sticker (owner only)
  router.patch('/api/stickers/:id', requireAuth, async (req, res) => {
    const updates = {};
    ['vehicle_name', 'registration', 'color', 'status', 'backup_phone', 'tag_type', 'tag_title', 'parking_slot'].forEach(k => {
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
