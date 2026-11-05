import request from 'supertest';
import { MESSAGES } from '@devmatch/shared';
import { createApp } from '../src/app.js';
import { prisma, resetDb } from './helpers/db.js';
import { createProject, createRole, createUser, signedIn } from './helpers/factories.js';

// US-02 create a project, US-03 add a role, US-04 publish — POST /api/projects, /:id/roles, /:id/publish
// (docs/US-INIT-1.md, traceability rows US-02..US-04).

beforeEach(resetDb);

const validProject = {
  title: 'DevMatch — платформа пошуку команд',
  description: 'Сервіс для спрощення збору студентських команд на хакатони та курсові роботи.',
  tags: ['Java', 'Spring Boot', 'React', 'PostgreSQL'],
};

/** A lead with a Telegram contact (US-01 done), signed in. */
async function lead() {
  const user = await createUser({ telegram: '@orest_lead' });
  return { user, agent: await signedIn(user) };
}

async function projectStatus(id: string) {
  return (await prisma.project.findUniqueOrThrow({ where: { id } })).status;
}

describe('US-02 POST /api/projects', () => {
  it('US-02 sc.1 valid title, description and stack → 201, status DRAFT, the creator is the owner', async () => {
    const { user, agent } = await lead();

    const res = await agent.post('/api/projects').send(validProject);

    expect(res.status).toBe(201);
    expect(res.body.project).toMatchObject({
      title: validProject.title,
      description: validProject.description,
      status: 'DRAFT',
      publishedAt: null,
      owner: { id: user.id },
      roles: [],
    });
    expect([...res.body.project.tags].sort()).toEqual([...validProject.tags].sort());
    expect(await prisma.project.findUniqueOrThrow({ where: { id: res.body.project.id } })).toMatchObject({ ownerId: user.id, status: 'DRAFT' });
  });

  it('US-02 sc.2 description shorter than 30 characters → 400 on the description field, nothing saved', async () => {
    const { agent } = await lead();

    const res = await agent.post('/api/projects').send({ ...validProject, description: 'Крутий проєкт' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual({ description: MESSAGES.projectDescription });
    expect(await prisma.project.count()).toBe(0);
  });

  it.each([
    ['title shorter than 5', { title: 'Dev' }, 'title', MESSAGES.projectTitle],
    ['no tags', { tags: [] }, 'tags', MESSAGES.projectTags],
    ['11 tags', { tags: Array.from({ length: 11 }, (_, i) => `tag${i}`) }, 'tags', MESSAGES.projectTags],
  ])('US-02 AC 1 %s → 400 on the field, nothing saved', async (_case, patch, field, message) => {
    const { agent } = await lead();

    const res = await agent.post('/api/projects').send({ ...validProject, ...patch });

    expect(res.status).toBe(400);
    expect(res.body.error.details[field]).toBe(message);
    expect(await prisma.project.count()).toBe(0);
  });

  it('US-02 a lead without a Telegram contact → 400 PROFILE_INCOMPLETE, nothing saved', async () => {
    const agent = await signedIn(await createUser());

    const res = await agent.post('/api/projects').send(validProject);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PROFILE_INCOMPLETE');
    expect(await prisma.project.count()).toBe(0);
  });

  it('US-02 tags are stored normalized for the filter (US-10); the same tag in another case is kept once', async () => {
    const { agent } = await lead();

    const res = await agent.post('/api/projects').send({ ...validProject, tags: ['Java', 'JAVA', ' Spring  Boot '] });

    expect(res.status).toBe(201);
    expect([...res.body.project.tags].sort()).toEqual(['Java', 'Spring  Boot']);
    const stored = await prisma.projectTag.findMany({ where: { projectId: res.body.project.id }, orderBy: { tag: 'asc' } });
    expect(stored.map((t) => t.tag)).toEqual(['java', 'spring boot']);
  });

  it('US-02 the response never contains the owner Telegram or password hash', async () => {
    const { agent } = await lead();

    const res = await agent.post('/api/projects').send(validProject);

    expect(Object.keys(res.body.project.owner).sort()).toEqual(['displayName', 'id']);
    expect(JSON.stringify(res.body)).not.toContain('@orest_lead');
  });

  it('US-02 without a session → 401 UNAUTHENTICATED', async () => {
    const res = await request(createApp()).post('/api/projects').send(validProject);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('US-03 POST /api/projects/:id/roles', () => {
  async function draft() {
    const { user, agent } = await lead();
    const project = await createProject({ ownerId: user.id, status: 'DRAFT' });
    return { user, agent, project };
  }

  it('US-03 sc.1 "Frontend Developer", 1 spot on a DRAFT project → 201, 1 of 1 spots free', async () => {
    const { agent, project } = await draft();

    const res = await agent.post(`/api/projects/${project.id}/roles`).send({ name: 'Frontend Developer', totalSpots: 1 });

    expect(res.status).toBe(201);
    expect(res.body.role).toEqual({ id: expect.any(String), name: 'Frontend Developer', totalSpots: 1, availableSpots: 1, status: 'OPEN' });
  });

  it.each([0, -2, 1.5, 6])('US-03 sc.2 %s spots → 400 on the totalSpots field, no role added', async (totalSpots) => {
    const { agent, project } = await draft();

    const res = await agent.post(`/api/projects/${project.id}/roles`).send({ name: 'QA Engineer', totalSpots });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({ totalSpots: MESSAGES.roleSpots });
    expect(await prisma.role.count()).toBe(0);
  });

  it.each(['QA Engineer', 'qa engineer'])('US-03 sc.3 the role already exists ("%s") → 409 DUPLICATE_ROLE, still one role', async (name) => {
    const { agent, project } = await draft();
    await createRole({ projectId: project.id, name: 'QA Engineer', totalSpots: 1 });

    const res = await agent.post(`/api/projects/${project.id}/roles`).send({ name, totalSpots: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ROLE');
    expect(await prisma.role.count({ where: { projectId: project.id } })).toBe(1);
  });

  it('US-03 AC 2 several different roles can be added to one project', async () => {
    const { agent, project } = await draft();

    await agent.post(`/api/projects/${project.id}/roles`).send({ name: 'Backend', totalSpots: 2 });
    const res = await agent.post(`/api/projects/${project.id}/roles`).send({ name: 'Frontend', totalSpots: 1 });

    expect(res.status).toBe(201);
    expect(await prisma.role.count({ where: { projectId: project.id } })).toBe(2);
  });

  it('US-03 AC 4 a PUBLISHED project accepts new roles', async () => {
    const { user, agent } = await lead();
    const project = await createProject({ ownerId: user.id, status: 'PUBLISHED' });

    const res = await agent.post(`/api/projects/${project.id}/roles`).send({ name: 'Designer', totalSpots: 1 });

    expect(res.status).toBe(201);
  });

  it('US-03 AC 4 a CLOSED project → 409 INVALID_STATUS, no role added', async () => {
    const { user, agent } = await lead();
    const project = await createProject({ ownerId: user.id, status: 'CLOSED' });

    const res = await agent.post(`/api/projects/${project.id}/roles`).send({ name: 'Designer', totalSpots: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS');
    expect(await prisma.role.count()).toBe(0);
  });

  it('US-03 AC 4 a user who does not own the project → 403 FORBIDDEN, no role added', async () => {
    const { project } = await draft();
    const stranger = await signedIn(await createUser());

    const res = await stranger.post(`/api/projects/${project.id}/roles`).send({ name: 'Designer', totalSpots: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await prisma.role.count()).toBe(0);
  });

  it('US-03 unknown project → 404 NOT_FOUND', async () => {
    const { agent } = await lead();

    const res = await agent.post('/api/projects/missing/roles').send({ name: 'Designer', totalSpots: 1 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('US-04 POST /api/projects/:id/publish', () => {
  it('US-04 sc.1 a DRAFT project with a role → 200, PUBLISHED, publishedAt set', async () => {
    const { user, agent } = await lead();
    const project = await createProject({ ownerId: user.id, status: 'DRAFT' });
    await createRole({ projectId: project.id, name: 'Backend', totalSpots: 1 });

    const res = await agent.post(`/api/projects/${project.id}/publish`);

    expect(res.status).toBe(200);
    expect(res.body.project.status).toBe('PUBLISHED');
    expect(Date.parse(res.body.project.publishedAt)).not.toBeNaN();
    expect(res.body.project.roles).toHaveLength(1);
    expect(await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).toMatchObject({ status: 'PUBLISHED', publishedAt: expect.any(Date) });
  });

  it('US-04 sc.2 a DRAFT project without roles → 400 NO_ROLES, stays DRAFT', async () => {
    const { user, agent } = await lead();
    const project = await createProject({ ownerId: user.id, status: 'DRAFT' });

    const res = await agent.post(`/api/projects/${project.id}/publish`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'NO_ROLES', message: 'Cannot publish a project without open roles. Add at least one role' });
    expect(await projectStatus(project.id)).toBe('DRAFT');
  });

  it('US-04 AC 2 an already PUBLISHED project → 409 INVALID_STATUS', async () => {
    const { user, agent } = await lead();
    const project = await createProject({ ownerId: user.id, status: 'PUBLISHED' });
    await createRole({ projectId: project.id });

    const res = await agent.post(`/api/projects/${project.id}/publish`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('US-04 a user who does not own the project → 403 FORBIDDEN, stays DRAFT', async () => {
    const { user } = await lead();
    const project = await createProject({ ownerId: user.id, status: 'DRAFT' });
    await createRole({ projectId: project.id });
    const stranger = await signedIn(await createUser());

    const res = await stranger.post(`/api/projects/${project.id}/publish`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await projectStatus(project.id)).toBe('DRAFT');
  });

  it('US-04 unknown project → 404 NOT_FOUND', async () => {
    const { agent } = await lead();

    const res = await agent.post('/api/projects/missing/publish');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('US-04 without a session → 401 UNAUTHENTICATED', async () => {
    const res = await request(createApp()).post('/api/projects/any/publish');

    expect(res.status).toBe(401);
  });
});
