import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { suiteModules } from '$lib/modules';

export const load: PageServerLoad = async () => {
  const active = suiteModules.filter(m => m.status === 'available');
  // Single active module → skip picker & go straight in
  if (active.length === 1 && active[0].href) {
    redirect(303, active[0].href);
  }
  return {};
};
