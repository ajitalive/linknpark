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

  // Haversine distance in km between two lat/lng points
  function distanceKm(lat1, lon1, lat2, lon2) {
    const toRad = d => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // GET /api/guardians/zones — the zones the user has JOINED (their active zones)
  router.get('/api/guardians/zones', requireAuth, async (req, res) => {
    const email = req.user.email;

    const { data: memData, error: memErr } = await supabase
      .from('zone_members').select('zone_id').eq('user_email', email);
    if (memErr) return res.status(500).json({ error: memErr.message });

    const joinedIds = (memData || []).map(m => m.zone_id);
    if (joinedIds.length === 0) return res.json({ zones: [] });

    const { data: zonesData, error: zonesErr } = await supabase
      .from('zones').select('*').in('id', joinedIds);
    if (zonesErr) return res.status(500).json({ error: zonesErr.message });

    const zones = (zonesData || []).map(z => ({
      id: z.id, name: z.name, zone: z.area, active: true,
    }));
    res.json({ zones });
  });

  // GET /api/guardians/zones/nearby?lat=&lng= — admin-seeded zones near the user
  router.get('/api/guardians/zones/nearby', requireAuth, async (req, res) => {
    const email = req.user.email;
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const { data: zonesData, error: zonesErr } = await supabase.from('zones').select('*');
    if (zonesErr) return res.status(500).json({ error: zonesErr.message });

    const { data: memData } = await supabase
      .from('zone_members').select('zone_id').eq('user_email', email);
    const joinedIds = new Set((memData || []).map(m => m.zone_id));

    const SEARCH_RADIUS_KM = 25; // show zones within 25km, sorted by distance
    const zones = (zonesData || [])
      .filter(z => z.lat != null && z.lng != null)
      .map(z => {
        const distance_km = distanceKm(lat, lng, z.lat, z.lng);
        return {
          id: z.id,
          name: z.name,
          zone: z.area,
          distance_km: Math.round(distance_km * 10) / 10,
          inside: distance_km <= (z.radius_km || 2),
          active: joinedIds.has(z.id),
        };
      })
      .filter(z => z.distance_km <= SEARCH_RADIUS_KM)
      .sort((a, b) => a.distance_km - b.distance_km);

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
