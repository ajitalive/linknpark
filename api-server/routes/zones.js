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
      .select('code, vehicle_type, registration, owner_email, status, vehicle_name, color, tag_type, tag_title, parking_slot')
      .or(`code.eq."${search}",registration.eq."${search}",parking_slot.eq."${search}"`)
      .not('owner_email', 'is', 'null')
      .neq('status', 'unclaimed')
      .limit(1)
      .single();

    // Log the lookup for the society office dashboard (best-effort)
    const logScan = (matchedCode) => {
      supabase.from('guard_scans').insert({
        guard_email: req.user.email,
        query: search,
        matched_code: matchedCode,
        found: !!matchedCode,
      }).then(({ error: e }) => { if (e) console.warn('[GUARD] scan log failed:', e.message); });
    };

    if (error || !data) {
      logScan(null);
      return res.status(404).json({ error: 'Vehicle not found or not registered' });
    }
    logScan(data.code);

    const { count } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('sticker_code', data.code);

    res.json({
      vehicle: {
        code: data.code,
        plate: data.registration,
        color: data.color || 'Unknown',
        type: data.vehicle_type,
        resident: data.vehicle_name || 'Resident',
        parkingSlot: data.parking_slot || null,
        incidents: count || 0,
      },
    });
  });

  // GET /api/guard/stats — live counters + recent activity for Guard Mode
  router.get('/api/guard/stats', requireAuth, async (req, res) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Registered vehicles
    const { count: vehicles } = await supabase
      .from('stickers')
      .select('*', { count: 'exact', head: true })
      .not('owner_email', 'is', 'null')
      .neq('status', 'unclaimed');

    // Incidents today
    const { count: incidentsToday } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());

    // Open (unresolved) incidents
    const { count: openIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'resolved');

    // Recent activity (last 10 incidents with vehicle info)
    const { data: recent } = await supabase
      .from('incidents')
      .select('id, reason, status, created_at, sticker_code, stickers(registration, vehicle_name)')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      stats: {
        incidentsToday: incidentsToday || 0,
        vehicles: vehicles || 0,
        openIncidents: openIncidents || 0,
      },
      recent: (recent || []).map(r => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        created_at: r.created_at,
        plate: r.stickers?.registration || r.sticker_code,
      })),
    });
  });

  return { router };
};
