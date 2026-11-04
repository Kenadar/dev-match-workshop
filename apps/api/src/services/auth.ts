import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma, type User } from '@prisma/client';
import type { LoginInput, RegisterInput } from '@devmatch/shared';
import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

// ADR-0006: email + password, server-side sessions in an httpOnly cookie.

const BCRYPT_COST = 10; // risks.md T8: cost ≥ 10
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Compared against when the email is unknown, so both failure paths take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

export interface Session {
  id: string;
  expiresAt: Date;
}

async function createSession(userId: string): Promise<Session> {
  return prisma.session.create({
    data: { id: randomBytes(32).toString('base64url'), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    select: { id: true, expiresAt: true },
  });
}

export async function register(input: RegisterInput): Promise<{ user: User; session: Session }> {
  const emailTaken = new ApiError('EMAIL_TAKEN', 'A user with this email already exists');
  if (await prisma.user.findUnique({ where: { email: input.email } })) throw emailTaken;
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await prisma.user
    .create({ data: { email: input.email, displayName: input.displayName, passwordHash } })
    .catch((err: unknown) => {
      // Two registrations with the same email at once: the unique index decides.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw emailTaken;
      throw err;
    });
  return { user, session: await createSession(user.id) };
}

export async function login(input: LoginInput): Promise<{ user: User; session: Session }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new ApiError('INVALID_CREDENTIALS', 'Invalid email or password');
  return { user, session: await createSession(user.id) };
}

export async function logout(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

/** The user behind a session token, or null when the token is unknown or expired. */
export async function userBySession(sessionId: string): Promise<User | null> {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}
