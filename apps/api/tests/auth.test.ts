import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, resetDb } from './helpers/db.js';
import { DEFAULT_PASSWORD, createUser, signedIn } from './helpers/factories.js';

// Auth (ADR-0006) — traceability row "Auth": duplicate email → 409; wrong password → 401;
// GET /me without a cookie → 401; passwordHash absent from every response.

beforeEach(resetDb);

describe('POST /api/auth/register', () => {
  it('Auth: registers a user → 201, user DTO without passwordHash, session cookie set', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'Orest@Example.com', password: DEFAULT_PASSWORD, displayName: 'Orest' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(String), email: 'orest@example.com', displayName: 'Orest', telegram: null });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    expect(res.headers['set-cookie']?.[0]).toMatch(/^sid=.+; .*HttpOnly/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'orest@example.com' } });
    expect(stored.passwordHash).not.toBe(DEFAULT_PASSWORD);
  });

  it('Auth: duplicate email (any casing) → 409 EMAIL_TAKEN', async () => {
    await createUser({ email: 'orest@example.com' });
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'OREST@example.com', password: DEFAULT_PASSWORD, displayName: 'Another' });

    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'EMAIL_TAKEN', message: 'A user with this email already exists' });
    expect(await prisma.user.count()).toBe(1);
  });

  it('Auth: short password → 400 VALIDATION_ERROR on the password field', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'a@example.com', password: 'short', displayName: 'Orest' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('password');
  });
});

describe('POST /api/auth/login', () => {
  it('Auth: correct credentials → 200 user, session cookie set', async () => {
    const user = await createUser({ email: 'orest@example.com' });
    const res = await request(createApp()).post('/api/auth/login').send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.headers['set-cookie']?.[0]).toMatch(/^sid=/);
  });

  it('Auth: wrong password → 401 INVALID_CREDENTIALS, no cookie', async () => {
    const user = await createUser();
    const res = await request(createApp()).post('/api/auth/login').send({ email: user.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('Auth: unknown email → the same 401 INVALID_CREDENTIALS (does not reveal which part was wrong)', async () => {
    const res = await request(createApp()).post('/api/auth/login').send({ email: 'nobody@example.com', password: DEFAULT_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /api/me and POST /api/auth/logout', () => {
  it('Auth: GET /me without a cookie → 401 UNAUTHENTICATED', async () => {
    const res = await request(createApp()).get('/api/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'UNAUTHENTICATED', message: 'Sign in to continue' });
  });

  it('Auth: GET /me with a session → the current user without passwordHash', async () => {
    const user = await createUser({ displayName: 'Orest' });
    const agent = await signedIn(user);
    const res = await agent.get('/api/me');

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: user.id, email: user.email, displayName: 'Orest', telegram: null });
  });

  it('Auth: expired session → 401 UNAUTHENTICATED', async () => {
    const user = await createUser();
    const agent = await signedIn(user);
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await agent.get('/api/me')).status).toBe(401);
  });

  it('Auth: logout → 204, only this session is deleted and GET /me is 401 again', async () => {
    const user = await createUser(); // registering already opened one session ("another device")
    const agent = await signedIn(user);
    const before = await prisma.session.count({ where: { userId: user.id } });

    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(before - 1);
    expect((await agent.get('/api/me')).status).toBe(401);
  });
});
