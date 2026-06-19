'use strict';
/**
 * routes/incidents.js
 * Authenticated incident routes: list and update status.
 *
 * Factory args:
 *   supabase      – Supabase client
 *   requireAuth   – auth middleware from routes/auth.js
 */
module.exports = function createIncidentsRouter({ supabase, requireAuth }) {
  const router = require('express').Router();

  // GET /api/incidents — list incidents for all stickers owned by the user
  router.get('/api/incidents', requireAuth, async (req, res) => {
    const { data: stickers, error: stickersError } = await supabase
      .from('stickers').select('code').eq('owner_email', req.user.email);
    if (stickersError) return res.status(500).json({ error: stickersError.message });
    const codes = (stickers || []).map(s => s.code);
    if (codes.length === 0) return res.json({ incidents: [] });

    const { data, error } = await supabase
      .from('incidents')
      .select('*, stickers!inner(vehicle_name, registration, vehicle_type)')
      .in('sticker_code', codes)
      .order('reported_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ incidents: data });
  });

  // PATCH /api/incidents/:id — update incident status (owner only)
  router.patch('/api/incidents/:id', requireAuth, async (req, res) => {
    const { status } = req.body;
    if (!['open', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }

    // Verify the incident belongs to the authenticated user
    const { data: existing, error: fetchError } = await supabase
      .from('incidents')
      .select('id, sticker_code, stickers!inner(owner_email)')
      .eq('id', req.params.id)
      .single();
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!existing || existing.stickers.owner_email !== req.user.email) {
      return res.status(404).json({ error: 'not found' });
    }

    const update = { status };
    if (status === 'resolved' || status === 'dismissed') {
      update.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('incidents').update(update).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ incident: data });
  });

  return { router };
};
