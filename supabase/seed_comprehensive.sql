-- eShule Comprehensive Seed
-- Seeds Malingi High School with realistic test data for all modules
-- Run: psql "$SUPABASE_DB_URL" -f supabase/seed_comprehensive.sql
-- Or via Supabase Dashboard SQL Editor (logged in as service_role)

-- 1. Tenant (Malingi High School)
INSERT INTO public.tenants (id, name, slug, brand_primary, currency, timezone, sms_sender_id, academic_year, payroll_rate_per_session)
VALUES ('11111111-1111-1111-1111-111111111111', 'Malingi High School', 'malingi-high', '#039855', 'KES', 'Africa/Nairobi', 'ESHULE', '2026', 300)
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

-- 8. Remedial sessions (whole-class model)
INSERT INTO public.sessions (id, tenant_id, class, subject_id, teacher_id, room, slot, day_of_week, start_time, end_time, active) VALUES
  ('f0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Form 4 Math',
   (SELECT id FROM public.subjects WHERE code = 'MATH' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-001'), 'Rm 12', 'morning', 1, '07:30', '08:30', true),
  ('f0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Form 3/4 English',
   (SELECT id FROM public.subjects WHERE code = 'ENG' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-002'), 'Rm 8', 'morning', 1, '08:45', '09:45', true),
  ('f0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Form 3/4 Kiswahili',
   (SELECT id FROM public.subjects WHERE code = 'KISW' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-003'), 'Rm 5', 'morning', 1, '10:00', '11:00', true),
  ('f0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Form 4 Science',
   (SELECT id FROM public.subjects WHERE code = 'SCI' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-007'), 'Lab 1', 'morning', 2, '07:30', '08:30', true),
  ('f0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Form 3/4 Geography',
   (SELECT id FROM public.subjects WHERE code = 'GEO' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-004'), 'Rm 10', 'morning', 2, '08:45', '09:45', true),
  ('f0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Form 2/3 History',
   (SELECT id FROM public.subjects WHERE code = 'HIST' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-008'), 'Rm 3', 'morning', 3, '07:30', '08:30', true),
  ('f0000001-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Form 3/4 Business',
   (SELECT id FROM public.subjects WHERE code = 'BSTD' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-009'), 'Rm 7', 'morning', 3, '08:45', '09:45', true),
  ('f0000001-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Form 1/2 Math Foundation',
   (SELECT id FROM public.subjects WHERE code = 'MATH' AND tenant_id = '11111111-1111-1111-1111-111111111111'),
   (SELECT id FROM public.teachers WHERE employee_no = 'TCH-005'), 'Rm 12', 'morning', 4, '07:30', '08:30', true)
ON CONFLICT (id) DO NOTHING;

-- (Group members table removed — sessions are whole-class)

-- 9. Session occurrences (past 2 weeks + future 8 weeks)
DO $$
DECLARE
  session RECORD;
  d DATE;
  occurrence_start TIME;
  occurrence_end TIME;
  day_int INT;
  past_occ DATE;
  future_occ DATE;
BEGIN
  -- For each session, create occurrences on their day_of_week
  -- Past 2 weeks: status = 'done'
  -- Future 8 weeks: status = 'scheduled' (duplicates with trigger are skipped via ON CONFLICT)
  FOR session IN
    SELECT * FROM public.sessions
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
      AND active = true
  LOOP
    -- Past occurrences (up to 14 days back)
    past_occ := date_trunc('week', CURRENT_DATE)::DATE;
    WHILE past_occ >= CURRENT_DATE - interval '14 days' LOOP
      IF EXTRACT(DOW FROM past_occ) = session.day_of_week THEN
        INSERT INTO public.session_occurrences (tenant_id, session_id, occurs_on, start_time, end_time, room, class, teacher_id, status)
        VALUES (
          '11111111-1111-1111-1111-111111111111',
          session.id,
          past_occ,
          session.start_time,
          session.end_time,
          session.room,
          session.class,
          session.teacher_id,
          CASE WHEN past_occ < CURRENT_DATE THEN 'done' ELSE 'scheduled' END
        )
        ON CONFLICT (session_id, occurs_on) DO UPDATE SET status = EXCLUDED.status;
      END IF;
      past_occ := past_occ - 1;
    END LOOP;

    -- Future occurrences (up to 8 weeks ahead)
    future_occ := GREATEST(CURRENT_DATE, date_trunc('week', CURRENT_DATE)::DATE);
    WHILE future_occ <= CURRENT_DATE + interval '56 days' LOOP
      IF EXTRACT(DOW FROM future_occ) = session.day_of_week THEN
        INSERT INTO public.session_occurrences (tenant_id, session_id, occurs_on, start_time, end_time, room, class, teacher_id, status)
        VALUES (
          '11111111-1111-1111-1111-111111111111',
          session.id,
          future_occ,
          session.start_time,
          session.end_time,
          session.room,
          session.class,
          session.teacher_id,
          'scheduled'
        )
        ON CONFLICT (session_id, occurs_on) DO NOTHING;
      END IF;
      future_occ := future_occ + 1;
    END LOOP;
  END LOOP;
END $$;

-- 10. Teacher attendance for past sessions (last 14 days)
INSERT INTO public.teacher_attendance (tenant_id, occurrence_id, teacher_id, status, marked_at, approval_status)
SELECT
  '11111111-1111-1111-1111-111111111111',
  so.id,
  so.teacher_id,
  CASE floor(random() * 10)
    WHEN 0 THEN 'late'
    ELSE 'present'
  END,
  (so.occurs_on + so.start_time)::timestamp,
  CASE WHEN so.occurs_on < CURRENT_DATE - interval '2 days' THEN 'approved' ELSE 'pending' END
FROM public.session_occurrences so
WHERE so.occurs_on < CURRENT_DATE
  AND so.occurs_on >= CURRENT_DATE - interval '14 days'
  AND so.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND so.status = 'done'
ON CONFLICT (occurrence_id, teacher_id) DO NOTHING;

-- (Student attendance table removed — whole-class model)

-- 11. Invoices for students
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

-- 12. Some payments linked to paid invoices
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

-- 13. Payroll run for last week
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

-- 14. Some notifications
INSERT INTO public.notifications (tenant_id, channel, recipient, body, status)
SELECT
  '11111111-1111-1111-1111-111111111111',
  'inapp',
  p.id::text,
  CASE floor(random() * 4)::int
    WHEN 0 THEN 'M-Pesa payment of KES 5,000 received for Brian Kipkoech'
    WHEN 1 THEN 'Teacher John Kamau marked present for Form 4 Math session'
    WHEN 2 THEN 'New student William Rono enrolled in Form 4'
    ELSE 'Payroll for week starting ' || (date_trunc('week', CURRENT_DATE)::DATE - 7)::text || ' approved'
  END,
  'sent'
FROM public.profiles p
WHERE p.tenant_id = '11111111-1111-1111-1111-111111111111'
  AND p.id IN (SELECT user_id FROM public.user_roles WHERE role = 'school_admin')
LIMIT 5;
