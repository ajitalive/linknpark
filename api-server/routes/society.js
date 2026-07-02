'use strict';
/**
 * routes/society.js — Society parking management (office dashboard API).
 *
 *   GET /api/society/overview   (x-society-key)  stats + recent guard scans
 *
 * Gated by SOCIETY_KEY (env) — a separate credential from the business
 * admin key, so a society office sees guard activity only, never the
 * business admin data.
 */
module.exports = function createSocietyRouter({ supabase }) {
  const router = require('express').Router();
  const SOCIETY_KEY = process.env.SOCIETY_KEY || '';

  function requireSocietyKey(req, res, next) {
    const key = req.headers['x-society-key'] || req.query.society_key;
    if (!SOCIETY_KEY) return res.status(503).json({ error: 'Society dashboard is not configured (SOCIETY_KEY missing).' });
    if (!key || key !== SOCIETY_KEY) return res.status(403).json({ error: 'Invalid society key' });
    next();
  }

  router.get('/api/society/overview', requireSocietyKey, async (req, res) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const sod = startOfDay.toISOString();

      const countScans = (build) => {
        const q = build(supabase.from('guard_scans').select('*', { count: 'exact', head: true }));
        return q.then(({ count, error }) => (error ? 0 : count || 0));
      };
      const countIncidents = (build) => {
        const q = build(supabase.from('incidents').select('*', { count: 'exact', head: true }));
        return q.then(({ count, error }) => (error ? 0 : count || 0));
      };

      const [scansToday, scansTotal, notFoundToday, incidentsToday, openIncidents, { data: recent }] = await Promise.all([
        countScans(q => q.gte('created_at', sod)),
        countScans(q => q),
        countScans(q => q.gte('created_at', sod).eq('found', false)),
        countIncidents(q => q.gte('reported_at', sod)),
        countIncidents(q => q.eq('status', 'open')),
        supabase.from('guard_scans')
          .select('guard_email, query, matched_code, found, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      // Guards active today (distinct emails among today's scans)
      const { data: todayRows } = await supabase
        .from('guard_scans').select('guard_email').gte('created_at', sod);
      const guardsToday = new Set((todayRows || []).map(r => r.guard_email)).size;

      res.json({
        stats: { scansToday, scansTotal, notFoundToday, guardsToday, incidentsToday, openIncidents },
        scans: recent || [],
      });
    } catch (e) {
      console.error('[SOCIETY] overview failed:', e);
      res.status(500).json({ error: e.message || 'overview failed' });
    }
  });

  return { router };
};
