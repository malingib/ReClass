import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { COOKIE_USER_NAME, COOKIE_IMPERSONATE_NAME, COOKIE_ROLE_NAME } from '$lib/config';

export const GET: RequestHandler = async ({ locals, cookies }) => {
  await locals.supabase.auth.signOut();
  cookies.delete(COOKIE_USER_NAME, { path: '/' });
  cookies.delete(COOKIE_IMPERSONATE_NAME, { path: '/' });
  cookies.delete(COOKIE_ROLE_NAME, { path: '/' });
  redirect(303, '/login');
};