import type { CookieOptions, RequestHandler } from 'express';
import type { User } from '@prisma/client';
import { ApiError } from '../lib/errors.js';
import { SESSION_TTL_MS, userBySession } from '../services/auth.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by loadUser when the session cookie is valid. */
      user?: User;
    }
  }
}

export const SESSION_COOKIE = 'sid';

// ADR-0006 / ADR-0008: SPA and API share one origin, so SameSite=Lax is enough against CSRF.
export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_MS,
};

/** Resolves the session cookie into req.user. Never rejects: protected routes add requireAuth. */
export const loadUser: RequestHandler = async (req, _res, next) => {
  const sid: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof sid === 'string' && sid) req.user = (await userBySession(sid)) ?? undefined;
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  next(req.user ? undefined : new ApiError('UNAUTHENTICATED', 'Sign in to continue'));
};

/** For handlers behind requireAuth. */
export function currentUser(req: Express.Request): User {
  if (!req.user) throw new ApiError('UNAUTHENTICATED', 'Sign in to continue');
  return req.user;
}
