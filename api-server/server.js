'use strict';
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// ============ CONFIG ============
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'LinkNPark <onboarding@resend.dev>';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const OTP_TTL_MS = 5 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============ STARTUP GUARDS ============
// These variables MUST be set via environment variables in production.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (IS_PRODUCTION) {
    console.error('[BOOT] FATAL: JWT_SECRET environment variable is not set. Refusing to start in production.');
    process.exit(1);
  } else {
    console.warn('[BOOT] WARNING: JWT_SECRET not set. Using insecure development fallback. DO NOT use in production.');
  }
}
const JWT_SECRET_RESOLVED = JWT_SECRET || 'linknpark-dev-secret-DO-NOT-USE-IN-PRODUCTION';

const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
  if (IS_PRODUCTION) {
    console.error('[BOOT] FATAL: ADMIN_KEY environment variable is not set. Refusing to start in production.');
    process.exit(1);
  } else {
    console.warn('[BOOT] WARNING: ADMIN_KEY not set. Using insecure development fallback. DO NOT use in production.');
  }
}
const ADMIN_KEY_RESOLVED = ADMIN_KEY || 'linknpark-admin-dev-DO-NOT-USE-IN-PRODUCTION';

// ============ CLIENTS ============
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;

if (!supabase) console.warn('[BOOT] Supabase not configured — DB calls will fail');

// Verify the otps table exists so OTPs survive server restarts.
// Run api-server/migrations/001_create_otps_table.sql in Supabase if this fails.
if (supabase) {
  supabase.from('otps').select('id').limit(1).then(({ error }) => {
    if (error && error.code === '42P01') {
      console.error('[BOOT] FATAL: "otps" table not found in Supabase.');
      console.error('[BOOT] Run api-server/migrations/001_create_otps_table.sql in your Supabase SQL editor.');
      if (IS_PRODUCTION) process.exit(1);
    } else if (!error) {
      console.log('[BOOT] otps table: OK (OTPs are Supabase-persistent)');
    }
  }).catch(() => {});
}

// ============ MULTER ============
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ============ EXPRESS + HTTP ============
const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
      'https://scan.linknpark.in',
      'https://linknpark.in',
      'https://www.linknpark.in',
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow any localhost origin during development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Check against allowed production origins
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'Cache-Control', 'Pragma'],
  credentials: true,
}));

app.use(express.json());

// ============ WEBSOCKET SERVER ============
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ── WebSocket: real-time incident push (subscribe by sticker code) ────────────
const stickerClients = {};

function pushToClients(stickerCode, payload) {
  const clients = stickerClients[stickerCode];
  if (!clients || clients.size === 0) return 0;
  const msg = JSON.stringify(payload);
  let sent = 0;
  clients.forEach(ws => { if (ws.readyState === 1) { ws.send(msg); sent++; } });
  return sent;
}

// ── Expo push helper (used by report.js and chat.js routes) ──────────────────
async function sendExpoPush(token, { title, body, data = {} }) {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'alert_sound.wav', priority: 'high', channelId: 'incidents_v2' }),
    });
    const json = await res.json();
    if (json.data?.status === 'error') console.warn('[PUSH] Expo error:', json.data.message);
    return json.data?.status === 'ok';
  } catch (e) {
    console.error('[PUSH] Send failed:', e.message);
    return false;
  }
}

// ── In-memory OTP fallback (used by auth.js when supabase is null) ────────────
const otpStore = new Map();
if (!supabase) {
  // Only run the cleanup interval when using the in-memory fallback
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of otpStore) if (v.expiresAt < now) otpStore.delete(k);
  }, 60_000);
}

// ── Legacy in-memory chat rooms (used by chat.js routes) ─────────────────────
const chatRooms = {}; // incidentId -> Array of { sender, text, ts }

// ============ ROUTE MODULES ============
const { router: authRouter, requireAuth } = require('./routes/auth')({
  supabase, jwt, JWT_SECRET_RESOLVED, otpStore, resend, FROM_EMAIL, OTP_TTL_MS,
});

const { router: stickersRouter } = require('./routes/stickers')({ supabase, requireAuth });
const { router: incidentsRouter } = require('./routes/incidents')({ supabase, requireAuth });
const { router: reportRouter } = require('./routes/report')({ supabase, sendExpoPush, pushToClients, upload, jwt, jwtSecret: JWT_SECRET_RESOLVED });
const { router: zonesRouter } = require('./routes/zones')({ supabase, requireAuth });
const { router: pushRouter } = require('./routes/push')({ supabase, requireAuth });
const { router: chatRouter } = require('./routes/chat')({ supabase, requireAuth, sendExpoPush, chatRooms });
const { router: adminRouter } = require('./routes/admin')({ supabase, ADMIN_KEY_RESOLVED, resend });
const { router: karmaRouter } = require('./routes/karma')({ supabase, requireAuth });

// ============ MOUNT ROUTES ============
app.use(authRouter);
app.use(stickersRouter);
app.use(incidentsRouter);
app.use(reportRouter);
app.use(zonesRouter);
app.use(pushRouter);
app.use(chatRouter);
app.use(adminRouter);
app.use(karmaRouter);

// ── Health + root redirect ────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', supabase: !!supabase, resend: !!resend }));

app.get('/', (req, res) => {
  const code = req.query.code;
  if (code) return res.redirect(`https://scan.linknpark.in?code=${encodeURIComponent(code)}`);
  res.redirect('https://linknpark.in');
});

// ============ WEBSOCKET: sticker subscriptions ================================
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

// ============ WEBSOCKET: chat (Supabase-backed, in chat.js module) ============
const { initChatWebSocket } = require('./chat.js');
if (supabase) {
  initChatWebSocket(wss, supabase, jwt, JWT_SECRET);
}

// ============ START ============================================================
const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\nLinkNPark API server → http://0.0.0.0:${PORT}`);
    console.log(`Supabase: ${supabase ? 'connected' : 'NOT configured'}`);
    console.log(`Resend:   ${resend ? 'configured' : 'NOT configured'}`);
    console.log(`Redis:    ${process.env.REDIS_URL ? 'enabled (chat Pub/Sub)' : 'not set — single-instance mode (set REDIS_URL for multi-instance)'}`);
    if (IS_PRODUCTION && !process.env.REDIS_URL) {
      console.warn('[BOOT] WARNING: REDIS_URL not set. Incident WebSocket push (stickerClients) and chat are single-instance only. Safe for one Render dyno.');
    }
    console.log('');
  });
}

module.exports = { app, server };
