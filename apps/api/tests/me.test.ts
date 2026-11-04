import request from 'supertest';
import { MESSAGES } from '@devmatch/shared';
import { createApp } from '../src/app.js';
import { prisma, resetDb } from './helpers/db.js';
import { createUser, signedIn } from './helpers/factories.js';

// US-01: Telegram contact on first sign-in — PATCH /api/me (docs/US-INIT-1.md, traceability row US-01).

beforeEach(resetDb);

async function telegramInDb(userId: string) {
  return (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).telegram;
}

describe('US-01 PATCH /api/me', () => {
  it('US-01 sc.1 saves "@orest_lead" as "@orest_lead" and returns the updated user', async () => {
    const user = await createUser();
    const agent = await signedIn(user);

    const res = await agent.patch('/api/me').send({ telegram: '@orest_lead' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, telegram: '@orest_lead' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(await telegramInDb(user.id)).toBe('@orest_lead');
  });

  it('US-01 AC 2 the leading "@" is optional: "orest_lead" is normalized to "@orest_lead"', async () => {
    const user = await createUser();
    const agent = await signedIn(user);

    const res = await agent.patch('/api/me').send({ telegram: ' orest_lead ' });

    expect(res.status).toBe(200);
    expect(await telegramInDb(user.id)).toBe('@orest_lead');
  });

  it('US-01 sc.2 empty contact → 400 VALIDATION_ERROR with the AC message, nothing saved', async () => {
    const user = await createUser();
    const agent = await signedIn(user);

    const res = await agent.patch('/api/me').send({ telegram: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual({ telegram: MESSAGES.telegramRequired });
    expect(await telegramInDb(user.id)).toBeNull();
  });

  it.each(['orest lead!', 'abc'])('US-01 sc.3 invalid username %j → 400 VALIDATION_ERROR, the previous value is kept', async (value) => {
    const user = await createUser({ telegram: '@previous_nick' });
    const agent = await signedIn(user);

    const res = await agent.patch('/api/me').send({ telegram: value });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual({ telegram: MESSAGES.telegramFormat });
    expect(await telegramInDb(user.id)).toBe('@previous_nick');
  });

  it('US-01 AC 3 the contact is bound to the account: GET /me returns it in a new session', async () => {
    const user = await createUser();
    await (await signedIn(user)).patch('/api/me').send({ telegram: 'orest_lead' });

    const res = await (await signedIn(user)).get('/api/me');

    expect(res.body.user.telegram).toBe('@orest_lead');
  });

  it('US-01 without a session → 401 UNAUTHENTICATED, nothing saved', async () => {
    const res = await request(createApp()).patch('/api/me').send({ telegram: 'orest_lead' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
