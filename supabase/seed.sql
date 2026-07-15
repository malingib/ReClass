-- ReClass seed: Malingi High School (tenant #1)
INSERT INTO public.tenants (id, name, slug, brand_primary, currency, timezone, sms_sender_id, academic_year)
VALUES ('11111111-1111-1111-1111-111111111111', 'Malingi High School', 'malingi-high', '#0f7a4d', 'KES', 'Africa/Nairobi', 'RECLASS', '2026');

INSERT INTO public.subjects (id, tenant_id, name, code)
VALUES
  ('a0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Mathematics', 'MATH'),
  ('a0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'English', 'ENG'),
  ('a0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Kiswahili', 'KISW'),
  ('a0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Sciences', 'SCI');

INSERT INTO public.fee_types (id, tenant_id, name, amount, due_date, term)
VALUES
  ('b0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Term 1 Remedial', 5000, '2026-09-01', 'Term 1'),
  ('b0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Exam Prep Bootcamp', 2500, '2026-11-15', 'Term 1');
