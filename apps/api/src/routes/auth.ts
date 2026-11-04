import { Router } from 'express';
import { loginSchema, registerSchema } from '@devmatch/shared';
import { SESSION_COOKIE, requireAuth, sessionCookieOptions } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { toUserDto } from '../serializers/user.js';
import * as auth from '../services/auth.js';

// ADR-0006 — POST /auth/register, /login, /logout (docs/architecture/api.md).
export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), async (req, res) => {
  const { user, session } = await auth.register(req.body);
  res.cookie(SESSION_COOKIE, session.id, sessionCookieOptions).status(201).json({ user: toUserDto(user) });
});

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  const { user, session } = await auth.login(req.body);
  res.cookie(SESSION_COOKIE, session.id, sessionCookieOptions).json({ user: toUserDto(user) });
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  await auth.logout(req.cookies[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions, maxAge: undefined }).status(204).end();
});
