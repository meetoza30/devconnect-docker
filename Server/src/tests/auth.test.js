import request from 'supertest';
import app from '../../app.js'
import { connect, closeDatabase, clearDatabase } from './setup.js';
import nodemailer from 'nodemailer';

// Mock nodemailer so forgotPassword never hits a real SMTP server.
// We capture sendMail so we can assert it was called correctly.
// jest.mock('nodemailer');
// const sendMailMock = jest.fn((opts, cb) => cb(null, { response: 'ok' }));
// nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

const validUser = {
  fullName: 'Alice Dev',
  emailId: 'alice@example.com',
  userName: 'alicedev',
  age: 21,
  gradYear: 2025,
  gender: 'female',
  password: 'StrongPass123!',
  skills: ['JavaScript', 'React', 'Node.js'],
  bio: 'I love building things.',
  socials: { github: 'https://github.com/alice' },
};

beforeAll(async () => await connect());
afterAll(async () => await closeDatabase());
afterEach(async () => await clearDatabase());

// ── POST /signup ──────────────────────────────────────────
describe('POST /signup', () => {
  it('creates a new user and returns a token cookie', async () => {
    const res = await request(app).post('/signup').send(validUser);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User saved successfully');
    expect(res.body.user.emailId).toBe(validUser.emailId);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/signup').send(validUser);
    const res = await request(app).post('/signup').send(validUser);
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    const { password, ...noPass } = validUser;
    const res = await request(app).post('/signup').send(noPass);
    expect(res.status).toBe(400);
  });
});

// ── POST /login ───────────────────────────────────────────
describe('POST /login', () => {
  beforeEach(async () => {
    await request(app).post('/signup').send(validUser);
  });

  it('returns a token on valid credentials', async () => {
    const res = await request(app).post('/login').send({
      emailId: validUser.emailId,
      password: validUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login Successfully!!');
    expect(res.body.token).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/login').send({
      emailId: validUser.emailId,
      password: 'WrongPassword!',
    });
    expect(res.body.error).toBe('Invalid Credentials');
  });

  it('rejects non-existent email', async () => {
    const res = await request(app).post('/login').send({
      emailId: 'ghost@example.com',
      password: 'irrelevant',
    });
    expect(res.body.error).toBe('Invalid Credentials');
  });
});

// ── POST /google/login ────────────────────────────────────
// describe('POST /google/login', () => {
//   const googlePayload = {
//     fullName: 'Bob Google',
//     emailId: 'bob@gmail.com',
//     _id: 'googleOAuthUid123',
//     userName: 'bobgoogle',
//   };

//   it('creates a new Google user on first login', async () => {
//     const res = await request(app).post('/google/login').send(googlePayload);

//     expect(res.status).toBe(200);
//     expect(res.body.existing).toBe(false);
//     expect(res.body.user.emailId).toBe(googlePayload.emailId);
//   });

//   it('recognises an existing Google user on second login', async () => {
//     await request(app).post('/google/login').send(googlePayload);
//     const res = await request(app).post('/google/login').send(googlePayload);
//     expect(res.body.existing).toBe(true);
//   });
// });

// ── POST /forgotPassword ──────────────────────────────────
// describe('POST /forgotPassword', () => {
//   beforeEach(async () => {
//     await request(app).post('/signup').send(validUser);
//     sendMailMock.mockClear();
//   });

//   it('sends a reset email for an existing user', async () => {
//     const res = await request(app)
//       .post('/forgotPassword')
//       .send({ emailId: validUser.emailId });

//     expect(res.body.message).toBe('Email sent');
//     expect(sendMailMock).toHaveBeenCalledTimes(1);
//     expect(sendMailMock.mock.calls[0][0].to).toBe(validUser.emailId);
//   });

//   it('returns a user-not-found message for unknown email', async () => {
//     const res = await request(app)
//       .post('/forgotPassword')
//       .send({ emailId: 'nobody@example.com' });

//     expect(res.body.message).toBe("User doesnt exist");
//     expect(sendMailMock).not.toHaveBeenCalled();
//   });
// });

// // ── PATCH /resetPassword/:token/:id ──────────────────────
// describe('PATCH /resetPassword/:token/:id', () => {
//   it('resets the password with a valid token', async () => {
//     const signupRes = await request(app).post('/signup').send(validUser);
//     const { token } = signupRes.body;
//     const userId = signupRes.body.user._id;

//     const res = await request(app)
//       .patch(`/resetPassword/${token}/${userId}`)
//       .send({ password: 'NewPassword456!' });

//     expect(res.body.message).toBe('Success');

//     // Confirm the new password works
//     const loginRes = await request(app).post('/login').send({
//       emailId: validUser.emailId,
//       password: 'NewPassword456!',
//     });
//     expect(loginRes.body.message).toBe('Login Successfully!!');
//   });

//   it('fails with an invalid token', async () => {
//     const res = await request(app)
//       .patch('/resetPassword/badtoken/000000000000000000000000')
//       .send({ password: 'anything' });
//     expect(res.body.message).toBe('Failure');
//   });
// });

// ── POST /logout ──────────────────────────────────────────
describe('POST /logout', () => {
  it('clears the token cookie and returns success', async () => {
    const res = await request(app).post('/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const cookies = res.headers['set-cookie'] || [];
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toMatch(/token=;/);
  });
});

// ── GET /check-auth ───────────────────────────────────────
// describe('GET /check-auth', () => {
//   it('returns status false when no cookie is set', async () => {
//     const res = await request(app).get('/check-auth');
//     expect(res.body.status).toBe(false);
//   });

//   it('returns status true when a valid cookie is present', async () => {
//     await request(app).post('/signup').send(validUser);
//     const loginRes = await request(app).post('/login').send({
//       emailId: validUser.emailId,
//       password: validUser.password,
//     });
//     const cookie = loginRes.headers['set-cookie'];

//     const res = await request(app)
//       .get('/check-auth')
//       .set('Cookie', cookie);

//     expect(res.body.status).toBe(true);
//   });
// });