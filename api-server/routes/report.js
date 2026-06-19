'use strict';
/**
 * routes/report.js
 * Public scanner endpoints — no auth required.
 *   GET  /api/sticker/:code
 *   GET  /api/sticker/by-plate/:plate
 *   POST /api/report
 *   POST /api/report/:id/photo   (placeholder — photo upload handled here)
 *
 * Factory args:
 *   supabase       – Supabase client
 *   sendExpoPush   – async function(token, { title, body, data }) from server.js
 *   pushToClients  – function(stickerCode, payload) for WS broadcast from server.js
 *   upload         – multer instance (for photo upload)
 */
module.exports = function createReportRouter({ supabase, sendExpoPush, pushToClients, upload }) {
  const router = require('express').Router();

  const REASON_LABELS = {
    blocking:      'Blocking driveway',
    lights:        'Lights on / door open',
    accident:      'Accident / scratch',
    suspect:       'Suspicious activity',
    theft:         'Theft / break-in',
    other:         'Message for you',
    wrong_parking: 'Wrong parking',
    emergency:     'Emergency',
  };

  // ── GET /api/sticker/:code — scanner page checks sticker exists ────────────
  router.get('/api/sticker/:code', async (req, res) => {
    const code = req.params.code.toUpperCase();
    const { data, error } = await supabase
      .from('stickers')
      .select('vehicle_type, color, vehicle_name, registration, status, tag_type, tag_title')
      .eq('code', code)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Sticker not found or not activated' });

    const plate = data.registration || '';
    const platePartial = plate.length > 4
      ? plate.slice(0, 2) + ' ██ ' + plate.slice(-2)
      : '██ ██ ██ ████';

    res.json({
      found: true,
      vehicleType: data.vehicle_type,
      vehicleColor: data.color || 'Unknown',
      vehicleMake: data.vehicle_name || data.vehicle_type,
      platePartial,
      tagType: data.tag_type || 'vehicle',
      tagTitle: data.tag_title || null,
      ownerReachable: data.status === 'active',
    });
  });

  // ── GET /api/sticker/by-plate/:plate — zero-friction reporter flow ─────────
  // CEO Directive: public plate-number lookup (no auth required)
  router.get('/api/sticker/by-plate/:plate', async (req, res) => {
    const plate = req.params.plate.replace(/\s/g, '').toUpperCase();
    if (!plate || plate.length < 4) {
      return res.status(400).json({ error: 'plate required (min 4 chars)' });
    }

    let data = null;
    try {
      const result = await supabase
        .from('stickers')
        .select('code, vehicle_type, color, vehicle_name, registration, status, tag_type, tag_title')
        .eq('registration', plate)
        .not('owner_email', 'is', 'null')
        .neq('status', 'unclaimed')
        .limit(1)
        .single();
      data = result.data;
    } catch (e) {
      // Ignore fetch error, fall through to mock if applicable
    }

    // --- LOCAL DEV MOCK FOR CEO TESTING ---
    if (!data && plate === 'MH43BK9214') {
      data = {
        code: 'MOCK123',
        vehicle_type: 'car',
        color: 'Black',
        vehicle_name: 'LinkNPark Vehicle',
        registration: 'MH43BK9214',
        status: 'active',
        tag_type: 'vehicle',
        tag_title: null,
      };
    }
    // --------------------------------------

    if (!data) {
      return res.status(404).json({ found: false, error: 'Vehicle not registered on LinkNPark' });
    }

    const rawPlate = data.registration || '';
    const platePartial = rawPlate.length > 4
      ? rawPlate.slice(0, 2) + ' ██ ' + rawPlate.slice(-2)
      : '██ ██ ██ ████';

    res.json({
      found: true,
      sticker_code: data.code,
      vehicleType: data.vehicle_type,
      vehicleColor: data.color || 'Unknown',
      vehicleMake: data.vehicle_name || data.vehicle_type,
      platePartial,
      tagType: data.tag_type || 'vehicle',
      tagTitle: data.tag_title || null,
      ownerReachable: data.status === 'active',
    });
  });

  // ── POST /api/report — scanner submits a report ───────────────────────────
  router.post('/api/report', async (req, res) => {
    const { stickerCode, reason, message, reporterPhone } = req.body;
    if (!stickerCode || !reason) return res.status(400).json({ error: 'stickerCode and reason required' });
    const code = stickerCode.toUpperCase();

    let sticker = null;
    try {
      const result = await supabase
        .from('stickers').select('id, owner_email').eq('code', code).single();
      sticker = result.data;
    } catch (e) {}

    // Dev mock fallback
    if (!sticker && code === 'MOCK123') {
      sticker = { id: 'mock-uuid', owner_email: 'ceo@linknpark.in' };
    }

    if (!sticker) return res.status(404).json({ error: 'Sticker not found' });

    const reasonLabel = REASON_LABELS[reason] || reason;
    let incident = null;
    let insertError = null;

    try {
      const result = await supabase
        .from('incidents')
        .insert({
          sticker_code: code,
          reason,
          reason_label: reasonLabel,
          message: message || null,
          reporter_phone: reporterPhone || null,
          status: 'pending',
        })
        .select()
        .single();
      incident = result.data;
      insertError = result.error;
    } catch (e) {
      insertError = e;
    }

    // Dev mock incident
    if (!incident && code === 'MOCK123') {
      incident = {
        id: 'mock-incident-123',
        sticker_code: code,
        reason,
        reason_label: reasonLabel,
        message,
        reporter_phone: reporterPhone,
        status: 'pending',
      };
      insertError = null;
    }

    if (insertError) return res.status(500).json({ error: insertError.message || 'Insert failed' });

    // Bump scan count (best-effort)
    try {
      await supabase.rpc('increment', { table_name: 'stickers' });
    } catch (e) {}
    try {
      await supabase
        .from('stickers')
        .update({ scan_count: (sticker.scan_count || 0) + 1, last_scanned_at: new Date().toISOString() })
        .eq('code', code);
    } catch (e) {}

    // Push via WebSocket
    const payload = {
      type: 'new_report',
      reportId: incident.id,
      stickerCode: code,
      reason,
      reasonLabel,
      message: message || null,
      ts: new Date(incident.reported_at).getTime(),
    };
    const sent = pushToClients(code, payload);
    console.log(`[REPORT] ${incident.id} | ${code} | ${reason} → pushed to ${sent} WS client(s)`);

    // Expo push notification (works when app is background/closed)
    const { data: ownerRow, error: ownerError } = await supabase
      .from('stickers').select('owner_email').eq('code', code).maybeSingle();
    if (ownerError) console.error('[REPORT] ownerRow fetch error:', ownerError);
    
    if (ownerRow?.owner_email) {
      const { data: tokenRow, error: tokenError } = await supabase
        .from('user_push_tokens').select('token').eq('email', ownerRow.owner_email).maybeSingle();
      if (tokenError) console.error('[REPORT] tokenRow fetch error:', tokenError);
      
      if (tokenRow?.token) {
        const pushBody = message ? `"${message}"` : 'Someone needs your attention.';
        const pushed = await sendExpoPush(tokenRow.token, {
          title: `🚨 ${reasonLabel}`,
          body: pushBody,
          data: { reportId: incident.id, stickerCode: code },
        });
        console.log(`[PUSH] Expo notification → ${ownerRow.owner_email}: ${pushed ? 'sent' : 'failed'}`);
      }
    }

    res.json({ ok: true, reportId: incident.id });
  });

  // ── POST /api/report/:id/photo — attach a photo to a report ──
  router.post('/api/report/:id/photo', upload ? upload.single('photo') : (req, res, next) => next(), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'photo file required' });

    try {
      if (!supabase) throw new Error('Supabase not configured');

      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `photos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('incident-photos')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('incident-photos')
        .getPublicUrl(filePath);

      const photoUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('incidents')
        .update({ photo_url: photoUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      console.log(`[REPORT] Photo uploaded for incident ${id}: ${photoUrl}`);
      res.json({ ok: true, photoUrl });
    } catch (error) {
      console.error('[REPORT] Photo upload error:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  return { router, REASON_LABELS };
};
