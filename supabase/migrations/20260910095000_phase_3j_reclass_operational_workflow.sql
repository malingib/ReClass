-- Phase 3J: ReClass attendance + programme operational workflow

create or replace function public.enforce_reclass_occurrence_lifecycle()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_approved boolean;
begin
  if new.status = 'done' then
    if new.occurs_on > current_date then raise exception 'Future occurrences cannot be marked done'; end if;
    select exists(select 1 from public.teacher_attendance ta where ta.occurrence_id=new.id and ta.teacher_id=new.teacher_id and ta.approval_status='approved' and ta.deleted_at is null) into v_approved;
    if not v_approved then raise exception 'Occurrence cannot be marked done until teacher attendance is approved'; end if;
  end if;
  if tg_op='UPDATE' then
    if old.status='cancelled' and new.status<>'cancelled' then raise exception 'Cancelled occurrences are terminal'; end if;
    if old.status='done' and new.status<>'done' then raise exception 'Completed occurrences are terminal'; end if;
  end if;
  if new.status='cancelled' and exists(select 1 from public.teacher_attendance ta where ta.occurrence_id=new.id and ta.approval_status='approved' and ta.deleted_at is null) then
    raise exception 'Occurrence with approved attendance cannot be cancelled';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reclass_occurrence_lifecycle on public.session_occurrences;
create trigger trg_reclass_occurrence_lifecycle before insert or update on public.session_occurrences for each row execute function public.enforce_reclass_occurrence_lifecycle();

create or replace function public.complete_reclass_occurrence_on_approved_attendance()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.approval_status='approved' and (tg_op='INSERT' or old.approval_status is distinct from 'approved') then
    update public.session_occurrences set status='done',updated_at=now() where id=new.occurrence_id and status='scheduled' and occurs_on<=current_date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reclass_attendance_approval_completes_occurrence on public.teacher_attendance;
create trigger trg_reclass_attendance_approval_completes_occurrence after insert or update of approval_status on public.teacher_attendance for each row execute function public.complete_reclass_occurrence_on_approved_attendance();

create or replace function public.sync_reclass_future_occurrences()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op='UPDATE' and (new.teacher_id is distinct from old.teacher_id or new.start_time is distinct from old.start_time or new.end_time is distinct from old.end_time or new.room is distinct from old.room or new.class is distinct from old.class) then
    update public.session_occurrences so set teacher_id=new.teacher_id,start_time=new.start_time,end_time=new.end_time,room=new.room,class=new.class,updated_at=now() where so.session_id=new.id and so.status='scheduled' and so.occurs_on>=current_date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reclass_session_sync_future_occurrences on public.sessions;
create trigger trg_reclass_session_sync_future_occurrences after update on public.sessions for each row execute function public.sync_reclass_future_occurrences();

create or replace function public.manage_reclass_session_occurrence(p_id uuid,p_session_id uuid,p_occurs_on date,p_start_time time,p_end_time time,p_room text,p_class text,p_teacher_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; v_session_teacher uuid; v_active boolean; v_existing_status text;
begin
  if not public.current_user_has_reclass_permission('reclass.programme.manage') then raise exception 'Not authorized'; end if;
  if p_occurs_on is null or p_start_time is null or p_end_time is null or p_end_time<=p_start_time then raise exception 'Invalid occurrence timing'; end if;
  if p_status not in ('scheduled','cancelled','done') then raise exception 'Invalid occurrence status'; end if;
  if p_status='done' and p_occurs_on>current_date then raise exception 'Future occurrences cannot be marked done'; end if;
  select s.teacher_id,s.active into v_session_teacher,v_active from public.sessions s where s.id=p_session_id and s.deleted_at is null;
  if not found or not coalesce(v_active,false) then raise exception 'Active session not found'; end if;
  if p_teacher_id is distinct from v_session_teacher then raise exception 'Occurrence teacher must match session teacher'; end if;
  if p_id is null then
    if p_status='done' then raise exception 'New occurrences must be scheduled or cancelled until attendance is approved'; end if;
    insert into public.session_occurrences(session_id,occurs_on,start_time,end_time,room,class,teacher_id,status,created_at,updated_at) values(p_session_id,p_occurs_on,p_start_time,p_end_time,p_room,p_class,p_teacher_id,p_status,now(),now()) returning id into v_id;
  else
    select status into v_existing_status from public.session_occurrences where id=p_id for update;
    if not found then raise exception 'Occurrence not found'; end if;
    if v_existing_status in ('cancelled','done') and p_status<>v_existing_status then raise exception 'Occurrence status is terminal'; end if;
    update public.session_occurrences set session_id=p_session_id,occurs_on=p_occurs_on,start_time=p_start_time,end_time=p_end_time,room=p_room,class=p_class,teacher_id=p_teacher_id,status=p_status,updated_at=now() where id=p_id returning id into v_id;
  end if;
  return jsonb_build_object('id',v_id);
end;
$$;

revoke execute on function public.enforce_reclass_occurrence_lifecycle() from public,anon,authenticated;
revoke execute on function public.complete_reclass_occurrence_on_approved_attendance() from public,anon,authenticated;
revoke execute on function public.sync_reclass_future_occurrences() from public,anon,authenticated;
revoke execute on function public.manage_reclass_session_occurrence(uuid,uuid,date,time,time,text,text,uuid,text) from public,anon;
grant execute on function public.manage_reclass_session_occurrence(uuid,uuid,date,time,time,text,text,uuid,text) to authenticated;
