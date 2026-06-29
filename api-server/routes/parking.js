'use strict';
const { isR2Configured, uploadToR2 } = require('../r2');
/**
 * routes/parking.js
 * Community-verified parking spots.
 *   POST  /api/parking/spots              (QR user) submit a spot -> pending
 *   POST  /api/parking/spots/:id/photo    (QR user) attach photo (R2)
 *   GET   /api/parking/nearby?lat&lng     (auth)    verified spots near a point
 *   GET   /api/parking/spots/:id          (auth)    spot detail
 *   POST  /api/parking/spots/:id/vote     (QR user, GPS-gated) upvote
 *   GET   /api/admin/parking/pending      (admin)   submissions to review
 *   POST  /api/admin/parking/:id/review   (admin)   approve / reject
 *
 * Factory: { supabase, requireAuth, upload, ADMIN_KEY_RESOLVED }
 */
const COMMUNITY_THRESHOLD = 5;   // distinct upvotes after admin-verify -> community_verified
const VOTE_RADIUS_KM = 0.25;     // must be within 250 m of the spot to vote
const SEARCH_RADIUS_KM = 5;      // nearby search radius

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = function createParkingRouter({ supabase, requireAuth, upload, ADMIN_KEY_RESOLVED }) {
  const router = require('express').Router();

  function requireAdmin(req, res, next) {
    const key = req.headers['x-admin-key'] || req.query.admin_key;
    if (!key || key !== ADMIN_KEY_RESOLVED) return res.status(403).json({ error: 'Invalid admin key' });
    next();
  }

  // Gate: only users who own an active LinkNPark sticker (QR users)
  async function requireQrUser(req, res, next) {
    try {
      const { count, error } = await supabase
        .from('stickers')
        .select('*', { count: 'exact', head: true })
        .eq('owner_email', req.user.email)
        .neq('status', 'unclaimed');
      if (error) throw error;
      if (!count) {
        return res.status(403).json({ error: 'This feature is for LinkNPark sticker owners. Activate a sticker to contribute.' });
      }
      next();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  async function creditKarma(email, points, reason) {
    try { await supabase.from('karma_log').insert({ user_email: email, points, reason, incident_id: null }); }
    catch (e) { console.warn('[PARKING] karma credit failed:', e.message); }
  }

  // ── Submit a spot ─────────────────────────────────────────────────────────
  router.post('/api/parking/spots', requireAuth, requireQrUser, async (req, res) => {
    const { poi_name, label, lat, lng, type, vehicle_types } = req.body;
    if (!poi_name || !poi_name.trim()) return res.status(400).json({ error: 'poi_name is required' });
    const la = parseFloat(lat), ln = parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(ln)) return res.status(400).json({ error: 'lat and lng are required' });

    const { data, error } = await supabase.from('parking_spots').insert({
      poi_name: poi_name.trim(),
      label: label ? String(label).trim() : null,
      lat: la, lng: ln,
      type: ['free', 'paid', 'street', 'lot', 'other'].includes(type) ? type : 'free',
      vehicle_types: vehicle_types || 'car,bike',
      submitted_by: req.user.email,
      status: 'pending',
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, spot: data });
  });

  // ── Attach photo to a spot (R2, best-effort) ──────────────────────────────
  router.post('/api/parking/spots/:id/photo',
    requireAuth, requireQrUser,
    upload ? upload.single('photo') : (req, res, next) => next(),
    async (req, res) => {
      if (!req.file) return res.status(400).json({ error: 'photo file required' });
      const { id } = req.params;
      try {
        const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
        const key = `parking/${id}-${Date.now()}.${ext}`;
        let photoUrl;
        if (isR2Configured()) {
          photoUrl = await uploadToR2(key, req.file.buffer, req.file.mimetype);
        } else {
          const { error } = await supabase.storage.from('incident-photos').upload(key, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
          if (error) throw error;
          photoUrl = supabase.storage.from('incident-photos').getPublicUrl(key).data.publicUrl;
        }
        const { error: upErr } = await supabase.from('parking_spots').update({ photo_url: photoUrl }).eq('id', id);
        if (upErr) throw upErr;
        res.json({ ok: true, photoUrl });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

  // ── Nearby verified spots ─────────────────────────────────────────────────
  router.get('/api/parking/nearby', requireAuth, async (req, res) => {
    const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });

    const { data, error } = await supabase
      .from('parking_spots')
      .select('*')
      .in('status', ['verified', 'community_verified']);
    if (error) return res.status(500).json({ error: error.message });

    // which of these has the user already upvoted
    const { data: myVotes } = await supabase
      .from('parking_votes').select('spot_id').eq('user_email', req.user.email);
    const voted = new Set((myVotes || []).map(v => v.spot_id));

    const spots = (data || [])
      .map(s => ({
        id: s.id, poi_name: s.poi_name, label: s.label, type: s.type,
        vehicle_types: s.vehicle_types, photo_url: s.photo_url,
        lat: s.lat, lng: s.lng, upvotes: s.upvotes, status: s.status,
        distance_km: Math.round(distanceKm(lat, lng, s.lat, s.lng) * 10) / 10,
        you_voted: voted.has(s.id),
      }))
      .filter(s => s.distance_km <= SEARCH_RADIUS_KM)
      .sort((a, b) => a.distance_km - b.distance_km);

    res.json({ spots });
  });

  // ── Spot detail ───────────────────────────────────────────────────────────
  router.get('/api/parking/spots/:id', requireAuth, async (req, res) => {
    const { data, error } = await supabase.from('parking_spots').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Spot not found' });
    res.json({ spot: data });
  });

  // ── Vote (GPS-gated) ──────────────────────────────────────────────────────
  router.post('/api/parking/spots/:id/vote', requireAuth, requireQrUser, async (req, res) => {
    const { id } = req.params;
    const lat = parseFloat(req.body.lat), lng = parseFloat(req.body.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'Your location is required to verify a spot.' });
    }
    const { data: spot, error: sErr } = await supabase.from('parking_spots').select('*').eq('id', id).single();
    if (sErr || !spot) return res.status(404).json({ error: 'Spot not found' });

    const dist = distanceKm(lat, lng, spot.lat, spot.lng);
    if (dist > VOTE_RADIUS_KM) {
      return res.status(403).json({ error: `You must be at the spot to verify it (you are ${Math.round(dist * 1000)} m away).` });
    }

    const { error: vErr } = await supabase.from('parking_votes')
      .insert({ spot_id: id, user_email: req.user.email, lat, lng });
    if (vErr) {
      if (vErr.code === '23505') return res.status(409).json({ error: 'You already verified this spot.' });
      return res.status(500).json({ error: vErr.message });
    }

    // recount + maybe promote to community_verified
    const { count } = await supabase.from('parking_votes').select('*', { count: 'exact', head: true }).eq('spot_id', id);
    const upvotes = count || 0;
    const updates = { upvotes };
    if (spot.status === 'verified' && upvotes >= COMMUNITY_THRESHOLD) updates.status = 'community_verified';
    await supabase.from('parking_spots').update(updates).eq('id', id);

    creditKarma(req.user.email, 5, 'parking_vote');
    res.json({ ok: true, upvotes, status: updates.status || spot.status });
  });

  // ── Admin: pending submissions ────────────────────────────────────────────
  router.get('/api/admin/parking/pending', requireAdmin, async (req, res) => {
    const { data, error } = await supabase
      .from('parking_spots').select('*').eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ spots: data || [] });
  });

  // ── Admin: approve / reject ───────────────────────────────────────────────
  router.post('/api/admin/parking/:id/review', requireAdmin, async (req, res) => {
    const { action } = req.body; // 'approve' | 'reject'
    const { id } = req.params;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: "action must be 'approve' or 'reject'" });

    const status = action === 'approve' ? 'verified' : 'rejected';
    const { data, error } = await supabase.from('parking_spots')
      .update({ status, verified_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Spot not found' });

    if (action === 'approve') creditKarma(data.submitted_by, 30, 'parking_submission');
    res.json({ ok: true, spot: data });
  });

  return { router };
};
