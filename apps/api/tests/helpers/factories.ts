import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from './db.js';

// Factories (docs/architecture/testing.md → "Test database"): defaults are valid, pass only what the scenario cares about.

export const DEFAULT_PASSWORD = 'correct-horse-battery';

let seq = 0;

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/** Registers a user through the real endpoint, so the stored hash is exactly what production stores. */
export async function createUser(overrides: { email?: string; displayName?: string; telegram?: string | null } = {}): Promise<TestUser> {
  seq += 1;
  const email = overrides.email ?? `user${seq}@example.com`;
  const res = await request(createApp())
    .post('/api/auth/register')
    .send({ email, password: DEFAULT_PASSWORD, displayName: overrides.displayName ?? `User ${seq}` });
  if (res.status !== 201) throw new Error(`createUser: register returned ${res.status} ${JSON.stringify(res.body)}`);
  if (overrides.telegram !== undefined) {
    await prisma.user.update({ where: { id: res.body.user.id }, data: { telegram: overrides.telegram } });
  }
  return { id: res.body.user.id, email, password: DEFAULT_PASSWORD };
}

/** A supertest agent that keeps the session cookie, signed in through POST /api/auth/login. */
export async function signedIn(user: TestUser) {
  const agent = request.agent(createApp());
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: user.password });
  if (res.status !== 200) throw new Error(`signedIn: login returned ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}
