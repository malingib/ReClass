-- Phase 2R: ReClass attendance and PayBill integrity hardening.
-- Applied to production via Supabase migration runner.

create or replace function public.mark_own_teacher_attendance(p_tenant_id uuid,p_teacher_id uuid,p_profile_id uuid,p_occurrence_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare assigned uuid; od date; aid uuid;
begin
  if auth.uid() is null or auth.uid() is distinct from p_profile_id then return jsonb_build_object('status','forbidden'); end if;
  if p_status not in ('attended','absent') then return jsonb_build_object('status','invalid_status'); end if;
  if not exists(select 1 from teachers where id=p_teacher_id and profile_id=p_profile_id and deleted_at is null) then return jsonb_build_object('status','forbidden'); end if;
  select coalesce(o.teacher_id,s.teacher_id),o.occurs_on into assigned,od from session_occurrences o join sessions s on s.id=o.session_id where o.id=p_occurrence_id and o.status<>'cancelled' and s.deleted_at is null and s.active=true;
  if assigned is distinct from p_teacher_id then return jsonb_build_object('status','not_assigned'); end if;
  if od>current_date then return jsonb_build_object('status','future_occurrence'); end if;
  insert into teacher_attendance(occurrence_id,teacher_id,status,marked_by,marked_at,approval_status,deleted_at)
  values(p_occurrence_id,p_teacher_id,p_status,p_profile_id,now(),'pending',null)
  on conflict(occurrence_id,teacher_id) do update set status=excluded.status,marked_by=excluded.marked_by,marked_at=now(),approval_status='pending',reviewed_by=null,reviewed_at=null,review_note=null,deleted_at=null where teacher_attendance.approval_status<>'approved'
  returning id into aid;
  if aid is null then return jsonb_build_object('status','already_approved'); end if;
  update session_occurrences set status='done',updated_at=now() where id=p_occurrence_id;
  return jsonb_build_object('status','pending','attendance_id',aid);
end; $$;

create or replace function public.review_teacher_attendance(p_tenant_id uuid,p_profile_id uuid,p_attendance_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare aid uuid; ok boolean; marked uuid;
begin
  if auth.uid() is null or auth.uid() is distinct from p_profile_id then return jsonb_build_object('status','forbidden'); end if;
  if p_decision not in ('approved','rejected') then return jsonb_build_object('status','invalid_decision'); end if;
  if p_decision='rejected' and nullif(btrim(p_note),'') is null then return jsonb_build_object('status','note_required'); end if;
  select marked_by into marked from teacher_attendance where id=p_attendance_id and deleted_at is null;
  if marked is null then return jsonb_build_object('status','not_found'); end if;
  if marked=p_profile_id then return jsonb_build_object('status','maker_cannot_approve'); end if;
  select exists(select 1 from user_roles where user_id=p_profile_id and role in ('principal','school_admin','super_admin')) or exists(select 1 from teachers where profile_id=p_profile_id and remedial_role='chairman' and deleted_at is null) into ok;
  if not ok then return jsonb_build_object('status','forbidden'); end if;
  update teacher_attendance set approval_status=p_decision,reviewed_by=p_profile_id,reviewed_at=now(),review_note=nullif(btrim(p_note),'') where id=p_attendance_id and approval_status='pending' and deleted_at is null returning id into aid;
  return jsonb_build_object('status',case when aid is null then 'not_pending' else p_decision end,'attendance_id',aid);
end; $$;

create or replace function public.remedial_paybill_governance_status(p_tenant_id uuid)
returns jsonb language sql stable set search_path to 'public' as $$
with ops as(select distinct coalesce(role_assignment_id::text,committee_member_id::text) holder from remedial_paybill_operators where active and (effective_from is null or effective_from<=now()) and (effective_to is null or effective_to>=now())),
initiators as(select distinct coalesce(role_assignment_id::text,committee_member_id::text) holder from remedial_paybill_operators where active and (effective_from is null or effective_from<=now()) and (effective_to is null or effective_to>=now()) and operator_role in('initiator','manager')),
approvers as(select distinct coalesce(role_assignment_id::text,committee_member_id::text) holder from remedial_paybill_operators where active and (effective_from is null or effective_from<=now()) and (effective_to is null or effective_to>=now()) and operator_role in('approver','manager')),
levels as(select count(distinct approval_level) configured_levels from remedial_paybill_operators where active and (effective_from is null or effective_from<=now()) and (effective_to is null or effective_to>=now()) and operator_role='approver' and approval_level is not null),
settings as(select * from remedial_paybill_settings limit 1)
select jsonb_build_object('operator_count',(select count(*) from ops),'initiator_count',(select count(*) from initiators),'approver_count',(select count(*) from approvers),'approval_levels_configured',coalesce((select configured_levels from levels),0),'minimum_web_operators',coalesce((select minimum_web_operators from settings),2),'required_approval_levels',coalesce((select approval_levels from settings),1),'maker_checker_required',coalesce((select maker_checker_required from settings),true),'initiator_may_approve_own_transaction',coalesce((select initiator_may_approve_own_transaction from settings),false),'ready',((select count(*) from ops)>=coalesce((select minimum_web_operators from settings),2) and (select count(*) from initiators)>=1 and (select count(*) from approvers)>=1 and coalesce((select configured_levels from levels),0)>=coalesce((select approval_levels from settings),1)))
$$;

revoke execute on function public.mark_own_teacher_attendance(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.mark_own_teacher_attendance(uuid,uuid,uuid,uuid,text) to authenticated;
revoke execute on function public.review_teacher_attendance(uuid,uuid,uuid,text,text) from public,anon;
grant execute on function public.review_teacher_attendance(uuid,uuid,uuid,text,text) to authenticated;
revoke execute on function public.remedial_paybill_governance_status(uuid) from public,anon;
grant execute on function public.remedial_paybill_governance_status(uuid) to authenticated;
