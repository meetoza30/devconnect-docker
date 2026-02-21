// tests/connections.test.js
// Tests for: POST /reqs/send/:status/:receiverId
//            PATCH /reqs/review/:status/:reqid

import request from 'supertest';
import app from '../../app.js'
import { connect, closeDatabase, clearDatabase } from './setup.js';

// ── Helpers ───────────────────────────────────────────────
// Creates a user via signup and returns the auth cookie + user body.
async function createUser(overrides = {}) {
  const base = {
    fullName: 'Test User',
    emailId: `user_${Date.now()}_${Math.random()}@test.com`,
    userName: `user_${Date.now()}`,
    age: 22,
    gradYear: 2025,
    gender: 'male',
    password: 'TestPass123!',
    skills: ['Go', 'Docker', 'Postgres'],
    bio: 'Tester',
    socials: {},
    ...overrides,
  };
  const res = await request(app).post('/signup').send(base);
  return {
    cookie: res.headers['set-cookie'],
    user: res.body.user,
  };
}

beforeAll(async () => await connect());
afterAll(async () => await closeDatabase());
afterEach(async () => await clearDatabase());

// ── POST /reqs/send/:status/:receiverId ───────────────────
describe('POST /reqs/send/:status/:receiverId', () => {
  it('sends an "interested" request successfully', async () => {
    const sender = await createUser();
    const receiver = await createUser();

    const res = await request(app)
      .post(`/reqs/send/interested/${receiver.user._id}`)
      .set('Cookie', sender.cookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Req send successfully');
  });

  it('sends an "ignore" request successfully', async () => {
    const sender = await createUser();
    const receiver = await createUser();

    const res = await request(app)
      .post(`/reqs/send/ignore/${receiver.user._id}`)
      .set('Cookie', sender.cookie);

    expect(res.status).toBe(200);
  });

  it('rejects an invalid status', async () => {
    const sender = await createUser();
    const receiver = await createUser();

    const res = await request(app)
      .post(`/reqs/send/maybe/${receiver.user._id}`)
      .set('Cookie', sender.cookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid status/);
  });

  it('prevents sending a request to yourself', async () => {
    const sender = await createUser();

    const res = await request(app)
      .post(`/reqs/send/interested/${sender.user._id}`)
      .set('Cookie', sender.cookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/yourself/);
  });

  it('prevents duplicate requests', async () => {
    const sender = await createUser();
    const receiver = await createUser();

    await request(app)
      .post(`/reqs/send/interested/${receiver.user._id}`)
      .set('Cookie', sender.cookie);

    const res = await request(app)
      .post(`/reqs/send/interested/${receiver.user._id}`)
      .set('Cookie', sender.cookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/);
  });

  it('rejects an unauthenticated request (no cookie)', async () => {
    const receiver = await createUser();

    const res = await request(app)
      .post(`/reqs/send/interested/${receiver.user._id}`);

    // Middleware should block unauthenticated access
    expect(res.status).toBe(401);
  });
});

// ── PATCH /reqs/review/:status/:reqid ────────────────────
describe('PATCH /reqs/review/:status/:reqid', () => {
  // Helper: sender sends an "interested" req → returns reqId
  async function seedReq(sender, receiver) {
    await request(app)
      .post(`/reqs/send/interested/${receiver.user._id}`)
      .set('Cookie', sender.cookie);

    // Fetch the req id via the received-reqs endpoint
    const recsRes = await request(app)
      .get('/user/reqs/received')
      .set('Cookie', receiver.cookie);

    return recsRes.body.reqs[0]._id;
  }

  it('allows the receiver to accept a request', async () => {
    const sender = await createUser();
    const receiver = await createUser();
    const reqId = await seedReq(sender, receiver);

    const res = await request(app)
      .patch(`/reqs/review/accepted/${reqId}`)
      .set('Cookie', receiver.cookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('accepted');
  });

  it('allows the receiver to reject a request', async () => {
    const sender = await createUser();
    const receiver = await createUser();
    const reqId = await seedReq(sender, receiver);

    const res = await request(app)
      .patch(`/reqs/review/rejected/${reqId}`)
      .set('Cookie', receiver.cookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('rejected');
  });

  it('allows withdrawing a sent request', async () => {
    const sender = await createUser();
    const receiver = await createUser();
    const reqId = await seedReq(sender, receiver);

    // Withdraw can be done by sender using the same endpoint
    const res = await request(app)
      .patch(`/reqs/review/withdraw/${reqId}`)
      .set('Cookie', sender.cookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('withdrawn');
  });

  it('rejects an invalid review status', async () => {
    const sender = await createUser();
    const receiver = await createUser();
    const reqId = await seedReq(sender, receiver);

    const res = await request(app)
      .patch(`/reqs/review/maybe/${reqId}`)
      .set('Cookie', receiver.cookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid status/);
  });

  it('returns an error for a non-existent request id', async () => {
    const receiver = await createUser();

    const res = await request(app)
      .patch('/reqs/review/accepted/000000000000000000000000')
      .set('Cookie', receiver.cookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Req not found/);
  });
});