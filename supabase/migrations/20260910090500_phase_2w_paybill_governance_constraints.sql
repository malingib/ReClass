alter table public.remedial_paybill_settings
  drop constraint if exists remedial_paybill_settings_minimum_web_operators_check;
alter table public.remedial_paybill_settings
  add constraint remedial_paybill_settings_minimum_web_operators_check
  check (minimum_web_operators >= 1);

alter table public.remedial_paybill_settings
  drop constraint if exists remedial_paybill_settings_approval_levels_check;
alter table public.remedial_paybill_settings
  add constraint remedial_paybill_settings_approval_levels_check
  check (approval_levels >= 1 and (not maker_checker_required or approval_levels >= 2));

alter table public.remedial_paybill_settings
  drop constraint if exists remedial_paybill_settings_maker_checker_check;
alter table public.remedial_paybill_settings
  add constraint remedial_paybill_settings_maker_checker_check
  check (not maker_checker_required or initiator_may_approve_own_transaction = false);

alter table public.remedial_paybill_operators
  drop constraint if exists remedial_paybill_operators_approval_level_check;
alter table public.remedial_paybill_operators
  add constraint remedial_paybill_operators_approval_level_check
  check (approval_level is null or approval_level >= 1);

alter table public.remedial_paybill_operators
  drop constraint if exists remedial_paybill_operators_active_effective_check;
alter table public.remedial_paybill_operators
  add constraint remedial_paybill_operators_active_effective_check
  check (not active or effective_from is not null);

update public.remedial_paybill_settings
set initiator_may_approve_own_transaction = false
where maker_checker_required = true and initiator_may_approve_own_transaction = true;
