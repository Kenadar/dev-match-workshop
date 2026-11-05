import { Router } from 'express';
import { addRoleSchema, createProjectSchema } from '@devmatch/shared';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { toProjectDto, toRoleDto } from '../serializers/projects.js';
import { addRole, createProject, publishProject } from '../services/projects.js';

// POST /projects (US-02), /projects/:id/roles (US-03), /projects/:id/publish (US-04) — docs/architecture/api.md.
// Owner and status checks are in the service.
export const projectsRouter = Router();

projectsRouter.post('/', requireAuth, validateBody(createProjectSchema), async (req, res) => {
  res.status(201).json({ project: toProjectDto(await createProject(currentUser(req).id, req.body)) });
});

projectsRouter.post('/:id/roles', requireAuth, validateBody(addRoleSchema), async (req, res) => {
  res.status(201).json({ role: toRoleDto(await addRole(String(req.params.id), currentUser(req).id, req.body)) });
});

projectsRouter.post('/:id/publish', requireAuth, async (req, res) => {
  res.json({ project: toProjectDto(await publishProject(String(req.params.id), currentUser(req).id)) });
});
