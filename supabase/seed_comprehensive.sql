-- ReClass Comprehensive Seed
-- Seeds Malingi High School with realistic test data for all modules
-- Run: psql "$SUPABASE_DB_URL" -f supabase/seed_comprehensive.sql
-- Or via Supabase Dashboard SQL Editor (logged in as service_role)

-- 0. Migration: add missing columns to sessions for scheduling page
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS grade text;

-- 1. Tenant (Malingi High School)
INSERT INTO public.tenants (id, name, slug, brand_primary, currency, timezone, sms_sender_id, academic_year, payroll_rate_per_session)
VALUES ('11111111-1111-1111-1111-111111111111', 'Malingi High School', 'malingi-high', '#039855', 'KES', 'Africa/Nairobi', 'RECLASS', '2026', 300)
ON CONFLICT (id) DO UPDATE SET
  brand_primary = EXCLUDED.brand_primary,
  payroll_rate_per_session = EXCLUDED.payroll_rate_per_session;

-- 2. Subjects
INSERT INTO public.subjects (id, tenant_id, name, code) VALUES
  ('a0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Mathematics', 'MATH'),
  ('a0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'English', 'ENG'),
  ('a0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Kiswahili', 'KISW'),
  ('a0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Integrated Science', 'SCI'),
  ('a0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'History & Government', 'HIST'),
  ('a0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Geography', 'GEO'),
  ('a0000001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Business Studies', 'BSTD'),
  ('a0000001-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'CRE', 'CRE')
ON CONFLICT (id) DO NOTHING;

-- 3. Teachers (10 teachers)
INSERT INTO public.teachers (id, tenant_id, first_name, last_name, employee_no, subjects) VALUES
  ('c0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'John', 'Kamau', 'TCH-001', ARRAY['MATH', 'SCI']),
  ('c0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Grace', 'Wanjiku', 'TCH-002', ARRAY['ENG', 'BSTD']),
  ('c0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Peter', 'Ochieng', 'TCH-003', ARRAY['KISW', 'HIST']),
  ('c0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Jane', 'Nyambura', 'TCH-004', ARRAY['GEO', 'CRE']),
  ('c0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'David', 'Mwangi', 'TCH-005', ARRAY['MATH']),
  ('c0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Sarah', 'Akinyi', 'TCH-006', ARRAY['ENG']),
  ('c0000001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Michael', 'Kiprop', 'TCH-007', ARRAY['SCI', 'GEO']),
  ('c0000001-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Faith', 'Chebet', 'TCH-008', ARRAY['HIST', 'CRE']),
  ('c0000001-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Samuel', 'Otieno', 'TCH-009', ARRAY['BSTD']),
  ('c0000001-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Esther', 'Waithera', 'TCH-010', ARRAY['KISW'])
ON CONFLICT (id) DO NOTHING;

-- 4. Students (20 students across Form 1-4)
INSERT INTO public.students (id, tenant_id, admission_no, first_name, last_name, grade) VALUES
  ('d0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026001', 'Brian', 'Kipkoech', 'Form 4'),
  ('d0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '2026002', 'Cynthia', 'Achieng', 'Form 4'),
  ('d0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '2026003', 'Daniel', 'Mutua', 'Form 3'),
  ('d0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '2026004', 'Emily', 'Wambui', 'Form 3'),
  ('d0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '2026005', 'Felix', 'Njenga', 'Form 3'),
  ('d0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '2026006', 'Gladys', 'Chepkoech', 'Form 2'),
  ('d0000001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '2026007', 'Henry', 'Kamande', 'Form 2'),
  ('d0000001-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', '2026008', 'Irene', 'Akoth', 'Form 2'),
  ('d0000001-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '2026009', 'James', 'Mwangi', 'Form 2'),
  ('d0000001-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '2026010', 'Kevin', 'Odhiambo', 'Form 1'),
  ('d0000001-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '2026011', 'Lilian', 'Njoki', 'Form 1'),
  ('d0000001-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '2026012', 'Moses', 'Kiprono', 'Form 1'),
  ('d0000001-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', '2026013', 'Nancy', 'Wangari', 'Form 4'),
  ('d0000001-0000-0000-0000-000000000014', '11111111-1111-1111-1111-111111111111', '2026014', 'Oscar', 'Nyongesa', 'Form 1'),
  ('d0000001-0000-0000-0000-000000000015', '11111111-1111-1111-1111-111111111111', '2026015', 'Pauline', 'Jeruto', 'Form 3'),
  ('d0000001-0000-0000-0000-000000000016', '11111111-1111-1111-1111-111111111111', '2026016', 'Robert', 'Kibet', 'Form 2'),
  ('d0000001-0000-0000-0000-000000000017', '11111111-1111-1111-1111-111111111111', '2026017', 'Susan', 'Mwende', 'Form 1'),
  ('d0000001-0000-0000-0000-000000000018', '11111111-1111-1111-1111-111111111111', '2026018', 'Timothy', 'Kosgei', 'Form 4'),
  ('d0000001-0000-0000-0000-000000000019', '11111111-1111-1111-1111-111111111111', '2026019', 'Veronica', 'Nyambura', 'Form 3'),
  ('d0000001-0000-0000-0000-000000000020', '11111111-1111-1111-1111-111111111111', '2026020', 'William', 'Rono', 'Form 4')
ON CONFLICT (id) DO NOTHING;

-- 5. Parents (linked to students)
INSERT INTO public.parents (id, tenant_id, full_name, phone, email) VALUES
  ('e0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Joseph Kipkoech', '+254712100001', 'joseph.k@email.com'),
  ('e0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Mary Achieng', '+254712100002', 'mary.a@email.com'),
  ('e0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Peter Mutua', '+254712100003', 'peter.m@email.com'),
  ('e0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Agnes Wambui', '+254712100004', 'agnes.w@email.com'),
  ('e0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Samuel Njenga', '+254712100005', 'samuel.n@email.com'),
  ('e0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Esther Chepkoech', '+254712100006', 'esther.c@email.com'),
  ('e0000001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Tom Kamande', '+254712100007', 'tom.k@email.com'),
  ('e0000001-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Dorcas Akoth', '+254712100008', 'dorcas.a@email.com'),
  ('e0000001-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Francis Mwangi', '+254712100009', 'francis.m@email.com'),
  ('e0000001-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Grace Odhiambo', '+254712100010', 'grace.o@email.com')
ON CONFLICT (id) DO NOTHING;

-- 6. Guardian links (1-2 students per parent)
INSERT INTO public.guardians_link (student_id, parent_id, relationship, is_primary)
SELECT s.id, p.id, 'father', true
FROM public.students s
CROSS JOIN LATERAL (
  SELECT id FROM public.parents
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
  ORDER BY random() LIMIT 1
) p
WHERE s.tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

-- 7. Fee types
INSERT INTO public.fee_types (id, tenant_id, name, amount, due_date, term) VALUES
  ('b0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Term 1 Remedial', 5000, '2026-09-01', 'Term 1'),
  ('b0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Exam Prep Bootcamp', 2500, '2026-11-15', 'Term 1'),
  ('b0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Holiday Tuition (August)', 3000, '2026-08-15', 'Term 1'),
  ('b0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Term 2 Remedial', 5500, '2027-01-15', 'Term 2')
ON CONFLICT (id) DO NOTHING;

-- 8. Remedial groups (8 groups across subjects)
INSERT INTO public.remedial_groups (id, tenant_id, name, subject_id, teacher_id, room, capacity, term) VALUES
  ('f0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Math Booster - Form 4',
   (SELECT id FROM public.subjects WHERE code = 'MATH' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-001'), 'Rm 12', 30, 'Term 1'),
  ('f0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'English Lit - Form 3/4',
   (SELECT id FROM public.subjects WHERE code = 'ENG' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-002'), 'Rm 8', 35, 'Term 1'),
  ('f0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Kiswahili Sarufi - Form 3/4',
   (SELECT id FROM public.subjects WHERE code = 'KISW' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-003'), 'Rm 5', 30, 'Term 1'),
  ('f0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Science Lab - Form 4',
   (SELECT id FROM public.subjects WHERE code = 'SCI' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-007'), 'Lab 1', 25, 'Term 1'),
  ('f0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Geography Mapwork - Form 3/4',
   (SELECT id FROM public.subjects WHERE code = 'GEO' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-004'), 'Rm 10', 30, 'Term 1'),
  ('f0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'History - Form 2/3',
   (SELECT id FROM public.subjects WHERE code = 'HIST' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-008'), 'Rm 3', 35, 'Term 1'),
  ('f0000001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Business - Form 3/4',
   (SELECT id FROM public.subjects WHERE code = 'BSTD' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-009'), 'Rm 7', 25, 'Term 1'),
  ('f0000001-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Math Foundation - Form 1/2',
   (SELECT id FROM public.subjects WHERE code = 'MATH' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-005'), 'Rm 12', 30, 'Term 1')
ON CONFLICT (id) DO NOTHING;

-- 9. Enroll students in groups (group_members)
INSERT INTO public.group_members (tenant_id, student_id, group_id)
SELECT '11111111-1111-1111-1111-111111111111', s.id, g.id
FROM public.students s
JOIN public.remedial_groups g ON g.tenant_id = '11111111-1111-1111-1111-111111111111'
WHERE s.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND (
    (s.grade = 'Form 4' AND g.name LIKE '%Form 4%')
    OR (s.grade LIKE 'Form 3%' AND g.name LIKE '%Form 3/4%')
    OR (s.grade LIKE 'Form 2%' AND g.name LIKE '%Form 2/3%' OR g.name LIKE '%Form 1/2%')
    OR (s.grade LIKE 'Form 1%' AND g.name LIKE '%Form 1/2%')
  )
ON CONFLICT DO NOTHING;

-- 10. Recurring sessions (weekly schedule) + occurrences
-- Generate sessions for the current week's schedule
DO $$
DECLARE
  grp RECORD;
  base_date DATE := date_trunc('week', CURRENT_DATE)::DATE;
  day_names TEXT[] := ARRAY['Mon','Tue','Wed','Thu','Fri'];
  day_offsets INT[] := ARRAY[0,1,2,3,4];
  slot_pairs TEXT[][] := ARRAY[ARRAY['07:30','08:30'], ARRAY['08:45','09:45'], ARRAY['10:00','11:00'], ARRAY['11:15','12:15']];
  idx INT;
  session_id uuid;
  occ_date DATE;
  subj_name TEXT;
  grp_name TEXT;
  grp_grade TEXT;
BEGIN
  idx := 1;
  FOR grp IN SELECT * FROM public.remedial_groups WHERE tenant_id = '11111111-1111-1111-1111-111111111111' LOOP
    -- Get subject name
    SELECT name INTO subj_name FROM public.subjects WHERE id = grp.subject_id;
    -- Determine grade from group name
    IF grp.name LIKE '%Form 4%' THEN grp_grade := 'Form 4';
    ELSIF grp.name LIKE '%Form 3/4%' THEN grp_grade := 'Form 3-4';
    ELSIF grp.name LIKE '%Form 2/3%' THEN grp_grade := 'Form 2-3';
    ELSIF grp.name LIKE '%Form 1/2%' THEN grp_grade := 'Form 1-2';
    ELSE grp_grade := 'Form 3-4';
    END IF;

    -- 2 sessions per group per week (Mon & Wed or Tue & Thu)
    session_id := gen_random_uuid();
    INSERT INTO public.sessions (id, tenant_id, group_id, title, subject, grade, day_of_week, start_time, end_time, slot)
    VALUES (
      session_id,
      '11111111-1111-1111-1111-111111111111',
      grp.id,
      LEFT(grp.name, 50),
      subj_name,
      grp_grade,
      CASE WHEN idx % 2 = 1 THEN 1 ELSE 2 END, -- Mon or Tue
      (slot_pairs[(idx % 4) + 1][1])::time,
      (slot_pairs[(idx % 4) + 1][2])::time,
      CASE WHEN (idx % 4) < 2 THEN 'morning' ELSE 'evening' END
    );

    -- Create occurrences for this week and next week
    FOR occ_day IN 0..1 LOOP
      occ_date := base_date + ((CASE WHEN idx % 2 = 1 THEN 0 ELSE 1 END) + occ_day * 7);
      IF occ_date >= CURRENT_DATE - interval '2 days' THEN
        INSERT INTO public.session_occurrences (tenant_id, session_id, occurs_on, start_time, end_time, room, status)
        VALUES (
          '11111111-1111-1111-1111-111111111111',
          session_id,
          occ_date,
          (slot_pairs[(idx % 4) + 1][1])::time,
          (slot_pairs[(idx % 4) + 1][2])::time,
          grp.room,
          CASE WHEN occ_date < CURRENT_DATE THEN 'done' ELSE 'scheduled' END
        );
      END IF;
    END LOOP;

    idx := idx + 1;
  END LOOP;
END $$;

-- 11. Teacher attendance for past sessions (last 14 days)
INSERT INTO public.teacher_attendance (tenant_id, occurrence_id, teacher_id, status, marked_at)
SELECT
  '11111111-1111-1111-1111-111111111111',
  so.id,
  g.teacher_id,
  CASE floor(random() * 10)
    WHEN 0 THEN 'absent' WHEN 1 THEN 'late'
    ELSE 'present'
  END,
  so.start_at + interval '1 hour'
FROM public.session_occurrences so
JOIN public.sessions s ON s.id = so.session_id
JOIN public.remedial_groups g ON g.id = s.group_id
WHERE so.occurs_on < CURRENT_DATE
  AND so.occurs_on >= CURRENT_DATE - interval '14 days'
  AND so.tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT (occurrence_id, teacher_id) DO NOTHING;

-- 12. Student attendance for past sessions
INSERT INTO public.attendance (tenant_id, occurrence_id, student_id, status, marked_at)
SELECT
  '11111111-1111-1111-1111-111111111111',
  so.id,
  gm.student_id,
  CASE floor(random() * 8)
    WHEN 0 THEN 'absent' WHEN 1 THEN 'late' WHEN 2 THEN 'excused'
    ELSE 'present'
  END,
  so.start_at + interval '2 hours'
FROM public.session_occurrences so
JOIN public.group_members gm ON gm.group_id = (
  SELECT s.group_id FROM public.sessions s WHERE s.id = so.session_id LIMIT 1
)
WHERE so.occurs_on < CURRENT_DATE
  AND so.occurs_on >= CURRENT_DATE - interval '14 days'
  AND so.tenant_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT (occurrence_id, student_id) DO NOTHING;

-- 13. Invoices for students
INSERT INTO public.invoices (tenant_id, student_id, fee_type_id, amount_due, amount_paid, status, due_date)
SELECT
  '11111111-1111-1111-1111-111111111111',
  s.id,
  ft.id,
  ft.amount,
  CASE floor(random() * 3)
    WHEN 0 THEN 0
    WHEN 1 THEN ft.amount / 2
    ELSE ft.amount
  END,
  CASE floor(random() * 3)
    WHEN 0 THEN 'unpaid'
    WHEN 1 THEN 'partial'
    ELSE 'paid'
  END,
  ft.due_date
FROM public.students s
CROSS JOIN public.fee_types ft
WHERE s.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND ft.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND ft.term = 'Term 1'
ON CONFLICT DO NOTHING;

-- 14. Some payments linked to paid invoices
INSERT INTO public.payments (tenant_id, invoice_id, amount, method, phone, status)
SELECT
  '11111111-1111-1111-1111-111111111111',
  i.id,
  i.amount_paid,
  'mpesa',
  '+254712' || (100000 + floor(random() * 900000)::int)::text,
  'paid'
FROM public.invoices i
WHERE i.status IN ('paid', 'partial')
  AND i.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.invoice_id = i.id)
ON CONFLICT DO NOTHING;

-- 15. Payroll run for last week
INSERT INTO public.payroll_runs (tenant_id, period_start, period_end, teacher_id, occurrences_count, rate_per_session, amount, status)
SELECT
  '11111111-1111-1111-1111-111111111111',
  date_trunc('week', CURRENT_DATE - interval '1 week')::DATE,
  (date_trunc('week', CURRENT_DATE - interval '1 week') + interval '6 days')::DATE,
  t.id,
  count(DISTINCT ta.id),
  300,
  count(DISTINCT ta.id) * 300,
  'approved'
FROM public.teachers t
LEFT JOIN public.teacher_attendance ta ON ta.teacher_id = t.id
  AND ta.marked_at >= date_trunc('week', CURRENT_DATE - interval '1 week')
  AND ta.marked_at < date_trunc('week', CURRENT_DATE)
  AND ta.status IN ('present', 'late')
WHERE t.tenant_id = '11111111-1111-1111-1111-111111111111'
GROUP BY t.id
ON CONFLICT DO NOTHING;

-- 16. Some notifications
INSERT INTO public.notifications (tenant_id, channel, recipient, body, status)
SELECT
  '11111111-1111-1111-1111-111111111111',
  'inapp',
  p.id::text,
  CASE floor(random() * 4)::int
    WHEN 0 THEN 'M-Pesa payment of KES 5,000 received for Brian Kipkoech'
    WHEN 1 THEN 'Teacher John Kamau marked present for Math Booster session'
    WHEN 2 THEN 'New student William Rono enrolled in Form 4'
    ELSE 'Payroll for week starting ' || (date_trunc('week', CURRENT_DATE)::DATE - 7)::text || ' approved'
  END,
  'sent'
FROM public.profiles p
WHERE p.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND p.id IN (SELECT user_id FROM public.user_roles WHERE role = 'school_admin')
LIMIT 5;
