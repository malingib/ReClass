alter table public.remedial_committee_rights drop constraint if exists remedial_committee_rights_right_code_check;
alter table public.remedial_committee_rights add constraint remedial_committee_rights_right_code_check check (right_code in ('view_committee','manage_members','approve_attendance','initiate_payments','approve_payments','approve_level_1','approve_level_2','approve_level_3','approve_level_4','approve_level_5','view_payments','reconcile_payments','manage_paybill'));
create or replace function public.approve_teacher_attendance(p_attendance_id uuid,p_decision text,p_note text default null)
returns public.teacher_attendance language plpgsql security definer set search_path=public as $$
declare a public.teacher_attendance; ok boolean; begin
 if p_decision not in ('approved','rejected') then raise exception 'Invalid attendance decision'; end if;
 select * into a from public.teacher_attendance where id=p_attendance_id for update; if not found then raise exception 'Attendance record not found'; end if;
 select exists(select 1 from public.remedial_committee_role_assignments ra join public.remedial_committee_rights rr on rr.assignment_id=ra.id where ra.tenant_id=a.tenant_id and ra.teacher_id=auth.uid() and ra.active and rr.right_code='approve_attendance' and rr.granted) into ok;
 if not ok then raise exception 'Only an authorized ReClass committee member may approve attendance'; end if;
 if a.marked_by=auth.uid() then raise exception 'A teacher cannot approve their own attendance'; end if;
 update public.teacher_attendance set approval_status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),review_note=p_note where id=a.id returning * into a;
 insert into public.audit_logs(actor_user_id,action,module,entity_type,entity_id,target_user_id,source,result,metadata) values(auth.uid(),'teacher_attendance_'||p_decision,'reclass','teacher_attendance',a.id,a.teacher_id,'web','success',jsonb_build_object('status',a.status,'note',p_note)); return a;
end; $$;
