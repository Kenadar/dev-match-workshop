import type { ZodTypeAny } from 'zod';

/** Client-side check with the same shared schema the API uses: { field: first message } or null when valid. */
export function fieldErrors(schema: ZodTypeAny, values: unknown): Record<string, string> | null {
  const result = schema.safeParse(values);
  if (result.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) errors[issue.path.join('.') || '_'] ??= issue.message;
  return errors;
}
