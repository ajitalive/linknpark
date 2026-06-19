'use strict';

/**
 * tests/stickers.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the authenticated Sticker CRUD endpoints:
 *   GET    /api/stickers
 *   POST   /api/stickers
 *   PATCH  /api/stickers/:id
 *   DELETE /api/stickers/:id
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Silence boot-time logs ──────────────────────────────────────────────────
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => jest.restoreAllMocks());

// ─── Mock Supabase ────────────────────────────────────────────────────────────
// We need to intercept supabase calls per-test, so we keep references to the
// builder chain mocks and override .single() / resolution per test.
const mockSingle      = jest.fn();
const mockMaybeSingle = jest.fn();
const mockSelect      = jest.fn();
const mockFrom        = jest.fn();
const mockInsert      = jest.fn();
const mockUpdate      = jest.fn();
const mockDelete      = jest.fn();
const mockEq          = jest.fn();
const mockOrder       = jest.fn();
const mockIn          = jest.fn();
const mockNot         = jest.fn();
const mockNeq         = jest.fn();
let mockSingle;
let mockMaybeSingle;

jest.mock('@supabase/supabase-js', () => {
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

const JWT_SECRET = 'linknpark-dev-secret-DO-NOT-USE-IN-PRODUCTION';
const OWNER_EMAIL = 'owner@linknpark.in';

function authHeader(email = OWNER_EMAIL) {
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

// ─── Mock sticker data ────────────────────────────────────────────────────────
const mockSticker = {
  id:            'sticker-uuid-001',
  code:          'LNP-2025-AA0001',
  owner_email:   OWNER_EMAIL,
  vehicle_type:  'car',
  vehicle_name:  'Honda City',
  registration:  'MH12AB1234',
  color:         'White',
  backup_phone:  '+919876543210',
  tag_type:      'vehicle',
  tag_title:     null,
  status:        'active',
  created_at:    '2025-01-01T00:00:00.000Z',
};

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/stickers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/stickers');
    expect(res.status).toBe(401);
  });

  it('returns stickers array for the authenticated user', async () => {
    // Chain: .from().select().eq().order() resolves to { data, error }
    mockOrder.mockResolvedValueOnce({ data: [mockSticker], error: null });

    const res = await request(app)
      .get('/api/stickers')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.stickers)).toBe(true);
    expect(res.body.stickers[0].code).toBe('LNP-2025-AA0001');
    expect(res.body.stickers[0].owner_email).toBe(OWNER_EMAIL);
  });

  it('returns an empty array when the user has no stickers', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    const res = await request(app)
      .get('/api/stickers')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.stickers).toHaveLength(0);
  });

  it('returns 500 on a Supabase error', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB timeout' } });

    const res = await request(app)
      .get('/api/stickers')
      .set('Authorization', authHeader());

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/db timeout/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/stickers', () => {
  beforeEach(() => jest.clearAllMocks());

  const validPayload = {
    code:          'LNP-2025-AA0001',
    vehicle_type:  'car',
    vehicle_name:  'Honda City',
    registration:  'MH12AB1234',
    color:         'White',
    backup_phone:  '+919876543210',
  };

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/stickers')
      .send(validPayload);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/stickers')
      .set('Authorization', authHeader())
      .send({ code: 'LNP-2025-AA0001' }); // missing vehicle_type + registration

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/vehicle_type.*registration/i);
  });

  it('returns 400 for an unrecognised sticker code', async () => {
    // First .single() = lookup → returns null (code not found)
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await request(app)
      .post('/api/stickers')
      .set('Authorization', authHeader())
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid sticker code/i);
  });

  it('returns 409 when the sticker is already claimed', async () => {
    // Lookup: sticker exists and has an owner
    mockSingle.mockResolvedValueOnce({
      data: { ...mockSticker, owner_email: 'someone_else@example.com', status: 'active' },
      error: null,
    });

    const res = await request(app)
      .post('/api/stickers')
      .set('Authorization', authHeader())
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already been registered/i);
  });

  it('activates an unclaimed sticker and returns the updated sticker', async () => {
    // 1st single: lookup → unclaimed sticker
    mockSingle.mockResolvedValueOnce({
      data: { ...mockSticker, owner_email: null, status: 'unclaimed' },
      error: null,
    });
    // 2nd single: after UPDATE → activated sticker
    mockSingle.mockResolvedValueOnce({
      data: { ...mockSticker },
      error: null,
    });

    const res = await request(app)
      .post('/api/stickers')
      .set('Authorization', authHeader())
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.sticker.code).toBe('LNP-2025-AA0001');
    expect(res.body.sticker.status).toBe('active');
  });

  it('upcases the sticker code before looking it up', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    await request(app)
      .post('/api/stickers')
      .set('Authorization', authHeader())
      .send({ ...validPayload, code: 'lnp-2025-aa0001' }); // lowercase

    // The first .eq() call should have received the uppercased code
    expect(mockEq).toHaveBeenCalledWith('code', 'LNP-2025-AA0001');
  });

  it('returns 500 when the UPDATE fails', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { ...mockSticker, owner_email: null, status: 'unclaimed' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } });

    const res = await request(app)
      .post('/api/stickers')
      .set('Authorization', authHeader())
      .send(validPayload);

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/stickers/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .patch('/api/stickers/sticker-uuid-001')
      .send({ vehicle_name: 'Updated Car' });
    expect(res.status).toBe(401);
  });

  it('updates allowed fields and returns the updated sticker', async () => {
    const updated = { ...mockSticker, vehicle_name: 'Updated Car', color: 'Red' };
    mockSingle.mockResolvedValueOnce({ data: updated, error: null });

    const res = await request(app)
      .patch('/api/stickers/sticker-uuid-001')
      .set('Authorization', authHeader())
      .send({ vehicle_name: 'Updated Car', color: 'Red' });

    expect(res.status).toBe(200);
    expect(res.body.sticker.vehicle_name).toBe('Updated Car');
    expect(res.body.sticker.color).toBe('Red');
  });

  it('returns 404 when no matching sticker is found for the owner', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await request(app)
      .patch('/api/stickers/nonexistent-id')
      .set('Authorization', authHeader())
      .send({ vehicle_name: 'Ghost Car' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/sticker not found/i);
  });

  it('returns 500 on a Supabase error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Patch failed' } });

    const res = await request(app)
      .patch('/api/stickers/sticker-uuid-001')
      .set('Authorization', authHeader())
      .send({ color: 'Blue' });

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/stickers/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/stickers/sticker-uuid-001');
    expect(res.status).toBe(401);
  });

  it('deletes a sticker and returns ok:true', async () => {
    // The final .eq() in the delete chain resolves the promise
    mockEq.mockResolvedValueOnce({ error: null });

    const res = await request(app)
      .delete('/api/stickers/sticker-uuid-001')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('only deletes stickers owned by the authenticated user (eq owner_email check)', async () => {
    mockEq.mockResolvedValueOnce({ error: null });

    await request(app)
      .delete('/api/stickers/sticker-uuid-001')
      .set('Authorization', authHeader());

    // Verify that .eq() was called with owner_email = OWNER_EMAIL
    const eqCalls = mockEq.mock.calls;
    const ownerEqCall = eqCalls.find(
      ([col, val]) => col === 'owner_email' && val === OWNER_EMAIL
    );
    expect(ownerEqCall).toBeDefined();
  });

  it('returns 500 on a Supabase delete error', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

    const res = await request(app)
      .delete('/api/stickers/sticker-uuid-001')
      .set('Authorization', authHeader());

    expect(res.status).toBe(500);
  });
});
