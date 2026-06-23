'use strict';
/**
 * routes/zones.js
 * Guardian network routes + Guard mode vehicle lookup.
 *
 * Factory args:
 *   supabase      – Supabase client
 *   requireAuth   – auth middleware from routes/auth.js
 */
module.exports = function createZonesRouter({ supabase, requireAuth }) {
  const router = require('express').Router();

  // GET /api/guardians/zones — list all zones with user membership status
  router.get('/api/guardians/zones', requireAuth, async (req, res) => {
    const email = req.user.email;

    const { data: zonesData, error: zonesErr } = await supabase.from('zones').select('*');
    if (zonesErr) return res.status(500).json({ error: zonesErr.message });

    const { data: memData, error: memErr } = await supabase
      .from('zone_members').select('zone_id').eq('user_email', email);
    if (memErr) return res.status(500).json({ error: memErr.message });

    const joinedIds = new Set((memData || []).map(m => m.zone_id));

    const zones = (zonesData || []).map(z => ({
      id: z.id,
      name: z.name,
      zone: z.area,
      active: joinedIds.has(z.id),
    }));
    res.json({ zones });
  });

  // POST /api/guardians/join — join or leave a zone
  router.post('/api/guardians/join', requireAuth, async (req, res) => {
    const { zoneId, active } = req.body;
    const email = req.user.email;
    if (!zoneId) return res.status(400).json({ error: 'zoneId required' });

    if (active) {
      const { error } = await supabase.from('zone_members').insert({ zone_id: zoneId, user_email: email });
      if (error && error.code !== '23505') return res.status(500).json({ error: error.message });
    } else {
      const { error } = await supabase.from('zone_members').delete().match({ zone_id: zoneId, user_email: email });
      if (error) return res.status(500).json({ error: error.message });
    }
    res.json({ ok: true, active });
  });

  // POST /api/guardians/zones — create a new zone (auto-joins creator)
  router.post('/api/guardians/zones', requireAuth, async (req, res) => {
    const { name, zone } = req.body;
    if (!name || !zone) {
      return res.status(400).json({ error: 'Name and zone area are required' });
    }

    const { data: newZone, error: zErr } = await supabase.from('zones').insert({
      name: name.trim(),
      area: zone.trim(),
      created_by: email,
    }).select().single();
    if (zErr) return res.status(500).json({ error: zErr.message });

    const email = req.user.email;
    await supabase.from('zone_members').insert({ zone_id: newZone.id, user_email: email });

    res.json({ ok: true, zone: { id: newZone.id, name: newZone.name, zone: newZone.area, active: true } });
  });

  // GET /api/guard/vehicle — Guard mode: search vehicle by code or plate
  router.get('/api/guard/vehicle', requireAuth, async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'query required' });

    const search = query.trim().toUpperCase();

    const { data, error } = await supabase
      .from('stickers')
      .select('code, vehicle_type, registration, owner_email, status, vehicle_name, color, tag_type, tag_title')
      .or(`code.eq."${search}",registration.eq."${search}"`)
      .not('owner_email', 'is', 'null')
      .neq('status', 'unclaimed')
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Vehicle not found or not registered' });
    }

    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('stickerCode', data.code);

    res.json({
      vehicle: {
        code: data.code,
        plate: data.registration,
        color: data.color || 'Unknown',
        type: data.vehicle_type,
        resident: data.vehicle_name || 'Resident',
        flat: 'N/A',
        tower: 'N/A',
        incidents: count || 0,
      },
    });
  });

  return { router };
};
