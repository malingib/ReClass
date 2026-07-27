import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();
  return json({
    status: 'ok',
    uptime: process.uptime(),
    authenticated: !!user,
    timestamp: new Date().toISOString(),
  });
};
