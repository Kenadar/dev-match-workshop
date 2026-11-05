import { Prisma, type Role } from '@prisma/client';
import { ProjectStatus, RoleStatus, normalizeTag, type AddRoleInput, type CreateProjectInput } from '@devmatch/shared';
import { ApiError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

// Projects: create (US-02), add a role (US-03), publish (US-04). Owner and status checks live here, not in routes.

const withDetails = {
  owner: true,
  tags: true,
  roles: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ProjectInclude;

export type ProjectWithDetails = Prisma.ProjectGetPayload<{ include: typeof withDetails }>;

/** US-02: a new project is a DRAFT owned by its creator. The lead must have a Telegram contact (US-01). */
export async function createProject(userId: string, input: CreateProjectInput): Promise<ProjectWithDetails> {
  const owner = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!owner.telegram) throw new ApiError('PROFILE_INCOMPLETE', 'Provide a Telegram contact so the team can reach you');

  // Tags are stored normalized for the catalog filter (US-10); the first spelling is kept as the label.
  const tags = new Map<string, string>();
  for (const label of input.tags) {
    const tag = normalizeTag(label);
    if (!tags.has(tag)) tags.set(tag, label);
  }

  return prisma.project.create({
    data: {
      ownerId: userId,
      title: input.title,
      description: input.description,
      status: ProjectStatus.enum.DRAFT,
      tags: { create: [...tags].map(([tag, label]) => ({ tag, label })) },
    },
    include: withDetails,
  });
}

/** US-03: the owner adds a role to a DRAFT or PUBLISHED project; names are unique per project, ignoring case. */
export async function addRole(projectId: string, userId: string, input: AddRoleInput): Promise<Role> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { roles: true } });
  if (!project) throw new ApiError('NOT_FOUND', 'Project not found or it has been deleted');
  if (project.ownerId !== userId) throw new ApiError('FORBIDDEN', 'You are not allowed to manage this project');
  if (project.status !== ProjectStatus.enum.DRAFT && project.status !== ProjectStatus.enum.PUBLISHED) {
    throw new ApiError('INVALID_STATUS', "This action is not available in the project's current status");
  }

  const duplicate = project.roles.some((role) => role.name.toLowerCase() === input.name.toLowerCase());
  if (duplicate) throw new ApiError('DUPLICATE_ROLE', 'This role already exists in the project. Change the number of spots on the existing one');

  try {
    // A new role starts with every spot free (US-03 AC 3). After this, only services/applications changes the counter.
    return await prisma.role.create({
      data: { projectId, name: input.name, totalSpots: input.totalSpots, availableSpots: input.totalSpots },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError('DUPLICATE_ROLE', 'This role already exists in the project. Change the number of spots on the existing one');
    }
    throw err;
  }
}

/** US-04: the owner publishes a DRAFT project that has at least one open role. */
export async function publishProject(projectId: string, userId: string): Promise<ProjectWithDetails> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { roles: true } });
  if (!project) throw new ApiError('NOT_FOUND', 'Project not found or it has been deleted');
  if (project.ownerId !== userId) throw new ApiError('FORBIDDEN', 'You are not allowed to manage this project');
  if (project.status !== ProjectStatus.enum.DRAFT) {
    throw new ApiError('INVALID_STATUS', "This action is not available in the project's current status");
  }

  if (!project.roles.some((role) => role.status === RoleStatus.enum.OPEN)) {
    throw new ApiError('NO_ROLES', 'Cannot publish a project without open roles. Add at least one role');
  }

  // Conditional update: a second publish running in parallel finds no DRAFT row and gets INVALID_STATUS.
  const { count } = await prisma.project.updateMany({
    where: { id: projectId, status: ProjectStatus.enum.DRAFT },
    data: { status: ProjectStatus.enum.PUBLISHED, publishedAt: new Date() },
  });
  if (count === 0) throw new ApiError('INVALID_STATUS', "This action is not available in the project's current status");

  return prisma.project.findUniqueOrThrow({ where: { id: projectId }, include: withDetails });
}
