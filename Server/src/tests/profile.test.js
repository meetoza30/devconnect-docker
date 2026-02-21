// tests/profile.test.js
// Tests for: PATCH /profile/edit, /profile/upload, /profile/edit/password
//            GET  /profile/view, /profile/user/:userId
//            POST /profile/add/hackathon, /profile/add/project
//            PATCH /hackathon-edit/:id, /project-edit/:id
//            DELETE /remove-project/:id, /remove-hackathon/:id

import request from 'supertest';
import app from '../../app.js'
import { connect, closeDatabase, clearDatabase } from './setup.js';
import path from 'path';

// We mock multer/cloudinary so file uploads don't need a real cloud bucket.
// Adjust the mock path to wherever your multer config lives.
// jest.mock('../utils/multer.js', () => {
//   const multer = require('multer');
//   // Use memoryStorage so we can pass Buffer data in tests
//   const storage = multer.memoryStorage();
//   const upload = multer({ storage });
//   upload.single = (field) => (req, _res, next) => {
//     if (req.file === undefined) {
//       // Attach a fake file so the route handler doesn't throw
//       req.file = {
//         fieldname: field,
//         originalname: 'avatar.png',
//         mimetype: 'image/png',
//         path: 'https://fake-cdn.example.com/avatar.png',
//         size: 1024,
//       };
//     }
//     next();
//   };
//   return upload;
// });

async function createAndLoginUser(overrides = {}) {
  const base = {
    fullName: 'Profile Tester',
    emailId: `profile_${Date.now()}_${Math.random()}@test.com`,
    userName: `profuser_${Date.now()}`,
    age: 23,
    gradYear: 2026,
    gender: 'female',
    password: 'ProfilePass1!',
    skills: ['Python', 'FastAPI', 'Redis'],
    bio: 'Building cool stuff',
    socials: { linkedin: 'https://linkedin.com/in/test' },
    ...overrides,
  };
  const res = await request(app).post('/signup').send(base);
  return { cookie: res.headers['set-cookie'], user: res.body.user };
}

beforeAll(async () => await connect());
afterAll(async () => await closeDatabase());
afterEach(async () => await clearDatabase());

// ── GET /profile/view ─────────────────────────────────────
describe('GET /profile/view', () => {
  it('returns the logged-in user profile', async () => {
    const { cookie, user } = await createAndLoginUser();

    const res = await request(app)
      .get('/profile/view')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.emailId).toBe(user.emailId);
  });

  it('blocks unauthenticated requests', async () => {
    const res = await request(app).get('/profile/view');
    expect(res.status).toBe(401);
  });
});

// ── GET /profile/user/:userId ─────────────────────────────
describe('GET /profile/user/:userId', () => {
  it('returns another user profile by id', async () => {
    const viewer = await createAndLoginUser();
    const target = await createAndLoginUser();

    const res = await request(app)
      .get(`/profile/user/${target.user._id}`)
      .set('Cookie', viewer.cookie);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(target.user._id);
  });
});

// ── PATCH /profile/edit ───────────────────────────────────
// describe('PATCH /profile/edit', () => {
//   it('updates allowed profile fields', async () => {
//     const { cookie } = await createAndLoginUser();

//     const res = await request(app)
//       .patch('/profile/edit')
//       .set('Cookie', cookie)
//       .send({ bio: 'Updated bio', skills: ['Rust', 'WASM', 'TypeScript'] });

//     expect(res.status).toBe(200);
//     expect(res.body.bio).toBe('Updated bio');
//   });

//   it('rejects when skill count exceeds 15', async () => {
//     const { cookie } = await createAndLoginUser();
//     const tooManySkills = Array.from({ length: 16 }, (_, i) => `Skill${i}`);

//     const res = await request(app)
//       .patch('/profile/edit')
//       .set('Cookie', cookie)
//       .send({ skills: tooManySkills });

//     expect(res.text).toMatch(/15 skills/);
//   });

//   it('rejects when skill count is below 3', async () => {
//     const { cookie } = await createAndLoginUser();

//     const res = await request(app)
//       .patch('/profile/edit')
//       .set('Cookie', cookie)
//       .send({ skills: ['OnlyOne'] });

//     expect(res.text).toMatch(/minimum 3/);
//   });
// });

// ── PATCH /profile/edit/password ──────────────────────────
// describe('PATCH /profile/edit/password', () => {
//   it('updates the password and old password stops working', async () => {
//     const { cookie, user } = await createAndLoginUser();

//     const editRes = await request(app)
//       .patch('/profile/edit/password')
//       .set('Cookie', cookie)
//       .send({ password: 'NewSecurePass99!' });

//     expect(editRes.status).toBe(200);

//     // Old password should now be invalid
//     const loginOld = await request(app).post('/login').send({
//       emailId: user.emailId,
//       password: 'ProfilePass1!',
//     });
//     expect(loginOld.body.error).toBe('Invalid Credentials');

//     // New password should work
//     const loginNew = await request(app).post('/login').send({
//       emailId: user.emailId,
//       password: 'NewSecurePass99!',
//     });
//     expect(loginNew.body.message).toBe('Login Successfully!!');
//   });
// });

// ── POST /profile/add/hackathon ───────────────────────────
describe('POST /profile/add/hackathon', () => {
  const hackathon = {
    hackathon: {
      name: 'HackMIT',
      description: 'Top hackathon',
      date: '2024-10-01',
      role: 'Developer',
      outcome: 'Winner',
    },
  };

  it('adds a hackathon to the user profile', async () => {
    const { cookie } = await createAndLoginUser();

    const res = await request(app)
      .post('/profile/add/hackathon')
      .set('Cookie', cookie)
      .send(hackathon);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('HackMIT');
  });
});

// ── POST /profile/add/project ─────────────────────────────
describe('POST /profile/add/project', () => {
  const project = {
    title: 'DevConnect',
    description: 'Developer networking app',
    url: 'https://github.com/test/devconnect',
    techStack: ['Node.js', 'React'],
    startDate: '2024-01-01',
    endDate: '2024-06-01',
  };

  it('adds a project to the user profile', async () => {
    const { cookie } = await createAndLoginUser();

    const res = await request(app)
      .post('/profile/add/project')
      .set('Cookie', cookie)
      .send(project);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('DevConnect');
  });
});

// ── PATCH /hackathon-edit/:hackathonId ────────────────────
// describe('PATCH /hackathon-edit/:hackathonId', () => {
//   it('edits an existing hackathon', async () => {
//     const { cookie } = await createAndLoginUser();

//     // Create first
//     const createRes = await request(app)
//       .post('/profile/add/hackathon')
//       .set('Cookie', cookie)
//       .send({
//         hackathon: {
//           name: 'OldName',
//           description: 'desc',
//           date: '2024-01-01',
//           role: 'Dev',
//           outcome: 'Finalist',
//         },
//       });

//     const hackathonId = createRes.body._id;

//     const res = await request(app)
//       .patch(`/hackathon-edit/${hackathonId}`)
//       .set('Cookie', cookie)
//       .send({ name: 'NewName' });

//     expect(res.status).toBe(200);
//     expect(res.body.name).toBe('NewName');
//   });
// });

// ── PATCH /project-edit/:projectId ───────────────────────
// describe('PATCH /project-edit/:projectId', () => {
//   it('edits an existing project', async () => {
//     const { cookie } = await createAndLoginUser();

//     const createRes = await request(app)
//       .post('/profile/add/project')
//       .set('Cookie', cookie)
//       .send({
//         title: 'Old Title',
//         description: 'desc',
//         url: 'https://example.com',
//         techStack: ['React'],
//         startDate: '2024-01-01',
//         endDate: '2024-03-01',
//       });

//     const projectId = createRes.body._id;

//     const res = await request(app)
//       .patch(`/project-edit/${projectId}`)
//       .set('Cookie', cookie)
//       .send({ title: 'New Title' });

//     expect(res.status).toBe(200);
//     expect(res.body.title).toBe('New Title');
//   });

//   it('returns 404 for a project that does not belong to the user', async () => {
//     const owner = await createAndLoginUser();
//     const other = await createAndLoginUser();

//     const createRes = await request(app)
//       .post('/profile/add/project')
//       .set('Cookie', owner.cookie)
//       .send({
//         title: 'Owner Project',
//         description: 'desc',
//         url: 'https://example.com',
//         techStack: ['Vue'],
//         startDate: '2024-01-01',
//         endDate: '2024-03-01',
//       });

//     const projectId = createRes.body._id;

//     const res = await request(app)
//       .patch(`/project-edit/${projectId}`)
//       .set('Cookie', other.cookie)  // wrong user
//       .send({ title: 'Hijacked!' });

//     expect(res.status).toBe(404);
//   });
// });

// ── DELETE /remove-project/:projectId ─────────────────────
// describe('DELETE /remove-project/:projectId', () => {
//   it('deletes a project and removes it from the user document', async () => {
//     const { cookie } = await createAndLoginUser();

//     const createRes = await request(app)
//       .post('/profile/add/project')
//       .set('Cookie', cookie)
//       .send({
//         title: 'To Delete',
//         description: 'bye',
//         url: 'https://example.com',
//         techStack: ['Svelte'],
//         startDate: '2024-01-01',
//         endDate: '2024-02-01',
//       });

//     const projectId = createRes.body._id;

//     const deleteRes = await request(app)
//       .delete(`/remove-project/${projectId}`)
//       .set('Cookie', cookie);

//     expect(deleteRes.status).toBe(200);
//     expect(deleteRes.body.message).toBe('Project deleted successfully');

//     // Verify it's gone from the profile
//     const profile = await request(app)
//       .get('/profile/view')
//       .set('Cookie', cookie);

//     const stillExists = profile.body.projects.some(p =>
//       (p._id || p).toString() === projectId
//     );
//     expect(stillExists).toBe(false);
//   });
// });

// ── DELETE /remove-hackathon/:hackathonId ──────────────────
// describe('DELETE /remove-hackathon/:hackathonId', () => {
//   it('deletes a hackathon and removes it from the user document', async () => {
//     const { cookie } = await createAndLoginUser();

//     const createRes = await request(app)
//       .post('/profile/add/hackathon')
//       .set('Cookie', cookie)
//       .send({
//         hackathon: {
//           name: 'Gone Hackathon',
//           description: 'bye',
//           date: '2024-05-01',
//           role: 'PM',
//           outcome: 'Participant',
//         },
//       });

//     const hackathonId = createRes.body._id;

//     const deleteRes = await request(app)
//       .delete(`/remove-hackathon/${hackathonId}`)
//       .set('Cookie', cookie);

//     expect(deleteRes.status).toBe(200);
//     expect(deleteRes.body.message).toBe('Hackathon deleted successfully');
//   });
// });