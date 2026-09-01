import type { PageServerLoad } from './$types';
import { requireTenantRole } from '$lib/server/_auth/auth';
export const load:PageServerLoad=async({locals})=>{const {tenantId}=requireTenantRole(locals,'school_admin','super_admin','principal','bursar');const {data}=await locals.srv.from('payment_receipts').select('id,receipt_number,payment_domain,amount,currency,payment_reference,payment_method,paid_at,confirmation_status,student_id,teacher_user_id').eq('tenant_id',tenantId).order('paid_at',{ascending:false}).limit(500);return{receipts:data??[]};};
