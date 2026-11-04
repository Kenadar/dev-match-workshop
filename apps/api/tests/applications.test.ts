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

  it('US-06 sc.3 approve when no spots are left → 409 ROLE_FILLED, status stays PENDING', async () => {
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

  it('US-06 unknown application → 404', async () => {
    const { agent } = await setup({ totalSpots: 2, availableSpots: 2 });

    const res = await agent.post('/api/applications/does-not-exist/approve');

    expect(res.status).toBe(404);
  });
});
