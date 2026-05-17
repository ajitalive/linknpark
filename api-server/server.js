const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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
