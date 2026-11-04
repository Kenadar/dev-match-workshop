import type { approveApplication } from '../services/applications.js';

type Approved = Awaited<ReturnType<typeof approveApplication>>;

/** POST /applications/:id/approve response (api.md example): the application, the candidate's Telegram, the new counter. */
export function toApprovedDto({ application, role }: Approved) {
  const { role: _role, ...rest } = application;
  return {
    application: rest,
    applicantTelegram: application.telegram, // US-06 AC: revealed to the lead after approval
    role: { id: role.id, availableSpots: role.availableSpots, status: role.status },
  };
}
