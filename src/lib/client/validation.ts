import { z } from 'zod/v3';

export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData
): { success: true; data: z.output<T> } | { success: false; errors: Record<string, string[]> } {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  const r = schema.safeParse(obj);
  if (r.success) return { success: true, data: r.data };
  const errors: Record<string, string[]> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.');
    (errors[key] ??= []).push(issue.message);
  }
  return { success: false, errors };
}
