'use strict';

// ─── ioredis mock (must be before any require) ───────────────────────────────
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    publish:     jest.fn().mockResolvedValue(1),
    subscribe:   jest.fn().mockResolvedValue(null),
    unsubscribe: jest.fn().mockResolvedValue(null),
    on:          jest.fn(),
    quit:        jest.fn().mockResolvedValue(null),
    duplicate:   jest.fn().mockReturnThis(),
  }));
});

/**
 * tests/chat.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the Chat / Session endpoints:
 *   POST /api/chat/init
 *   GET  /api/chat/:sessionId/messages
 *   GET  /api/incidents/:id/chat        (authenticated — owner)
 *
 * Also smoke-tests the legacy in-memory chat:
 *   GET  /api/chat/:incidentId          (unauthenticated)
 *   POST /api/chat/:incidentId          (unauthenticated)
 * ─────────────────────────────────────────────────────────────────────────────
 */

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => jest.restoreAllMocks());

// ─── ioredis mock ──────────────────────────────────────────────────────────────
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(null),
    unsubscribe: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(null),
    duplicate: jest.fn().mockReturnThis(),
  }));
});

// ─── Supabase mock ────────────────────────────────────────────────────────────
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

global.fetch = jest.fn().mockResolvedValue({
  ok:   true,
  json: async () => ({ data: { status: 'ok' } }),
});

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const { app } = require('../server');

// Grab the shared mock client and alias the terminal-method mocks
const { __mockClient: mockClient } = require('@supabase/supabase-js');
const mockSingle      = mockClient.single;
const mockMaybeSingle = mockClient.maybeSingle;

const JWT_SECRET  = 'linknpark-dev-secret-DO-NOT-USE-IN-PRODUCTION';
const OWNER_EMAIL = 'owner@linknpark.in';

function authHeader(email = OWNER_EMAIL) {
  return `Bearer ${jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' })}`;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const mockChatSession = {
  id:            'session-uuid-001',
  incident_id:   'incident-uuid-001',
  visitor_token: 'abc123visitortoken',
  status:        'active',
  created_at:    '2025-06-01T10:00:00.000Z',
};

const mockMessages = [
  {
    id:          'msg-001',
    session_id:  'session-uuid-001',
    sender_type: 'visitor',
    content:     'Hi, your car is blocking my gate',
    created_at:  '2025-06-01T10:01:00.000Z',
  },
  {
    id:          'msg-002',
    session_id:  'session-uuid-001',
    sender_type: 'owner',
    content:     'On my way! 5 minutes.',
    created_at:  '2025-06-01T10:02:00.000Z',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/chat/init', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when incident_id is missing', async () => {
    const res = await request(app)
      .post('/api/chat/init')
      .send({ visitor_token: 'abc123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns 400 when visitor_token is missing', async () => {
    const res = await request(app)
      .post('/api/chat/init')
      .send({ incident_id: 'incident-uuid-001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns an existing active session when one already exists', async () => {
    // First single: existing active session found
    mockSingle.mockResolvedValueOnce({ data: mockChatSession, error: null });

    const res = await request(app)
      .post('/api/chat/init')
      .send({ incident_id: 'incident-uuid-001', visitor_token: 'abc123visitortoken' });

    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe('session-uuid-001');
    expect(res.body.session.status).toBe('active');
  });

  it('creates a new session when none exists for the visitor_token + incident_id', async () => {
    // 1st single: no existing session
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    // 2nd single: newly created session
    mockSingle.mockResolvedValueOnce({ data: { ...mockChatSession, id: 'session-uuid-002' }, error: null });

    const res = await request(app)
      .post('/api/chat/init')
      .send({ incident_id: 'incident-uuid-001', visitor_token: 'brandnewtoken' });

    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe('session-uuid-002');
  });

  it('returns 500 when session creation fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: null }); // no existing
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

    const res = await request(app)
      .post('/api/chat/init')
      .send({ incident_id: 'incident-uuid-001', visitor_token: 'sometoken' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/insert failed/i);
  });

  it('re-uses an existing session without creating a duplicate', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockChatSession, error: null });

    const res = await request(app)
      .post('/api/chat/init')
      .send({ incident_id: 'incident-uuid-001', visitor_token: 'abc123visitortoken' });

    expect(res.status).toBe(200);
    // The insert mock should not have been called on the second path
    // (we only check the second single is NOT called for insert if session exists)
    expect(mockSingle).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/chat/:sessionId/messages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty messages array for a brand-new session', async () => {
    mockClient.order.mockResolvedValueOnce({ data: [], error: null });

    const res = await request(app).get('/api/chat/session-uuid-001/messages');

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(0);
  });

  it('returns messages in ascending created_at order', async () => {
    mockClient.order.mockResolvedValueOnce({ data: mockMessages, error: null });

    const res = await request(app).get('/api/chat/session-uuid-001/messages');

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.messages[0].sender_type).toBe('visitor');
    expect(res.body.messages[1].sender_type).toBe('owner');
  });

  it('returns correct message shape (id, session_id, sender_type, content, created_at)', async () => {
    mockClient.order.mockResolvedValueOnce({ data: [mockMessages[0]], error: null });

    const res = await request(app).get('/api/chat/session-uuid-001/messages');
    const msg = res.body.messages[0];

    expect(msg).toHaveProperty('id');
    expect(msg).toHaveProperty('session_id');
    expect(msg).toHaveProperty('sender_type');
    expect(msg).toHaveProperty('content');
    expect(msg).toHaveProperty('created_at');
  });

  it('returns 500 on a Supabase error', async () => {
    mockClient.order.mockResolvedValueOnce({ data: null, error: { message: 'Query timeout' } });

    const res = await request(app).get('/api/chat/session-uuid-001/messages');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/query timeout/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/incidents/:id/chat  (owner session management)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/incidents/incident-uuid-001/chat');
    expect(res.status).toBe(401);
  });

  it('returns an existing active session for the incident', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: mockChatSession, error: null });

    const res = await request(app)
      .get('/api/incidents/incident-uuid-001/chat')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe('session-uuid-001');
    expect(res.body.session.incident_id).toBe('incident-uuid-001');
  });

  it('creates a new session (with random visitor_token) when none exists', async () => {
    // maybeSingle → no existing session
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // single → newly inserted session
    mockSingle.mockResolvedValueOnce({
      data: { ...mockChatSession, id: 'session-uuid-new', visitor_token: 'randomhex' },
      error: null,
    });

    const res = await request(app)
      .get('/api/incidents/incident-uuid-001/chat')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.session).toBeDefined();
    expect(typeof res.body.session.visitor_token).toBe('string');
    expect(res.body.session.visitor_token.length).toBeGreaterThan(0);
  });

  it('returns 500 when session creation fails', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error creating session' } });

    const res = await request(app)
      .get('/api/incidents/incident-uuid-001/chat')
      .set('Authorization', authHeader());

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/db error/i);
  });

  it('returns 500 when the maybeSingle query errors', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'Session query failed' } });

    const res = await request(app)
      .get('/api/incidents/incident-uuid-001/chat')
      .set('Authorization', authHeader());

    expect(res.status).toBe(500);
  });

  it('returns a session with status:active', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: mockChatSession, error: null });

    const res = await request(app)
      .get('/api/incidents/incident-uuid-001/chat')
      .set('Authorization', authHeader());

    expect(res.body.session.status).toBe('active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Legacy in-memory chat (GET|POST /api/chat/:incidentId)', () => {
  // These are the MVP in-memory routes — no DB, no auth needed
  beforeEach(() => jest.clearAllMocks());

  const INCIDENT_ID = `legacy-incident-${Date.now()}`;

  it('GET returns an empty messages array before any messages are sent', async () => {
    const res = await request(app).get(`/api/chat/${INCIDENT_ID}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages).toHaveLength(0);
  });

  it('POST adds a message and GET reflects it', async () => {
    await request(app)
      .post(`/api/chat/${INCIDENT_ID}`)
      .send({ sender: 'scanner', text: 'Hello owner!' });

    const res = await request(app).get(`/api/chat/${INCIDENT_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].sender).toBe('scanner');
    expect(res.body.messages[0].text).toBe('Hello owner!');
  });

  it('POST accumulates multiple messages in order', async () => {
    const chatId = `ordered-incident-${Date.now()}`;
    const msgs = ['First', 'Second', 'Third'];
    for (const text of msgs) {
      await request(app)
        .post(`/api/chat/${chatId}`)
        .send({ sender: 'scanner', text });
    }

    const res = await request(app).get(`/api/chat/${chatId}`);
    expect(res.body.messages).toHaveLength(3);
    expect(res.body.messages.map(m => m.text)).toEqual(msgs);
  });

  it('POST returns ok:true', async () => {
    // Set up supabase mocks for the notification path inside the handler
    mockSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app)
      .post(`/api/chat/any-incident-${Date.now()}`)
      .send({ sender: 'scanner', text: 'Test message' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('stores a ts timestamp on each message', async () => {
    const chatId = `ts-incident-${Date.now()}`;
    await request(app)
      .post(`/api/chat/${chatId}`)
      .send({ sender: 'owner', text: 'Moving now' });

    const res = await request(app).get(`/api/chat/${chatId}`);
    expect(typeof res.body.messages[0].ts).toBe('number');
    expect(res.body.messages[0].ts).toBeGreaterThan(0);
  });
});
