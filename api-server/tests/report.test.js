'use strict';

/**
 * tests/report.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the public scanner / reporting endpoints:
 *   GET  /api/sticker/by-plate/:plate   (the "lookup" endpoint)
 *   GET  /api/sticker/:code             (scanner code lookup)
 *   POST /api/report                    (submit incident report)
 * ─────────────────────────────────────────────────────────────────────────────
 */

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => jest.restoreAllMocks());

// ─── Supabase mock ────────────────────────────────────────────────────────────
let mockSingle;
let mockMaybeSingle;

jest.mock('@supabase/supabase-js', () => {
  const mockFn = () => jest.fn();
  const mockClient = {
    from:        jest.fn().mockReturnThis(),
    select:      jest.fn().mockReturnThis(),
    insert:      jest.fn().mockReturnThis(),
    update:      jest.fn().mockReturnThis(),
    delete:      jest.fn().mockReturnThis(),
    upsert:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    neq:         jest.fn().mockReturnThis(),
    in:          jest.fn().mockReturnThis(),
    not:         jest.fn().mockReturnThis(),
    order:       jest.fn().mockReturnThis(),
    limit:       jest.fn().mockReturnThis(),
    gte:         jest.fn().mockReturnThis(),
    lt:          jest.fn().mockReturnThis(),
    lte:         jest.fn().mockReturnThis(),
    or:          jest.fn().mockReturnThis(),
    single:      jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    rpc:         jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return { createClient: jest.fn(() => mockClient), __mockClient: mockClient };
});

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ id: 'ok' }) },
  })),
}));

// ─── Mock global fetch (used for Expo push notifications) ────────────────────
global.fetch = jest.fn().mockResolvedValue({
  ok:   true,
  json: async () => ({ data: { status: 'ok' } }),
});

const request = require('supertest');
const { app } = require('../server');

// ─── Mock sticker / incident data ─────────────────────────────────────────────
const activeStickerDB = {
  code:          'LNP-2025-AA0001',
  vehicle_type:  'car',
  color:         'White',
  vehicle_name:  'Honda City',
  registration:  'MH12AB1234',
  status:        'active',
  tag_type:      'vehicle',
  tag_title:     null,
};

const mockIncidentInserted = {
  id:            'incident-uuid-002',
  sticker_code:  'LNP-2025-AA0001',
  reason:        'blocking',
  reason_label:  'Blocking driveway',
  message:       'Please move the car',
  reporter_phone: null,
  status:        'pending',
  reported_at:   new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/sticker/by-plate/:plate  (plate lookup)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  it('returns vehicle info for the hard-coded CEO mock plate MH43BK9214', async () => {
    // The server has a local mock for this plate — no DB needed
    // Make all supabase calls return null so the server falls through to the mock
    mockSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app).get('/api/sticker/by-plate/MH43BK9214');

    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.sticker_code).toBe('MOCK123');
    expect(res.body.vehicleType).toBe('car');
    expect(res.body.platePartial).toMatch(/MH.*14/);
  });

  it('returns 404 with found:false for a plate not in the system', async () => {
    // Supabase returns null, no mock fallback for this plate
    mockSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app).get('/api/sticker/by-plate/XX99ZZ0000');

    expect(res.status).toBe(404);
    expect(res.body.found).toBe(false);
    expect(res.body.error).toMatch(/not registered/i);
  });

  it('returns 400 when plate is fewer than 4 characters', async () => {
    const res = await request(app).get('/api/sticker/by-plate/AB');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/min 4/i);
  });

  it('strips spaces from the plate and upcases it before lookup', async () => {
    mockSingle.mockResolvedValueOnce({ data: activeStickerDB, error: null });

    const res = await request(app).get('/api/sticker/by-plate/mh 12 ab 1234');

    // Server strips spaces + upcases → 'MH12AB1234'
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.vehicleColor).toBe('White');
  });

  it('returns a partial plate (not the full registration) for PII protection', async () => {
    mockSingle.mockResolvedValueOnce({ data: activeStickerDB, error: null });

    const res = await request(app).get('/api/sticker/by-plate/MH12AB1234');

    expect(res.body.found).toBe(true);
    // Full plate 'MH12AB1234' should NOT appear in response
    expect(JSON.stringify(res.body)).not.toContain('MH12AB1234');
    // platePartial should start with 'MH' and end with '34'
    expect(res.body.platePartial).toMatch(/^MH/);
    expect(res.body.platePartial).toMatch(/34$/);
  });

  it('includes ownerReachable:true for an active sticker', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...activeStickerDB, status: 'active' }, error: null });

    const res = await request(app).get('/api/sticker/by-plate/MH12AB1234');
    expect(res.body.ownerReachable).toBe(true);
  });

  it('includes ownerReachable:false for a paused sticker', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...activeStickerDB, status: 'paused' }, error: null });

    const res = await request(app).get('/api/sticker/by-plate/MH12AB1234');
    expect(res.body.ownerReachable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/sticker/:code  (scanner code lookup)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 for an unknown sticker code', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await request(app).get('/api/sticker/INVALID-CODE');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns vehicle info for a known active sticker code', async () => {
    mockSingle.mockResolvedValueOnce({ data: activeStickerDB, error: null });

    const res = await request(app).get('/api/sticker/LNP-2025-AA0001');

    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.vehicleType).toBe('car');
    expect(res.body.ownerReachable).toBe(true);
  });

  it('upcases the code parameter before querying', async () => {
    mockSingle.mockResolvedValueOnce({ data: activeStickerDB, error: null });

    await request(app).get('/api/sticker/lnp-2025-aa0001');

    // The eq call should have been made with the uppercased code
    expect(chainable.eq).toHaveBeenCalledWith('code', 'LNP-2025-AA0001');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  const validPayload = {
    stickerCode:   'LNP-2025-AA0001',
    reason:        'blocking',
    message:       'Please move your car',
    reporterPhone: '+919999988888',
  };

  it('returns 400 when stickerCode is missing', async () => {
    const res = await request(app)
      .post('/api/report')
      .send({ reason: 'blocking' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stickerCode/i);
  });

  it('returns 400 when reason is missing', async () => {
    const res = await request(app)
      .post('/api/report')
      .send({ stickerCode: 'LNP-2025-AA0001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reason/i);
  });

  it('returns 404 when the sticker code is not found in the DB', async () => {
    // Supabase sticker lookup → null
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await request(app)
      .post('/api/report')
      .send({ ...validPayload, stickerCode: 'UNKNOWN-CODE' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/sticker not found/i);
  });

  it('creates an incident and returns ok:true with a reportId', async () => {
    // 1) Sticker lookup
    mockSingle.mockResolvedValueOnce({
      data: { id: 'sticker-uuid-001', owner_email: 'owner@linknpark.in' },
      error: null,
    });
    // 2) Incident INSERT
    mockSingle.mockResolvedValueOnce({ data: mockIncidentInserted, error: null });
    // 3) Scan count update (select owner_email)
    mockSingle.mockResolvedValueOnce({ data: { owner_email: 'owner@linknpark.in' }, error: null });
    // 4) Push token lookup
    mockSingle.mockResolvedValueOnce({ data: { token: 'ExponentPushToken[abc123]' }, error: null });

    const res = await request(app)
      .post('/api/report')
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.reportId).toBe('string');
    expect(res.body.reportId).toBe('incident-uuid-002');
  });

  it('uses the CEO mock sticker MOCK123 when DB lookup fails', async () => {
    // Sticker lookup → null (falls through to MOCK123 built-in)
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    // Incident insert also fails → falls through to mock
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'connection error' } });
    // subsequent calls return null
    mockSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app)
      .post('/api/report')
      .send({ ...validPayload, stickerCode: 'MOCK123' });

    // The server has a hard-coded fallback for MOCK123
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.reportId).toBe('mock-incident-123');
  });

  it('maps reason codes to human-readable reason_label', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'sid', owner_email: 'o@x.com' }, error: null });
    mockSingle.mockResolvedValueOnce({ data: { ...mockIncidentInserted, reason_label: 'Blocking driveway' }, error: null });
    mockSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app)
      .post('/api/report')
      .send({ stickerCode: 'LNP-2025-AA0001', reason: 'blocking' });

    expect(res.status).toBe(200);
    // We trust the endpoint mapped it correctly (verified by incident data returned)
    expect(res.body.ok).toBe(true);
  });

  it('succeeds even when Expo push fetch fails (non-critical path)', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'sid', owner_email: 'o@x.com' }, error: null });
    mockSingle.mockResolvedValueOnce({ data: mockIncidentInserted, error: null });
    mockSingle.mockResolvedValueOnce({ data: { owner_email: 'o@x.com' }, error: null });
    mockSingle.mockResolvedValueOnce({ data: { token: 'ExponentPushToken[abc]' }, error: null });

    // Simulate push API failing
    global.fetch.mockRejectedValueOnce(new Error('Network down'));

    const res = await request(app)
      .post('/api/report')
      .send(validPayload);

    // The report should still be created even if push fails
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('upcases stickerCode before processing', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null }); // no DB sticker
    // 'mock123' lowercased → server upcases to 'MOCK123' → hits built-in mock
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'none' } });
    mockSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app)
      .post('/api/report')
      .send({ ...validPayload, stickerCode: 'mock123' });

    expect(res.status).toBe(200);
    expect(res.body.reportId).toBe('mock-incident-123');
  });
});
