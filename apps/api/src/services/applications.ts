import type { Application, Role } from '@prisma/client';
import { ApplicationStatus, RoleStatus } from '@devmatch/shared';
import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

// Applications: approve (US-06). The only place that changes Role.availableSpots (ADR-0007):
// one interactive transaction, conditional updateMany calls, the counts decide — never a value read earlier.

/** US-06: the project owner approves a PENDING application and takes one spot of its role. */
export async function approveApplication(applicationId: string, userId: string): Promise<{ application: Application; role: Role }> {
  return prisma.$transaction(async (tx) => {
    const application = await tx.application.findUnique({
      where: { id: applicationId },
      select: { roleId: true, role: { select: { project: { select: { ownerId: true } } } } },
    });
    if (!application) throw new ApiError('NOT_FOUND', 'Application not found');
    if (application.role.project.ownerId !== userId) {
      throw new ApiError('FORBIDDEN', 'You are not allowed to manage applications for this project');
    }

    // A3: APPROVED and REJECTED are terminal — only a PENDING row can move.
    const decided = await tx.application.updateMany({
      where: { id: applicationId, status: ApplicationStatus.enum.PENDING },
      data: { status: ApplicationStatus.enum.APPROVED, decidedAt: new Date() },
    });
    if (decided.count === 0) throw new ApiError('ALREADY_DECIDED', 'This application has already been processed');

    const taken = await tx.role.updateMany({
      where: { id: application.roleId, availableSpots: { gt: 0 } },
      data: { availableSpots: { decrement: 1 } },
    });
    // Throwing rolls the transaction back, so the application stays PENDING (US-06 sc.3).
    if (taken.count === 0) throw new ApiError('ROLE_FILLED', 'Cannot approve: all spots for this role are already taken');

    await tx.role.updateMany({
      where: { id: application.roleId, availableSpots: 0 },
      data: { status: RoleStatus.enum.FILLED }, // US-06 sc.2
    });

    return {
      application: await tx.application.findUniqueOrThrow({ where: { id: applicationId } }),
      role: await tx.role.findUniqueOrThrow({ where: { id: application.roleId } }),
    };
  });
}
