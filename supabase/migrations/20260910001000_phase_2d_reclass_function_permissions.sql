-- Trigger helpers are not API endpoints. Keep them executable by the table owner/trigger
-- while preventing direct RPC invocation by anon/authenticated clients.
revoke execute on function public.enforce_reclass_committee_office_uniqueness() from public, anon, authenticated;
revoke execute on function public.seed_reclass_committee_rights() from public, anon, authenticated;
