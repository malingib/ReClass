import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // teacher_attendance table does not exist in the schema — return empty
  return { attendance: [] };
};
