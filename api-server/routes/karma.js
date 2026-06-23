'use strict';
/**
 * routes/karma.js
 * Karma balance and log for the logged-in user.
 *
 *   GET /api/karma          — { balance, log[] }
 */
module.exports = function createKarmaRouter({ supabase, requireAuth }) {
  const router = require('express').Router();

  router.get('/api/karma', requireAuth, async (req, res) => {
    if (!supabase) return res.json({ balance: 0, log: [] });

    const { data, error } = await supabase
      .from('karma_log')
      .select('id, points, reason, incident_id, created_at')
      .eq('user_email', req.user.email)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });

    const balance = (data || []).reduce((sum, row) => sum + row.points, 0);
    res.json({ balance, log: data || [] });
  });

  return { router };
};
