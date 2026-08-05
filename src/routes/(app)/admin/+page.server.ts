import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

// /admin is a pure module launcher — the school-wide dashboard was removed
// (domains own their dashboards). Send the user to the module picker.
export const load: PageServerLoad = async () => {
  redirect(303, '/admin/modules');
};
