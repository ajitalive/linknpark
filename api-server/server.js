const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { Resend } = require('resend');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ============ AUTH (Email OTP via Resend) ============
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'linknpark-dev-secret-change-me';
const FROM_EMAIL = process.env.FROM_EMAIL || 'LinkNPark <onboarding@resend.dev>';
const OTP_TTL_MS = 5 * 60 * 1000;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const otpStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore) if (v.expiresAt < now) otpStore.delete(k);
}, 60_000);

function generateOTP() {
  return String(crypto.randomInt(100000, 1000000));
}

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

// stickerCode → Set of connected WebSocket clients
const stickerClients = {};
// stickerCode → latest report (for polling fallback)
const latestReportBySticker = {};
// stickerCode → vehicle info
const stickerRegistry = {};

const REASON_LABELS = {
  blocking: 'Blocking driveway',
  lights:   'Lights on / door open',
  accident: 'Accident / scratch',
  suspect:  'Suspicious activity',
  theft:    'Theft / break-in',
  other:    'Message for you',
};

// WebSocket connection: client sends { type:'subscribe', stickerCode }
wss.on('connection', (ws) => {
  let subscribedCode = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'subscribe' && msg.stickerCode) {
        subscribedCode = msg.stickerCode;
        if (!stickerClients[subscribedCode]) stickerClients[subscribedCode] = new Set();
        stickerClients[subscribedCode].add(ws);
        console.log(`[WS] Client subscribed to ${subscribedCode} (total: ${stickerClients[subscribedCode].size})`);
        ws.send(JSON.stringify({ type: 'subscribed', stickerCode: subscribedCode }));
      }
    } catch {}
  });

  ws.on('close', () => {
    if (subscribedCode && stickerClients[subscribedCode]) {
      stickerClients[subscribedCode].delete(ws);
      console.log(`[WS] Client disconnected from ${subscribedCode}`);
    }
  });
});

function pushToClients(stickerCode, payload) {
  const clients = stickerClients[stickerCode];
  if (!clients || clients.size === 0) return 0;
  const msg = JSON.stringify(payload);
  let sent = 0;
  clients.forEach(ws => {
    if (ws.readyState === 1) { ws.send(msg); sent++; }
  });
  return sent;
}

// POST /api/register — stores vehicle info (no push token needed anymore)
app.post('/api/register-token', (req, res) => {
  const { stickerCode, vehicleInfo } = req.body;
  if (!stickerCode) return res.status(400).json({ error: 'stickerCode required' });
  stickerRegistry[stickerCode] = { vehicleInfo: vehicleInfo || {} };
  console.log(`[REGISTER] ${stickerCode}`);
  res.json({ ok: true });
});

// GET /api/sticker/:code — scanner page verifies sticker
app.get('/api/sticker/:code', (req, res) => {
  const entry = stickerRegistry[req.params.code];
  if (!entry) return res.status(404).json({ error: 'Sticker not found or not activated' });
  res.json({
    found: true,
    vehicleType: entry.vehicleInfo.type || 'car',
    vehicleColor: entry.vehicleInfo.color || 'Silver',
    vehicleMake: entry.vehicleInfo.make || 'Honda City',
    platePartial: entry.vehicleInfo.platePartial || 'MH 12 ██ ████',
    ownerReachable: true,
  });
});

// POST /api/report — scanner submits a report
app.post('/api/report', (req, res) => {
  const { stickerCode, reason, message, reporterPhone } = req.body;
  if (!stickerCode || !reason) return res.status(400).json({ error: 'stickerCode and reason required' });

  const reportId = `INC-${Date.now()}`;
  const payload = {
    type: 'new_report',
    reportId,
    stickerCode,
    reason,
    reasonLabel: REASON_LABELS[reason] || reason,
    message: message || null,
    reporterPhone: reporterPhone || null,
    ts: Date.now(),
  };

  console.log(`[REPORT] ${reportId} | ${stickerCode} | ${reason} | "${message || ''}"`);

  // Store for polling fallback
  latestReportBySticker[stickerCode] = payload;

  // Push via WebSocket to any connected app instances
  const sent = pushToClients(stickerCode, payload);
  console.log(`[WS] Pushed to ${sent} connected client(s)`);

  res.json({ ok: true, reportId });
});

// GET /api/latest-report — polling fallback if WebSocket unavailable
app.get('/api/latest-report', (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: 'code required' });
  res.json(latestReportBySticker[code] || {});
});

// GET /api/debug
app.get('/api/debug', (req, res) => {
  res.json({
    registered: Object.keys(stickerRegistry),
    connectedClients: Object.fromEntries(
      Object.entries(stickerClients).map(([k, v]) => [k, v.size])
    ),
    latestReports: Object.keys(latestReportBySticker),
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nLinkNPark API server  →  http://0.0.0.0:${PORT}`);
  console.log(`WebSocket             →  ws://0.0.0.0:${PORT}`);
  console.log(`Scanner reports to   →  http://<LOCAL_IP>:${PORT}/api/report\n`);
});
