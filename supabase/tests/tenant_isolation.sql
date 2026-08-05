-- Run against a seeded non-production database with at least two tenants.
-- This deliberately exercises the database boundary rather than service-role
-- application predicates.
BEGIN;

INSERT INTO public.tenants (id, name, slug)
VALUES ('22222222-2222-2222-2222-222222222222', 'Isolation Test School', 'isolation-test-school')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (id, tenant_id, admission_no, first_name, last_name)
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'ISOLATION-001', 'Isolation', 'Fixture')
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  first_tenant uuid := '11111111-1111-1111-1111-111111111111';
  second_tenant uuid := '22222222-2222-2222-2222-222222222222';
  first_count bigint;
  second_count bigint;
BEGIN
  PERFORM set_config('app.tenant_id', first_tenant::text, true);
  SELECT count(*) INTO first_count FROM public.students WHERE tenant_id = second_tenant;
  IF first_count <> 0 THEN
    RAISE EXCEPTION 'tenant A can read tenant B students';
  END IF;

  SELECT count(*) INTO first_count FROM public.teachers WHERE tenant_id = second_tenant;
  IF first_count <> 0 THEN
    RAISE EXCEPTION 'tenant A can read tenant B teachers';
  END IF;

  SELECT count(*) INTO first_count FROM public.subjects WHERE tenant_id = second_tenant;
  IF first_count <> 0 THEN
    RAISE EXCEPTION 'tenant A can read tenant B subjects';
  END IF;

  PERFORM set_config('app.tenant_id', second_tenant::text, true);
  SELECT count(*) INTO second_count FROM public.students WHERE tenant_id = first_tenant;
  IF second_count <> 0 THEN
    RAISE EXCEPTION 'tenant B can read tenant A students';
  END IF;
END;
$$;

ROLLBACK;
