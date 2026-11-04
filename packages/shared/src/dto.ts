import type { ApplicationStatus, ProjectStatus, RoleStatus } from './enums.js';

// Response shapes — docs/architecture/api.md → "DTO". Keep in sync with the document.

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  telegram: string | null;
}

export interface RoleDto {
  id: string;
  name: string;
  totalSpots: number;
  availableSpots: number;
  status: RoleStatus;
}

/** Public catalog card (US-09). */
export interface ProjectCardDto {
  id: string;
  title: string;
  excerpt: string; // ≤ 150 chars
  tags: string[];
  publishedAt: string | null;
  openSpots: number;
}

/** Public project page (US-11). Never contains the owner's telegram. */
export interface ProjectDto {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: ProjectStatus;
  createdAt: string;
  publishedAt: string | null;
  owner: { id: string; displayName: string };
  roles: RoleDto[];
}

/** Owner's view of an application (US-05). applicantTelegram only when APPROVED (US-06 AC). */
export interface ApplicationForOwnerDto {
  id: string;
  role: { id: string; name: string };
  applicant: { id: string; displayName: string };
  githubUrl: string;
  comment: string | null;
  status: ApplicationStatus;
  createdAt: string;
  applicantTelegram?: string;
}

/** POST /applications/:id/approve (US-06): the decision, the candidate's Telegram, the new role counter. */
export interface ApproveApplicationResponseDto {
  application: { id: string; status: ApplicationStatus; decidedAt: string | null };
  applicantTelegram: string;
  role: { id: string; availableSpots: number; status: RoleStatus };
}

/** Student's view (US-13, US-14). leadTelegram is absent unless APPROVED. */
export interface MyApplicationDto {
  id: string;
  project: { id: string; title: string };
  role: { id: string; name: string };
  status: ApplicationStatus;
  createdAt: string;
  leadTelegram?: string;
}
