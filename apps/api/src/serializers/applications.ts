import type { Application, Role } from '@prisma/client';
import type { ApplicationStatus, ApproveApplicationResponseDto, RoleStatus } from '@devmatch/shared';

/** POST /applications/:id/approve (api.md example): field by field, never a spread Prisma object. */
export function toApprovedDto({ application, role }: { application: Application; role: Role }): ApproveApplicationResponseDto {
  return {
    application: {
      id: application.id,
      status: application.status as ApplicationStatus,
      decidedAt: application.decidedAt?.toISOString() ?? null,
    },
    applicantTelegram: application.telegram, // US-06 AC 4: revealed to the owner once approved
    role: { id: role.id, availableSpots: role.availableSpots, status: role.status as RoleStatus },
  };
}
