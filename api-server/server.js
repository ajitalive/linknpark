const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ============ CONFIG ============
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'linknpark-dev-secret-change-me';
const FROM_EMAIL = process.env.FROM_EMAIL || 'LinkNPark <onboarding@resend.dev>';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const OTP_TTL_MS = 5 * 60 * 1000;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;

if (!supabase) console.warn('[BOOT] Supabase not configured — DB calls will fail');

// ============ AUTH (Email OTP via Resend) ============
const otpStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore) if (v.expiresAt < now) otpStore.delete(k);
}, 60_000);

function generateOTP() { return String(crypto.randomInt(100000, 1000000)); }

function otpEmail(code) {
  return `
    <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#06090F;color:#fff;border-radius:16px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-block;background:#2CFF05;color:#000;font-weight:900;padding:10px 20px;border-radius:10px;font-size:18px">LinkNPark</div>
      </div>
      <h1 style="font-size:22px;margin:0 0 12px">Your verification code</h1>
      <p style="color:#8899AA;font-size:15px;line-height:22px;margin:0 0 24px">
        Enter this code in the LinkNPark app to sign in. Code expires in 5 minutes.
      </p>
      <div style="background:#0F1419;border:1px solid #1E2A35;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#2CFF05;font-family:'SF Mono',monospace">${code}</div>
      </div>
      <p style="color:#4A5568;font-size:12px;line-height:18px;margin:0">
        If you didn't request this, you can safely ignore this email. Someone may have typed your address by mistake.
      </p>
    </div>
  `;
}

app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const normalizedEmail = email.toLowerCase().trim();
  const code = generateOTP();
  otpStore.set(normalizedEmail, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

  console.log(`[OTP] Sent to ${normalizedEmail}: ${code}`);

  if (!resend) {
    return res.json({ ok: true, devCode: code, note: 'Resend not configured — using dev code' });
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: `${code} is your LinkNPark code`,
      html: otpEmail(code),
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[OTP] Resend error:', err.message);
    res.status(500).json({ error: 'Failed to send email', detail: err.message });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'email and code required' });
  const normalizedEmail = email.toLowerCase().trim();
  const entry = otpStore.get(normalizedEmail);

  if (!entry) return res.status(400).json({ error: 'No OTP requested — please send a new code' });
  if (entry.expiresAt < Date.now()) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'Code expired — please request a new one' });
  }
  if (entry.attempts >= 5) {
    otpStore.delete(normalizedEmail);
    return res.status(429).json({ error: 'Too many attempts — please request a new code' });
  }
  if (entry.code !== String(code).trim()) {
    entry.attempts++;
    return res.status(400).json({ error: 'Incorrect code', attemptsLeft: 5 - entry.attempts });
  }

  otpStore.delete(normalizedEmail);
  const token = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: '90d' });
  console.log(`[AUTH] ${normalizedEmail} verified`);
  res.json({ ok: true, token, user: { email: normalizedEmail } });
});

app.post('/api/auth/truecaller', async (req, res) => {
  const { authorizationCode, codeVerifier } = req.body;
  const clientId = process.env.TRUECALLER_CLIENT_ID || 'ut7yqtyuuc6dwiyfjk1u_4hnlhuspwbhr-4qr0sp0pe';

  if (!authorizationCode || !codeVerifier) {
    return res.status(400).json({ error: 'Missing authorizationCode or codeVerifier' });
  }

  try {
    // 1. Exchange for access token
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('client_id', clientId);
    tokenParams.append('code', authorizationCode);
    tokenParams.append('code_verifier', codeVerifier);

    const tokenRes = await fetch('https://oauth-account-noneu.truecaller.com/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error || tokenRes.statusText}`);
    }

    // 2. Get user info
    const profileRes = await fetch('https://oauth-account-noneu.truecaller.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await profileRes.json();
    if (!profileRes.ok) {
      throw new Error(`Profile fetch failed: ${profileData.error_description || profileData.error || profileRes.statusText}`);
    }

    // Use phone_number as the identity
    const normalizedIdentity = String(profileData.phone_number).trim();

    if (!normalizedIdentity) {
      return res.status(400).json({ error: 'Truecaller profile did not return a phone number' });
    }

    // 3. Issue our JWT (we inject the phone number into the 'email' field for Option A mapping)
    const token = jwt.sign({ email: normalizedIdentity, name: profileData.name }, JWT_SECRET, { expiresIn: '90d' });
    console.log(`[AUTH] Truecaller login verified for ${normalizedIdentity}`);
    
    res.json({ ok: true, token, user: { email: normalizedIdentity, name: profileData.name } });

  } catch (err) {
    console.error('[AUTH] Truecaller Error:', err.message);
    res.status(500).json({ error: 'Truecaller authentication failed', detail: err.message });
  }
});

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/update', requireAuth, (req, res) => {
  const { name } = req.body;
  const updatedUser = { ...req.user, name };
  // Remove JWT standard claims before signing a new token
  delete updatedUser.iat;
  delete updatedUser.exp;
  
  const token = jwt.sign(updatedUser, JWT_SECRET, { expiresIn: '90d' });
  res.json({ ok: true, token, user: updatedUser });
});

// ============ STICKERS (authenticated) ============
app.get('/api/stickers', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('stickers')
    .select('*')
    .eq('owner_email', req.user.email)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ stickers: data });
});

app.post('/api/stickers', requireAuth, async (req, res) => {
  const { code, vehicle_type, vehicle_name, registration, color, backup_phone } = req.body;
  if (!code || !vehicle_type || !registration) {
    return res.status(400).json({ error: 'code, vehicle_type, registration required' });
  }
  const { data, error } = await supabase.from('stickers').insert({
    owner_email: req.user.email,
    code: code.toUpperCase(),
    vehicle_type,
    vehicle_name: vehicle_name || null,
    registration: registration.toUpperCase(),
    color: color || null,
    backup_phone: backup_phone || null,
  }).select().single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Sticker code already registered' });
    return res.status(500).json({ error: error.message });
  }
  console.log(`[STICKER] ${req.user.email} activated ${code}`);
  res.json({ sticker: data });
});

app.patch('/api/stickers/:id', requireAuth, async (req, res) => {
  const updates = {};
  ['vehicle_name', 'registration', 'color', 'status', 'backup_phone'].forEach(k => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });
  const { data, error } = await supabase
    .from('stickers')
    .update(updates)
    .eq('id', req.params.id)
    .eq('owner_email', req.user.email)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Sticker not found' });
  res.json({ sticker: data });
});

app.delete('/api/stickers/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('stickers')
    .delete()
    .eq('id', req.params.id)
    .eq('owner_email', req.user.email);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ============ INCIDENTS (authenticated) ============
app.get('/api/incidents', requireAuth, async (req, res) => {
  const { data: stickers } = await supabase
    .from('stickers').select('code').eq('owner_email', req.user.email);
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

app.patch('/api/incidents/:id', requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!['open', 'resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const { data: existing } = await supabase
    .from('incidents')
    .select('id, sticker_code, stickers!inner(owner_email)')
    .eq('id', req.params.id)
    .single();
  if (!existing || existing.stickers.owner_email !== req.user.email) {
    return res.status(404).json({ error: 'not found' });
  }
  const update = { status };
  if (status === 'resolved' || status === 'dismissed') update.resolved_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('incidents').update(update).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ incident: data });
});

// ============ EXPO PUSH NOTIFICATIONS ============
async function sendExpoPush(token, { title, body, data = {} }) {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default', priority: 'high', channelId: 'incidents' }),
    });
    const json = await res.json();
    if (json.data?.status === 'error') console.warn('[PUSH] Expo error:', json.data.message);
    return json.data?.status === 'ok';
  } catch (e) {
    console.error('[PUSH] Send failed:', e.message);
    return false;
  }
}

// ============ REAL-TIME PUSH (WebSocket) ============
const stickerClients = {};

const REASON_LABELS = {
  blocking: 'Blocking driveway',
  lights:   'Lights on / door open',
  accident: 'Accident / scratch',
  suspect:  'Suspicious activity',
  theft:    'Theft / break-in',
  other:    'Message for you',
  wrong_parking: 'Wrong parking',
  emergency: 'Emergency',
};

wss.on('connection', (ws) => {
  let subscribedCode = null;
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'subscribe' && msg.stickerCode) {
        subscribedCode = msg.stickerCode;
        if (!stickerClients[subscribedCode]) stickerClients[subscribedCode] = new Set();
        stickerClients[subscribedCode].add(ws);
        console.log(`[WS] Subscribed to ${subscribedCode} (total: ${stickerClients[subscribedCode].size})`);
        ws.send(JSON.stringify({ type: 'subscribed', stickerCode: subscribedCode }));
      }
    } catch {}
  });
  ws.on('close', () => {
    if (subscribedCode && stickerClients[subscribedCode]) {
      stickerClients[subscribedCode].delete(ws);
    }
  });
});

function pushToClients(stickerCode, payload) {
  const clients = stickerClients[stickerCode];
  if (!clients || clients.size === 0) return 0;
  const msg = JSON.stringify(payload);
  let sent = 0;
  clients.forEach(ws => { if (ws.readyState === 1) { ws.send(msg); sent++; } });
  return sent;
}

// ============ PUBLIC SCANNER ENDPOINTS (no auth) ============
// GET /api/sticker/:code — scanner page checks sticker exists
app.get('/api/sticker/:code', async (req, res) => {
  const code = req.params.code.toUpperCase();
  const { data } = await supabase
    .from('stickers').select('*').eq('code', code).single();
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
    ownerReachable: data.status === 'active',
  });
});

// POST /api/report — scanner submits a report
app.post('/api/report', async (req, res) => {
  const { stickerCode, reason, message, reporterPhone } = req.body;
  if (!stickerCode || !reason) return res.status(400).json({ error: 'stickerCode and reason required' });
  const code = stickerCode.toUpperCase();

  // Verify sticker exists
  const { data: sticker } = await supabase
    .from('stickers').select('code').eq('code', code).single();
  if (!sticker) return res.status(404).json({ error: 'Sticker not found' });

  const reasonLabel = REASON_LABELS[reason] || reason;
  const { data: incident, error } = await supabase
    .from('incidents').insert({
      sticker_code: code, reason, reason_label: reasonLabel,
      message: message || null, reporter_phone: reporterPhone || null,
    }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Bump scan count
  await supabase.rpc('increment', { table_name: 'stickers' }).catch(() => {});
  await supabase
    .from('stickers')
    .update({ scan_count: (sticker.scan_count || 0) + 1, last_scanned_at: new Date().toISOString() })
    .eq('code', code);

  // Push via WebSocket
  const payload = {
    type: 'new_report',
    reportId: incident.id,
    stickerCode: code,
    reason, reasonLabel,
    message: message || null,
    ts: new Date(incident.reported_at).getTime(),
  };
  const sent = pushToClients(code, payload);
  console.log(`[REPORT] ${incident.id} | ${code} | ${reason} → pushed to ${sent} WS client(s)`);

  // Send Expo push notification (works when app is closed/background)
  const { data: ownerRow } = await supabase
    .from('stickers').select('owner_email').eq('code', code).single();
  if (ownerRow?.owner_email) {
    const { data: tokenRow } = await supabase
      .from('user_push_tokens').select('token').eq('email', ownerRow.owner_email).single();
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

// POST /api/push-token — store Expo push token for authenticated user
app.post('/api/push-token', requireAuth, async (req, res) => {
  const { token } = req.body;
  if (!token || !token.startsWith('ExponentPushToken[')) {
    return res.status(400).json({ error: 'Valid Expo push token required' });
  }
  const { error } = await supabase
    .from('user_push_tokens')
    .upsert({ email: req.user.email, token, updated_at: new Date().toISOString() }, { onConflict: 'email' });
  if (error) return res.status(500).json({ error: error.message });
  console.log(`[PUSH] Token stored for ${req.user.email}`);
  res.json({ ok: true });
});

// Legacy endpoint kept for the prototype app currently in production
app.post('/api/register-token', async (req, res) => {
  res.json({ ok: true });
});

// ============ GUARDIAN NETWORK (MVP In-Memory) ============
const MOCK_ZONES = [
  { id: '1', name: 'Sector 7 Residents', zone: 'Koramangala, Bengaluru' },
  { id: '2', name: 'Tech Park Commuters', zone: 'Electronic City, Bengaluru' },
];
const guardianMemberships = new Set(); // Stores "email:zoneId"

app.get('/api/guardians/zones', requireAuth, (req, res) => {
  const email = req.user.email;
  const zones = MOCK_ZONES.map(z => ({
    ...z,
    active: guardianMemberships.has(`${email}:${z.id}`)
  }));
  res.json({ zones });
});

app.post('/api/guardians/join', requireAuth, (req, res) => {
  const { zoneId, active } = req.body;
  const email = req.user.email;
  const key = `${email}:${zoneId}`;
  if (active) guardianMemberships.add(key);
  else guardianMemberships.delete(key);
  res.json({ ok: true, active });
});

app.post('/api/guardians/zones', requireAuth, (req, res) => {
  const { name, zone } = req.body;
  if (!name || !zone) {
    return res.status(400).json({ error: 'Name and zone area are required' });
  }
  const newZone = {
    id: String(MOCK_ZONES.length + 1),
    name: name.trim(),
    zone: zone.trim(),
  };
  MOCK_ZONES.push(newZone);
  
  // Auto-join the creator
  const email = req.user.email;
  guardianMemberships.add(`${email}:${newZone.id}`);
  
  res.json({ ok: true, zone: { ...newZone, active: true } });
});

// ============ IN-APP MESSAGING (MVP In-Memory) ============
const chatRooms = {}; // incidentId -> Array of { sender, text, ts }

app.get('/api/chat/:incidentId', (req, res) => {
  const msgs = chatRooms[req.params.incidentId] || [];
  res.json({ messages: msgs });
});

app.post('/api/chat/:incidentId', async (req, res) => {
  const { sender, text } = req.body;
  const incidentId = req.params.incidentId;
  
  if (!chatRooms[incidentId]) chatRooms[incidentId] = [];
  chatRooms[incidentId].push({ sender, text, ts: Date.now() });

  // If scanner sends a message, notify the owner
  if (sender === 'scanner') {
    const { data: incident } = await supabase.from('incidents').select('sticker_code').eq('id', incidentId).single();
    if (incident) {
      const code = incident.sticker_code;
      const { data: ownerRow } = await supabase.from('stickers').select('owner_email').eq('code', code).single();
      if (ownerRow?.owner_email) {
        const { data: tokenRow } = await supabase.from('user_push_tokens').select('token').eq('email', ownerRow.owner_email).single();
        if (tokenRow?.token) {
          await sendExpoPush(tokenRow.token, {
            title: '💬 New Message',
            body: text,
            data: { reportId: incidentId, stickerCode: code },
          });
        }
      }
    }
  }
  
  res.json({ ok: true });
});

// ============ HEALTH ============
app.get('/health', (req, res) => res.json({ status: 'ok', supabase: !!supabase, resend: !!resend }));

// Root: redirect any sticker scan that hit the API server by mistake
app.get('/', (req, res) => {
  const code = req.query.code;
  if (code) return res.redirect(`https://scan.linknpark.in?code=${encodeURIComponent(code)}`);
  res.redirect('https://linknpark.in');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nLinkNPark API server → http://0.0.0.0:${PORT}`);
  console.log(`Supabase: ${supabase ? 'connected' : 'NOT configured'}`);
  console.log(`Resend:   ${resend ? 'configured' : 'NOT configured'}\n`);
});
