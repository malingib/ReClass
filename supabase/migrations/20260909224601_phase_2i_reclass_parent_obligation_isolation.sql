-- Phase 2I: preserve explicit parent-only access to ReClass obligations.
drop policy if exists reclass_obligations_parent_view on public.reclass_obligations;
create policy reclass_obligations_parent_view on public.reclass_obligations
for select to authenticated using (
  exists (
    select 1 from public.guardians_link gl
    join public.parents p on p.id = gl.parent_id
    where gl.student_id = reclass_obligations.student_id
      and p.profile_id = auth.uid()
      and p.deleted_at is null
  )
);
revoke all on public.reclass_obligations from anon;
