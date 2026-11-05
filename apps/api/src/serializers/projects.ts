import type { Role } from '@prisma/client';
import type { ProjectDto, ProjectStatus, RoleDto, RoleStatus } from '@devmatch/shared';
import type { ProjectWithDetails } from '../services/projects.js';

/** api.md → Role. */
export function toRoleDto(role: Role): RoleDto {
  return {
    id: role.id,
    name: role.name,
    totalSpots: role.totalSpots,
    availableSpots: role.availableSpots,
    status: role.status as RoleStatus,
  };
}

/** api.md → Project. Field by field: the owner is { id, displayName } only — never their Telegram (US-11). */
export function toProjectDto(project: ProjectWithDetails): ProjectDto {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    tags: project.tags.map((t) => t.label),
    status: project.status as ProjectStatus,
    createdAt: project.createdAt.toISOString(),
    publishedAt: project.publishedAt?.toISOString() ?? null,
    owner: { id: project.owner.id, displayName: project.owner.displayName },
    roles: project.roles.map(toRoleDto),
  };
}
