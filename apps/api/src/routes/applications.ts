import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { toApprovedDto } from '../serializers/applications.js';
import { approveApplication } from '../services/applications.js';

// POST /applications/:id/approve (US-06) — docs/architecture/api.md.
export const applicationsRouter = Router();

applicationsRouter.post('/:id/approve', requireAuth, async (req, res) => {
  res.json(toApprovedDto(await approveApplication(String(req.params.id))));
});
