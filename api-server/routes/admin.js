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

  return { router };
};
