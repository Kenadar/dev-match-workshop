import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, resetDb } from './helpers/db.js';
import { createApplication, createProject, createRole, createUser, signedIn } from './helpers/factories.js';

// US-06: approving an application — POST /api/applications/:id/approve (docs/US-INIT-1.md, traceability row US-06).

beforeEach(resetDb);

async function setup(spots: { totalSpots: number; availableSpots: number }) {
  const lead = await createUser({ telegram: '@orest_lead' });
  const student = await createUser({ telegram: '@student_dev' });
  const project = await createProject({ ownerId: lead.id });
  const role = await createRole({ projectId: project.id, name: 'Backend Developer', ...spots });
  const application = await createApplication({ roleId: role.id, applicantId: student.id });
  return { lead, student, role, application, agent: await signedIn(lead) };
}

describe('US-06 POST /api/applications/:id/approve', () => {
  it('US-06 sc.1 approve with free spots → APPROVED, spots 2 → 1, applicant Telegram revealed', async () => {
    const { agent, application, role } = await setup({ totalSpots: 2, availableSpots: 2 });

    const res = await agent.post(`/api/applications/${application.id}/approve`);

    expect(res.status).toBe(200);
    expect(res.body.application.status).toBe('APPROVED');
    expect(res.body.applicantTelegram).toBe('@student_dev');
    expect(res.body.role).toEqual({ id: role.id, availableSpots: 1, status: 'OPEN' });
  });

  it('US-06 sc.2 approve the last spot → spots 0, role FILLED', async () => {
    const { agent, application } = await setup({ totalSpots: 1, availableSpots: 1 });

    const res = await agent.post(`/api/applications/${application.id}/approve`);

    expect(res.status).toBe(200);
    expect(res.body.role).toMatchObject({ availableSpots: 0, status: 'FILLED' });
  });

  it('US-06 sc.3 parallel approves for the last spot → one 200, one 409 ROLE_FILLED, the other stays PENDING', async () => {
    const lead = await createUser();
    const project = await createProject({ ownerId: lead.id });
    const role = await createRole({ projectId: project.id, totalSpots: 1, availableSpots: 1 });
    const first = await createApplication({ roleId: role.id, applicantId: (await createUser()).id });
    const second = await createApplication({ roleId: role.id, applicantId: (await createUser()).id });
    const agent = await signedIn(lead);

    const [a, b] = await Promise.all([
      agent.post(`/api/applications/${first.id}/approve`),
      agent.post(`/api/applications/${second.id}/approve`),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect([a, b].find((r) => r.status === 409)?.body.error.code).toBe('ROLE_FILLED');
    expect(await prisma.application.count({ where: { roleId: role.id, status: 'APPROVED' } })).toBe(1);
    expect(await prisma.application.count({ where: { roleId: role.id, status: 'PENDING' } })).toBe(1);
    expect(await prisma.role.findUniqueOrThrow({ where: { id: role.id } })).toMatchObject({ availableSpots: 0, status: 'FILLED' });
  });

  it('US-06 sc.3 (sequential) approve when no spots are left → 409 ROLE_FILLED, status stays PENDING', async () => {
    const { agent, application } = await setup({ totalSpots: 1, availableSpots: 0 });

    const res = await agent.post(`/api/applications/${application.id}/approve`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROLE_FILLED');
    expect((await prisma.application.findUniqueOrThrow({ where: { id: application.id } })).status).toBe('PENDING');
  });

  it('US-06 AC 5 an already approved application cannot be approved again → 409 ALREADY_DECIDED', async () => {
    const { agent, application } = await setup({ totalSpots: 2, availableSpots: 2 });
    await agent.post(`/api/applications/${application.id}/approve`);

    const res = await agent.post(`/api/applications/${application.id}/approve`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_DECIDED');
  });

  it('US-06 AC 5 a rejected application cannot be approved → 409 ALREADY_DECIDED, counter unchanged', async () => {
    const { agent, student, role } = await setup({ totalSpots: 2, availableSpots: 2 });
    const rejected = await createApplication({ roleId: role.id, applicantId: student.id, status: 'REJECTED' });

    const res = await agent.post(`/api/applications/${rejected.id}/approve`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_DECIDED');
    expect((await prisma.role.findUniqueOrThrow({ where: { id: role.id } })).availableSpots).toBe(2);
  });

  it('US-06 AC 5 the same application approved twice in parallel → one 200, one 409 ALREADY_DECIDED, one spot used', async () => {
    const { agent, application, role } = await setup({ totalSpots: 2, availableSpots: 2 });

    const results = await Promise.all([1, 2].map(() => agent.post(`/api/applications/${application.id}/approve`)));

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await prisma.role.findUniqueOrThrow({ where: { id: role.id } })).availableSpots).toBe(1);
  });

  it('US-06 a user who does not own the project → 403 FORBIDDEN, nothing changes', async () => {
    const { application, role } = await setup({ totalSpots: 2, availableSpots: 2 });
    const stranger = await signedIn(await createUser());

    const res = await stranger.post(`/api/applications/${application.id}/approve`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body).not.toHaveProperty('applicantTelegram');
    expect((await prisma.application.findUniqueOrThrow({ where: { id: application.id } })).status).toBe('PENDING');
    expect((await prisma.role.findUniqueOrThrow({ where: { id: role.id } })).availableSpots).toBe(2);
  });

  it('US-06 the response is exactly the api.md DTO: no passwordHash, email or other Prisma fields', async () => {
    const { agent, application, role } = await setup({ totalSpots: 2, availableSpots: 2 });

    const res = await agent.post(`/api/applications/${application.id}/approve`);

    expect(res.body).toEqual({
      application: { id: application.id, status: 'APPROVED', decidedAt: expect.any(String) },
      applicantTelegram: '@student_dev',
      role: { id: role.id, availableSpots: 1, status: 'OPEN' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|email/);
  });

  it('US-06 unknown application → 404 NOT_FOUND', async () => {
    const { agent } = await setup({ totalSpots: 2, availableSpots: 2 });

    const res = await agent.post('/api/applications/does-not-exist/approve');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('US-06 without a session → 401 UNAUTHENTICATED', async () => {
    const { application } = await setup({ totalSpots: 2, availableSpots: 2 });

    const res = await request(createApp()).post(`/api/applications/${application.id}/approve`);

    expect(res.status).toBe(401);
  });
});
