import { z } from 'zod';

// User-facing messages are English translations of the acceptance-criteria texts (docs/US-*.md).

export const MESSAGES = {
  telegramRequired: 'Provide a Telegram contact so the team can reach you', // US-01 sc.2
  telegramFormat: 'Username must be 5–32 characters (Latin letters, digits, _)', // US-01 sc.3
  githubUrl: 'Provide a valid GitHub profile link (https://github.com/your_username)', // US-12 sc.2
  projectTitle: 'Title must be 5–100 characters', // US-02 AC
  projectDescription: 'Description must be informative (30–1000 characters)', // US-02 sc.2
  projectTags: 'Specify 1 to 10 technologies', // US-02 AC
  roleName: 'Role name must be 1–50 characters', // US-03 AC
  roleSpots: 'Number of spots must be a whole number from 1 to 5', // US-03 sc.2
  comment: 'Comment cannot exceed 300 characters', // US-12 AC
} as const;

// --- Telegram (US-01 AC, US-12 AC) ---------------------------------------------------------

const TELEGRAM_RE = /^@?[A-Za-z0-9_]{5,32}$/;

/** Normalizes "name" / "@name" / " @name " to "@name". Returns null when invalid. */
export function normalizeTelegram(raw: string): string | null {
  const trimmed = raw.trim();
  if (!TELEGRAM_RE.test(trimmed)) return null;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export const telegramSchema = z
  .string({ required_error: MESSAGES.telegramRequired })
  .trim()
  .min(1, MESSAGES.telegramRequired)
  .refine((v) => TELEGRAM_RE.test(v), MESSAGES.telegramFormat)
  .transform((v) => normalizeTelegram(v) as string);

// --- GitHub URL (US-12 AC, sc.2) -----------------------------------------------------------

const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);

export function isGithubProfileUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  return url.protocol === 'https:' && GITHUB_HOSTS.has(url.hostname) && url.pathname.length > 1;
}

export const githubUrlSchema = z
  .string({ required_error: MESSAGES.githubUrl })
  .trim()
  .refine(isGithubProfileUrl, MESSAGES.githubUrl);

// --- Tags (US-02 AC, US-10 AC) -------------------------------------------------------------

/** Catalog filtering is case-insensitive (US-10): tags are stored normalized. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

const tagSchema = z.string().trim().min(1).max(30);

// --- Request bodies ------------------------------------------------------------------------

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'), // emails are case-insensitive (one account per address)
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  displayName: z.string().trim().min(2, 'Enter your name (2–50 characters)').max(50),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'), // emails are case-insensitive (one account per address)
  password: z.string().min(1, 'Enter your password'),
});

/** PATCH /me — US-01 */
export const updateProfileSchema = z.object({
  telegram: telegramSchema,
});

/** POST /projects — US-02 */
export const createProjectSchema = z.object({
  title: z.string().trim().min(5, MESSAGES.projectTitle).max(100, MESSAGES.projectTitle),
  description: z
    .string()
    .trim()
    .min(30, MESSAGES.projectDescription)
    .max(1000, MESSAGES.projectDescription),
  tags: z.array(tagSchema, { required_error: MESSAGES.projectTags }).min(1, MESSAGES.projectTags).max(10, MESSAGES.projectTags),
});

/** POST /projects/:id/roles — US-03 */
export const addRoleSchema = z.object({
  name: z.string().trim().min(1, MESSAGES.roleName).max(50, MESSAGES.roleName),
  totalSpots: z
    .number({ invalid_type_error: MESSAGES.roleSpots })
    .int(MESSAGES.roleSpots)
    .min(1, MESSAGES.roleSpots)
    .max(5, MESSAGES.roleSpots),
});

/** POST /roles/:roleId/applications — US-12. Empty telegram means "use the one from my profile". */
export const createApplicationSchema = z.object({
  telegram: z
    .union([telegramSchema, z.literal('').transform(() => undefined), z.undefined()])
    .optional(),
  githubUrl: githubUrlSchema,
  comment: z.string().trim().max(300, MESSAGES.comment).optional(),
});

/** GET /projects?tag= — US-10 */
export const catalogQuerySchema = z.object({
  tag: z.string().trim().max(50).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type AddRoleInput = z.infer<typeof addRoleSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
