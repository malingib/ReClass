-- eShule seed: Malingi High School (single-school deployment, no tenancy)
INSERT INTO public.school_settings (id, name, slug, currency, timezone, sms_sender_id, academic_year)
VALUES (1, 'Malingi High School', 'malingi-high', 'KES', 'Africa/Nairobi', 'ESHULE', '2026')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subjects (id, name, code)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Mathematics', 'MATH'),
  ('a0000001-0000-0000-0000-000000000002', 'English', 'ENG'),
  ('a0000001-0000-0000-0000-000000000003', 'Kiswahili', 'KISW'),
  ('a0000001-0000-0000-0000-000000000004', 'Sciences', 'SCI')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fee_types (id, name, amount, due_date, term)
VALUES
  ('b0000001-0000-0000-0000-000000000001', 'Term 1 Remedial', 5000, '2026-09-01', 'Term 1'),
  ('b0000001-0000-0000-0000-000000000002', 'Exam Prep Bootcamp', 2500, '2026-11-15', 'Term 1')
ON CONFLICT (id) DO NOTHING;
