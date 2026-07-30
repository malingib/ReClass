import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();

  // Ping DB connectivity with a safe count query
  let dbConnected = false;
  try {
    const { error } = await locals.srv
      .from('students')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    if (!error) dbConnected = true;
  } catch {
    // DB unreachable — report status below
  }

  return json({
    status: 'ok',
    uptime: process.uptime(),
    authenticated: !!user,
    db: dbConnected ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
};
