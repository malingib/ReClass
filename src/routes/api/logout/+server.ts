import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, cookies }) => {
  await locals.supabase.auth.signOut();
  cookies.delete('x-reclass-user', { path: '/' });
  cookies.delete('x-reclass-impersonate', { path: '/' });
  redirect(303, '/login');
};