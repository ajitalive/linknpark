'use strict';
/**
 * routes/admin.js
 * Admin-only routes: sticker management, bulk operations, debug.
 *
 * Factory args:
 *   supabase           – Supabase client
 *   ADMIN_KEY_RESOLVED – resolved admin API key
 *   resend             – Resend client (for debug endpoint)
 */
module.exports = function createAdminRouter({ supabase, ADMIN_KEY_RESOLVED, resend }) {
  const router = require('express').Router();

  // ── Admin auth middleware ──────────────────────────────────────────────────
  function requireAdmin(req, res, next) {
    const key = req.headers['x-admin-key'] || req.query.admin_key;
    if (!key || key !== ADMIN_KEY_RESOLVED) {
      return res.status(403).json({ error: 'Invalid admin key' });
    }
    next();
  }

  // ── GET /api/admin/stickers — lookup / list stickers ─────────────────────
  // ?code=STK-2025-AA0001   – single sticker by code
  // ?prefix=STK-2025-AA     – list by prefix
  // ?status=active          – filter by status
  router.get('/api/admin/stickers', requireAdmin, async (req, res) => {
    const { code, prefix, status, limit } = req.query;
    let query = supabase.from('stickers').select('*');

    if (code) {
      query = query.eq('code', String(code).toUpperCase());
    } else if (prefix) {
      const p = String(prefix).toUpperCase();
      query = query.gte('code', p).lt('code', p + '\uffff');
    }
    if (status) query = query.eq('status', status);
    query = query.order('code', { ascending: true }).limit(parseInt(limit) || 100);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ stickers: data || [], count: (data || []).length });
  });

  // ── PATCH /api/admin/stickers/:code — update a single sticker by code ─────
  router.patch('/api/admin/stickers/:code', requireAdmin, async (req, res) => {
    const code = req.params.code.toUpperCase();
    const updates = {};
    ['status', 'vehicle_name', 'registration', 'color', 'backup_phone'].forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const { data, error } = await supabase
      .from('stickers').update(updates).eq('code', code).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Sticker not found' });
    console.log(`[ADMIN] Updated ${code}: ${JSON.stringify(updates)}`);
    res.json({ sticker: data });
  });

  // ── POST /api/admin/stickers/bulk-status ─────────────────────────────────
  // Body: { codes?, prefix?, from_code?, to_code?, status }
  router.post('/api/admin/stickers/bulk-status', requireAdmin, async (req, res) => {
    const { codes, prefix, from_code, to_code, status } = req.body;
    if (!status || !['active', 'paused', 'inactive', 'lost'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required: active, paused, inactive, lost' });
    }

    let targetCodes = [];

    if (codes && Array.isArray(codes)) {
      targetCodes = codes.map(c => String(c).toUpperCase());
    } else if (from_code && to_code) {
      const from = String(from_code).toUpperCase();
      const to = String(to_code).toUpperCase();
      const { data } = await supabase
        .from('stickers').select('code').gte('code', from).lte('code', to).order('code');
      targetCodes = (data || []).map(s => s.code);
    } else if (prefix) {
      const p = String(prefix).toUpperCase();
      const { data } = await supabase
        .from('stickers').select('code').gte('code', p).lt('code', p + '\uffff').order('code');
      targetCodes = (data || []).map(s => s.code);
    } else {
      return res.status(400).json({ error: 'Provide codes[], prefix, or from_code+to_code' });
    }

    if (targetCodes.length === 0) {
      return res.json({ updated: 0, codes: [] });
    }

    const { error } = await supabase.from('stickers').update({ status }).in('code', targetCodes);
    if (error) return res.status(500).json({ error: error.message });

    console.log(`[ADMIN] Bulk ${status}: ${targetCodes.length} sticker(s)`);
    res.json({ updated: targetCodes.length, codes: targetCodes, status });
  });

  // ── POST /api/admin/stickers/pre-register — batch pre-register codes ──────
  router.post('/api/admin/stickers/pre-register', requireAdmin, async (req, res) => {
    const { codes } = req.body;
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'Array of codes required' });
    }

    const rows = codes.map(c => ({
      code: String(c).toUpperCase(),
      status: 'unclaimed',
      owner_email: 'unclaimed@linknpark.in',
      vehicle_type: 'pending',
      registration: 'PENDING',
    }));

    const { data, error } = await supabase
      .from('stickers')
      .upsert(rows, { onConflict: 'code', ignoreDuplicates: true })
      .select('code');

    if (error) return res.status(500).json({ error: error.message });

    console.log(`[ADMIN] Pre-registered ${data.length} new code(s) out of ${codes.length}`);
    res.json({ ok: true, registered: data.length, total_submitted: codes.length });
  });

  // ── GET /api/admin/debug-db — verify DB connectivity (dev only) ───────────
  router.get('/api/admin/debug-db', requireAdmin, async (req, res) => {
    try {
      const { data: zData, error: zErr } = await supabase.from('zones').select('id').limit(1);
      const { data: zmData, error: zmErr } = await supabase.from('zone_members').select('zone_id').limit(1);
      const { data: sData, error: sErr } = await supabase.from('stickers').select('id').limit(1);

      res.json({
        status: 'ok',
        supabase_configured: !!supabase,
        resend_configured: !!resend,
        zones_ok: !zErr,
        zones_error: zErr ? zErr.message : null,
        zone_members_ok: !zmErr,
        zone_members_error: zmErr ? zmErr.message : null,
        stickers_ok: !sErr,
        stickers_error: sErr ? sErr.message : null,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── GET /api/admin/stats — business dashboard aggregates ──────────────────
  router.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const count = async (build) => {
        const { count, error } = await build(
          supabase.from('stickers').select('*', { count: 'exact', head: true })
        );
        if (error) throw error;
        return count || 0;
      };
      const countOn = async (table, build) => {
        const q = build ? build(supabase.from(table).select('*', { count: 'exact', head: true }))
                        : supabase.from(table).select('*', { count: 'exact', head: true });
        const { count, error } = await q;
        if (error) return 0; // table may not exist
        return count || 0;
      };

      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [
        totalStickers, unclaimed, active, paused, lost,
        etagTotal, etagActive, claimed,
        incidentsTotal, incidentsOpen, incidentsToday,
        zonesTotal, zoneMembers, karmaRows, usersTotal,
      ] = await Promise.all([
        count(q => q),
        count(q => q.eq('status', 'unclaimed')),
        count(q => q.eq('status', 'active')),
        count(q => q.eq('status', 'paused')),
        count(q => q.eq('status', 'lost')),
        count(q => q.like('code', 'ETAG-%')),
        count(q => q.like('code', 'ETAG-%').eq('status', 'active')),
        count(q => q.neq('status', 'unclaimed').not('owner_email', 'is', null)),
        countOn('incidents'),
        countOn('incidents', q => q.neq('status', 'resolved')),
        countOn('incidents', q => q.gte('created_at', startOfDay.toISOString())),
        countOn('zones'),
        countOn('zone_members'),
        countOn('karma_log'),
        countOn('users'),
      ]);

      // Physical QR stickers = everything that isn't an eTag
      const qrTotal = totalStickers - etagTotal;
      const qrActive = active - etagActive;

      // Recent activity
      const { data: recentStickers } = await supabase
        .from('stickers')
        .select('code, registration, vehicle_type, tag_type, status, owner_email, parking_slot, created_at')
        .neq('status', 'unclaimed')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: recentIncidents } = await supabase
        .from('incidents')
        .select('id, reason, status, created_at, sticker_code')
        .order('created_at', { ascending: false })
        .limit(10);

      // New activations in last 7 days
      const newThisWeek = await count(q => q.neq('status', 'unclaimed').gte('created_at', weekAgo));

      res.json({
        generated_at: new Date().toISOString(),
        stickers: {
          total: totalStickers,
          unclaimed,
          claimed,
          active, paused, lost,
          new_this_week: newThisWeek,
        },
        by_type: {
          qr_total: qrTotal,
          qr_active: qrActive,
          etag_total: etagTotal,
          etag_active: etagActive,
        },
        incidents: {
          total: incidentsTotal,
          open: incidentsOpen,
          today: incidentsToday,
        },
        community: {
          zones: zonesTotal,
          zone_members: zoneMembers,
          karma_events: karmaRows,
          users: usersTotal,
        },
        recent_activations: recentStickers || [],
        recent_incidents: recentIncidents || [],
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return { router };
};
