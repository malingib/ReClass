import { fail } from '@sveltejs/kit';
import { logError } from './log';

/**
 * Terms — canonical per-term model owned by the SIS. A tenant has one
 * `is_current` term at a time; fee obligations and parent balances compute
 * against it. `tenants.current_term_id` mirrors `is_current` for reads that
 * join through the tenant row.
 */
export async function getTerms(sb: App.Locals['srv'], tenantId: string) {
  const { data } = await sb
    .from('terms')
    .select('id, name, start_date, end_date, is_current, created_at')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('start_date', { ascending: false });
  return data ?? [];
}

export async function createTerm(
  sb: App.Locals['srv'],
  tenantId: string,
  input: { name: string; start_date?: string; end_date?: string; make_current: boolean },
) {
  const name = input.name.trim();
  if (!name) return fail(400, { error: 'Term name is required' });
  if (
    input.start_date && input.end_date &&
    new Date(input.end_date) < new Date(input.start_date)
  ) {
    return fail(400, { error: 'End date must be after start date' });
  }

  const { data: term, error: insertErr } = await sb
    .from('terms')
    .insert({
      tenant_id: tenantId,
      name,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      is_current: false,
    })
    .select('id')
    .single();
  if (insertErr) {
    logError('term_create', insertErr, { tenantId, name });
    if (insertErr.code === '23505') {
      return fail(409, { error: 'A term with this name already exists.' });
    }
    return fail(500, { error: 'Failed to create term. Please try again.' });
  }

  if (input.make_current) {
    const r = await setCurrentTerm(sb, tenantId, term.id);
    if ('error' in r) return r;
  }

  return { success: true as const, id: term.id };
}

export async function setCurrentTerm(sb: App.Locals['srv'], tenantId: string, termId: string) {
  // Transactional: clear all, set one — inside a single RPC for atomicity.
  const { error } = await sb.rpc('set_current_term', {
    p_tenant_id: tenantId,
    p_term_id: termId,
  });
  if (error) {
    logError('term_set_current', error, { termId });
    return fail(500, { error: 'Failed to set the current term.' });
  }
  return { success: true as const };
}

export async function deleteTerm(sb: App.Locals['srv'], tenantId: string, termId: string) {
  const { error } = await sb
    .from('terms')
    .update({ deleted_at: new Date().toISOString(), is_current: false })
    .eq('id', termId)
    .eq('tenant_id', tenantId);
  if (error) {
    logError('term_delete', error, { termId });
    return fail(500, { error: 'Failed to delete the term.' });
  }
  return { success: true as const };
}