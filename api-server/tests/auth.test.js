'use strict';

/**
 * tests/auth.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the Auth endpoints:
 *   POST /api/auth/send-otp
 *   POST /api/auth/verify-otp
 *   GET  /api/auth/me
 *   POST /api/auth/update
 *
 * All external services (Supabase, Resend) are mocked so no real network
 * traffic is generated.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Silence the boot-time console warnings/logs ──────────────────────────
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ─── Mock Supabase ───────────────────────────────────────────────────────────
jest.mock('@supabase/supabase-js', () => {
  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    not: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    createClient: jest.fn(() => mockClient),
    __mockClient: mockClient,
  };
});

// ─── Mock Resend ─────────────────────────────────────────────────────────────
const mockSendEmail = jest.fn().mockResolvedValue({ id: 'mock-email-id' });
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: mockSendEmail },
    })),
  };
});

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const { app } = require('../server');

// The dev-fallback secret used by server.js when JWT_SECRET env is absent
const TEST_JWT_SECRET = 'linknpark-dev-secret-DO-NOT-USE-IN-PRODUCTION';

function makeToken(payload = {}, secret = TEST_JWT_SECRET) {
  return jwt.sign({ email: 'test@example.com', ...payload }, secret, { expiresIn: '1h' });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/send-otp', () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
    // RESEND_API_KEY is not set in tests → server uses devCode path, not real Resend
  });

  it('returns 400 for a missing email body', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email required/i);
  });

  it('returns 400 for a malformed email address', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it('returns 400 for an email missing the domain extension', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: 'user@domain' });

    expect(res.status).toBe(400);
  });

  it('returns ok:true and a devCode when Resend is not configured', async () => {
    // RESEND_API_KEY env var is not set → resend instance is null → dev path
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: 'user@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.devCode).toMatch(/^\d{6}$/);
    expect(res.body.note).toMatch(/dev code/i);
    // Resend SDK should NOT have been called
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('normalises the email to lowercase before storing the OTP', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: 'User@EXAMPLE.COM' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // The OTP was stored under the lowercase key — verify-otp with lowercase works
    const code = res.body.devCode;
    const verify = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'user@example.com', code });
    expect(verify.status).toBe(200);
    expect(verify.body.ok).toBe(true);
  });

  it('applies rate limiting after many requests from the same IP', async () => {
    // Send 11 requests; the 11th should be rate-limited (limit is 10/hour)
    let lastRes;
    for (let i = 0; i < 11; i++) {
      lastRes = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: `rate${i}@example.com` });
    }
    // The limiter fires on the 11th unique-IP request in the test process
    // (IP is 127.0.0.1 for all supertest requests)
    expect(lastRes.status).toBe(429);
    expect(lastRes.body.error).toMatch(/too many/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/verify-otp', () => {
  let validEmail;
  let validCode;

  // Seed a fresh OTP before each test
  beforeEach(async () => {
    validEmail = `verify_${Date.now()}@example.com`;
    const sendRes = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: validEmail });
    validCode = sendRes.body.devCode;
  });

  it('returns 400 when email or code is missing', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: validEmail }); // missing code

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/code/i);
  });

  it('returns 400 when no OTP has been requested for the email', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'nobody@example.com', code: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no otp/i);
  });

  it('returns 400 for an incorrect code and decrements attemptsLeft', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: validEmail, code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect/i);
    expect(typeof res.body.attemptsLeft).toBe('number');
    expect(res.body.attemptsLeft).toBe(4);
  });

  it('returns 429 and purges OTP after 5 consecutive wrong attempts', async () => {
    // Burn through 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: validEmail, code: '000000' });
    }
    // 6th attempt should see OTP deleted → 429
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: validEmail, code: '000000' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many/i);
  });

  it('returns a JWT token and user object on correct code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: validEmail, code: validCode });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe(validEmail);

    // Token should be a valid JWT with the correct email claim
    const decoded = jwt.verify(res.body.token, TEST_JWT_SECRET);
    expect(decoded.email).toBe(validEmail);
  });

  it('deletes the OTP after successful verification (no replay)', async () => {
    await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: validEmail, code: validCode });

    // Second use of the same code must fail
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: validEmail, code: validCode });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no otp/i);
  });

  it('returns 400 for an expired OTP by manipulating system time', async () => {
    // Freeze time 6 minutes into the future so OTP TTL (5 min) elapses
    const realNow = Date.now;
    Date.now = () => realNow() + 6 * 60 * 1000;

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: validEmail, code: validCode });

    Date.now = realNow; // restore

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no token/i);
  });

  it('returns 401 with a malformed Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid token/i);
  });

  it('returns 401 with a token signed by a different secret', async () => {
    const badToken = jwt.sign({ email: 'attacker@evil.com' }, 'wrong-secret');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 and the user payload with a valid token', async () => {
    const token = makeToken({ email: 'owner@linknpark.in', name: 'Owner User' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('owner@linknpark.in');
    expect(res.body.user.name).toBe('Owner User');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/update', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/auth/update')
      .send({ name: 'New Name' });
    expect(res.status).toBe(401);
  });

  it('returns a new token with updated name embedded', async () => {
    const token = makeToken({ email: 'ravi@linknpark.in' });
    const res = await request(app)
      .post('/api/auth/update')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ravi Kumar' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.name).toBe('Ravi Kumar');
    expect(res.body.user.email).toBe('ravi@linknpark.in');

    // New token must carry the name
    const decoded = jwt.verify(res.body.token, TEST_JWT_SECRET);
    expect(decoded.name).toBe('Ravi Kumar');
    // Standard claims should be stripped (no iat/exp from old token carried forward raw)
    // The new token will have its own iat/exp, but not the old ones
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
  });

  it('preserves the email field in the new token after update', async () => {
    const token = makeToken({ email: 'priya@linknpark.in' });
    const res = await request(app)
      .post('/api/auth/update')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Priya Singh' });

    const decoded = jwt.verify(res.body.token, TEST_JWT_SECRET);
    expect(decoded.email).toBe('priya@linknpark.in');
  });
});
