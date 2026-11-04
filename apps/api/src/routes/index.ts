import { Router } from 'express';
import { applicationsRouter } from './applications.js';
import { authRouter } from './auth.js';
import { meRouter } from './me.js';

export const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

router.use('/auth', authRouter);
router.use('/me', meRouter);
router.use('/applications', applicationsRouter);

// Mount feature routers here as stories are implemented (see docs/architecture/api.md):
// router.use('/projects', projectsRouter);
// router.use('/roles', rolesRouter);
// router.use('/applications', applicationsRouter);
