import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

// Applications: approve (US-06). Counter changes happen in a transaction (ADR-0007).

const withDetails = { applicant: true, role: { include: { project: { include: { owner: true } } } } } as const;

export async function approveApplication(applicationId: string) {
  const application = await prisma.application.findUnique({ where: { id: applicationId }, include: withDetails });
  if (!application) throw new ApiError('NOT_FOUND', 'Application not found');
  if (application.status !== 'PENDING') throw new ApiError('ALREADY_DECIDED', 'This application has already been processed');
  if (application.role.availableSpots <= 0) {
    throw new ApiError('ROLE_FILLED', 'Cannot approve: all spots for this role are already taken');
  }

  const availableSpots = application.role.availableSpots - 1;
  const [approved, role] = await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { status: 'APPROVED', decidedAt: new Date() },
      include: withDetails,
    }),
    prisma.role.update({
      where: { id: application.roleId },
      data: { availableSpots, status: availableSpots === 0 ? 'FILLED' : 'OPEN' }, // US-06 sc.2
    }),
  ]);
  return { application: approved, role };
}
