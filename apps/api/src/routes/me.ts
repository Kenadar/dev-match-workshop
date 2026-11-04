import { Router } from 'express';
import { updateProfileSchema } from '@devmatch/shared';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { toUserDto } from '../serializers/user.js';
import { updateProfile } from '../services/users.js';

// GET /me (ADR-0006), PATCH /me (US-01) — docs/architecture/api.md.
export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get('/', (req, res) => {
  res.json({ user: toUserDto(currentUser(req)) });
});

meRouter.patch('/', validateBody(updateProfileSchema), async (req, res) => {
  const user = await updateProfile(currentUser(req).id, req.body);
  res.json({ user: toUserDto(user) });
});
