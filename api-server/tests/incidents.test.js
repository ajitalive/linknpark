'use strict';

/**
 * tests/incidents.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the authenticated Incidents endpoints:
 *   GET   /api/incidents
 *   PATCH /api/incidents/:id
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

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const { app } = require('../server');

const JWT_SECRET  = 'linknpark-dev-secret-DO-NOT-USE-IN-PRODUCTION';
const OWNER_EMAIL = 'owner@linknpark.in';

function authHeader(email = OWNER_EMAIL) {
  return `Bearer ${jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' })}`;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockIncident = {
  id:            'incident-uuid-001',
  sticker_code:  'LNP-2025-AA0001',
  reason:        'blocking',
  reason_label:  'Blocking driveway',
  message:       'Please move your car from gate 2',
  reporter_phone: '+919999988888',
  status:        'open',
  reported_at:   '2025-06-01T10:00:00.000Z',
  resolved_at:   null,
  stickers: {
    vehicle_name:  'Honda City',
    registration:  'MH12AB1234',
    vehicle_type:  'car',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/incidents', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/incidents');
    expect(res.status).toBe(401);
  });

  it('returns empty array when user has no stickers', async () => {
    // First supabase call: get stickers for owner → empty list
    chainable.eq.mockResolvedValueOnce({ data: [], error: null });

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.incidents).toHaveLength(0);
  });

  it('returns incidents for all of the owner\'s sticker codes', async () => {
    // 1st call: get stickers
    chainable.eq.mockResolvedValueOnce({
      data: [{ code: 'LNP-2025-AA0001' }, { code: 'LNP-2025-AA0002' }],
      error: null,
    });
    // 2nd call chain ends with .order() → incidents list
    chainable.order.mockResolvedValueOnce({ data: [mockIncident], error: null });

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.incidents).toHaveLength(1);
    expect(res.body.incidents[0].id).toBe('incident-uuid-001');
    expect(res.body.incidents[0].reason).toBe('blocking');
  });

  it('returns 500 on Supabase error fetching incidents', async () => {
    chainable.eq.mockResolvedValueOnce({ data: [{ code: 'LNP-2025-AA0001' }], error: null });
    chainable.order.mockResolvedValueOnce({ data: null, error: { message: 'Query failed' } });

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', authHeader());

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/query failed/i);
  });

  it('includes joined sticker vehicle info in the incidents response', async () => {
    chainable.eq.mockResolvedValueOnce({ data: [{ code: 'LNP-2025-AA0001' }], error: null });
    chainable.order.mockResolvedValueOnce({ data: [mockIncident], error: null });

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', authHeader());

    expect(res.body.incidents[0].stickers).toBeDefined();
    expect(res.body.incidents[0].stickers.registration).toBe('MH12AB1234');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/incidents/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch('/api/incidents/incident-uuid-001')
      .send({ status: 'resolved' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await request(app)
      .patch('/api/incidents/incident-uuid-001')
      .set('Authorization', authHeader())
      .send({ status: 'gibberish' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status/i);
  });

  it('returns 404 when the incident does not belong to the authenticated user', async () => {
    // Ownership check: incident belongs to a different owner
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'incident-uuid-001',
        sticker_code: 'LNP-2025-AA0001',
        stickers: { owner_email: 'someone_else@example.com' },
      },
      error: null,
    });

    const res = await request(app)
      .patch('/api/incidents/incident-uuid-001')
      .set('Authorization', authHeader())
      .send({ status: 'resolved' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 404 when the incident does not exist', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await request(app)
      .patch('/api/incidents/nonexistent-incident')
      .set('Authorization', authHeader())
      .send({ status: 'dismissed' });

    expect(res.status).toBe(404);
  });

  it('marks an incident as resolved and sets resolved_at', async () => {
    // 1st single: ownership check passes
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'incident-uuid-001',
        sticker_code: 'LNP-2025-AA0001',
        stickers: { owner_email: OWNER_EMAIL },
      },
      error: null,
    });
    // 2nd single: result of UPDATE
    const resolvedIncident = {
      ...mockIncident,
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    };
    mockSingle.mockResolvedValueOnce({ data: resolvedIncident, error: null });

    const res = await request(app)
      .patch('/api/incidents/incident-uuid-001')
      .set('Authorization', authHeader())
      .send({ status: 'resolved' });

    expect(res.status).toBe(200);
    expect(res.body.incident.status).toBe('resolved');
    expect(res.body.incident.resolved_at).not.toBeNull();
  });

  it('marks an incident as dismissed and sets resolved_at', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: 'incident-uuid-001', sticker_code: 'X', stickers: { owner_email: OWNER_EMAIL } },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { ...mockIncident, status: 'dismissed', resolved_at: new Date().toISOString() },
      error: null,
    });

    const res = await request(app)
      .patch('/api/incidents/incident-uuid-001')
      .set('Authorization', authHeader())
      .send({ status: 'dismissed' });

    expect(res.status).toBe(200);
    expect(res.body.incident.status).toBe('dismissed');
    expect(res.body.incident.resolved_at).toBeTruthy();
  });

  it('allows re-opening an incident to "open" status (resolved_at not set)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: 'incident-uuid-001', sticker_code: 'X', stickers: { owner_email: OWNER_EMAIL } },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({
      data: { ...mockIncident, status: 'open', resolved_at: null },
      error: null,
    });

    const res = await request(app)
      .patch('/api/incidents/incident-uuid-001')
      .set('Authorization', authHeader())
      .send({ status: 'open' });

    expect(res.status).toBe(200);
    expect(res.body.incident.status).toBe('open');
    // resolved_at should NOT have been set for 'open'
    expect(res.body.incident.resolved_at).toBeNull();
  });

  it('returns 500 on Supabase update error', async () => {
    mockSingle.mockResolvedValueOnce({
      data: { id: 'incident-uuid-001', sticker_code: 'X', stickers: { owner_email: OWNER_EMAIL } },
      error: null,
    });
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });

    const res = await request(app)
      .patch('/api/incidents/incident-uuid-001')
      .set('Authorization', authHeader())
      .send({ status: 'resolved' });

    expect(res.status).toBe(500);
  });
});
