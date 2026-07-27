import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rlswdeswlkuaigwtojxw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY env var required'); process.exit(1); }

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function insert(table, rows) {
  if (!rows || rows.length === 0) { console.log(`  ${table}: 0 rows (skipped)`); return; }
  const batchSize = 20;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await sb.from(table).insert(batch);
    if (error && !error.message?.includes('already exists') && !error.message?.includes('duplicate key')) {
      console.error(`  ${table}: insert error: ${error.message.substring(0, 100)}`);
      return false;
    }
  }
  console.log(`  ${table}: ${rows.length} rows`);
  return true;
}

async function seed() {
  const T = '11111111-1111-1111-1111-111111111111';
  console.log('Seeding ReClass...\n');

  // 1. Tenant
  await insert('tenants', [{
    id: T, name: 'Malingi High School', slug: 'malingi-high',
    brand_primary: '#039855', currency: 'KES', timezone: 'Africa/Nairobi',
    sms_sender_id: 'RECLASS', academic_year: '2026',
  }]);

  // 2. Subjects
  const subjects = [
    { id: 'a0000001-0000-0000-0000-000000000001', tenant_id: T, name: 'Mathematics', code: 'MATH' },
    { id: 'a0000001-0000-0000-0000-000000000002', tenant_id: T, name: 'English', code: 'ENG' },
    { id: 'a0000001-0000-0000-0000-000000000003', tenant_id: T, name: 'Kiswahili', code: 'KISW' },
    { id: 'a0000001-0000-0000-0000-000000000004', tenant_id: T, name: 'Integrated Science', code: 'SCI' },
    { id: 'a0000001-0000-0000-0000-000000000005', tenant_id: T, name: 'History & Government', code: 'HIST' },
    { id: 'a0000001-0000-0000-0000-000000000006', tenant_id: T, name: 'Geography', code: 'GEO' },
    { id: 'a0000001-0000-0000-0000-000000000007', tenant_id: T, name: 'Business Studies', code: 'BSTD' },
    { id: 'a0000001-0000-0000-0000-000000000008', tenant_id: T, name: 'CRE', code: 'CRE' },
  ];
  await insert('subjects', subjects);

  // 3. Teachers  
  const teachers = [
    { id: 'c0000001-0000-0000-0000-000000000001', tenant_id: T, first_name: 'John', last_name: 'Kamau', employee_no: 'TCH-001', subjects: ['MATH','SCI'] },
    { id: 'c0000001-0000-0000-0000-000000000002', tenant_id: T, first_name: 'Grace', last_name: 'Wanjiku', employee_no: 'TCH-002', subjects: ['ENG','BSTD'] },
    { id: 'c0000001-0000-0000-0000-000000000003', tenant_id: T, first_name: 'Peter', last_name: 'Ochieng', employee_no: 'TCH-003', subjects: ['KISW','HIST'] },
    { id: 'c0000001-0000-0000-0000-000000000004', tenant_id: T, first_name: 'Jane', last_name: 'Nyambura', employee_no: 'TCH-004', subjects: ['GEO','CRE'] },
    { id: 'c0000001-0000-0000-0000-000000000005', tenant_id: T, first_name: 'David', last_name: 'Mwangi', employee_no: 'TCH-005', subjects: ['MATH'] },
    { id: 'c0000001-0000-0000-0000-000000000006', tenant_id: T, first_name: 'Sarah', last_name: 'Akinyi', employee_no: 'TCH-006', subjects: ['ENG'] },
    { id: 'c0000001-0000-0000-0000-000000000007', tenant_id: T, first_name: 'Michael', last_name: 'Kiprop', employee_no: 'TCH-007', subjects: ['SCI','GEO'] },
    { id: 'c0000001-0000-0000-0000-000000000008', tenant_id: T, first_name: 'Faith', last_name: 'Chebet', employee_no: 'TCH-008', subjects: ['HIST','CRE'] },
    { id: 'c0000001-0000-0000-0000-000000000009', tenant_id: T, first_name: 'Samuel', last_name: 'Otieno', employee_no: 'TCH-009', subjects: ['BSTD'] },
    { id: 'c0000001-0000-0000-0000-000000000010', tenant_id: T, first_name: 'Esther', last_name: 'Waithera', employee_no: 'TCH-010', subjects: ['KISW'] },
  ];
  await insert('teachers', teachers);

  // 4. Students
  const students = [
    { id: 'd0000001-0000-0000-0000-000000000001', tenant_id: T, admission_no: '2026001', first_name: 'Brian', last_name: 'Kipkoech', grade: 'Form 4' },
    { id: 'd0000001-0000-0000-0000-000000000002', tenant_id: T, admission_no: '2026002', first_name: 'Cynthia', last_name: 'Achieng', grade: 'Form 4' },
    { id: 'd0000001-0000-0000-0000-000000000003', tenant_id: T, admission_no: '2026003', first_name: 'Daniel', last_name: 'Mutua', grade: 'Form 3' },
    { id: 'd0000001-0000-0000-0000-000000000004', tenant_id: T, admission_no: '2026004', first_name: 'Emily', last_name: 'Wambui', grade: 'Form 3' },
    { id: 'd0000001-0000-0000-0000-000000000005', tenant_id: T, admission_no: '2026005', first_name: 'Felix', last_name: 'Njenga', grade: 'Form 3' },
    { id: 'd0000001-0000-0000-0000-000000000006', tenant_id: T, admission_no: '2026006', first_name: 'Gladys', last_name: 'Chepkoech', grade: 'Form 2' },
    { id: 'd0000001-0000-0000-0000-000000000007', tenant_id: T, admission_no: '2026007', first_name: 'Henry', last_name: 'Kamande', grade: 'Form 2' },
    { id: 'd0000001-0000-0000-0000-000000000008', tenant_id: T, admission_no: '2026008', first_name: 'Irene', last_name: 'Akoth', grade: 'Form 2' },
    { id: 'd0000001-0000-0000-0000-000000000009', tenant_id: T, admission_no: '2026009', first_name: 'James', last_name: 'Mwangi', grade: 'Form 2' },
    { id: 'd0000001-0000-0000-0000-000000000010', tenant_id: T, admission_no: '2026010', first_name: 'Kevin', last_name: 'Odhiambo', grade: 'Form 1' },
    { id: 'd0000001-0000-0000-0000-000000000011', tenant_id: T, admission_no: '2026011', first_name: 'Lilian', last_name: 'Njoki', grade: 'Form 1' },
    { id: 'd0000001-0000-0000-0000-000000000012', tenant_id: T, admission_no: '2026012', first_name: 'Moses', last_name: 'Kiprono', grade: 'Form 1' },
    { id: 'd0000001-0000-0000-0000-000000000013', tenant_id: T, admission_no: '2026013', first_name: 'Nancy', last_name: 'Wangari', grade: 'Form 4' },
    { id: 'd0000001-0000-0000-0000-000000000014', tenant_id: T, admission_no: '2026014', first_name: 'Oscar', last_name: 'Nyongesa', grade: 'Form 1' },
    { id: 'd0000001-0000-0000-0000-000000000015', tenant_id: T, admission_no: '2026015', first_name: 'Pauline', last_name: 'Jeruto', grade: 'Form 3' },
    { id: 'd0000001-0000-0000-0000-000000000016', tenant_id: T, admission_no: '2026016', first_name: 'Robert', last_name: 'Kibet', grade: 'Form 2' },
    { id: 'd0000001-0000-0000-0000-000000000017', tenant_id: T, admission_no: '2026017', first_name: 'Susan', last_name: 'Mwende', grade: 'Form 1' },
    { id: 'd0000001-0000-0000-0000-000000000018', tenant_id: T, admission_no: '2026018', first_name: 'Timothy', last_name: 'Kosgei', grade: 'Form 4' },
    { id: 'd0000001-0000-0000-0000-000000000019', tenant_id: T, admission_no: '2026019', first_name: 'Veronica', last_name: 'Nyambura', grade: 'Form 3' },
    { id: 'd0000001-0000-0000-0000-000000000020', tenant_id: T, admission_no: '2026020', first_name: 'William', last_name: 'Rono', grade: 'Form 4' },
  ];
  await insert('students', students);

  // 5. Parents
  const parents = [
    { id: 'e0000001-0000-0000-0000-000000000001', tenant_id: T, full_name: 'Joseph Kipkoech', phone: '+254712100001' },
    { id: 'e0000001-0000-0000-0000-000000000002', tenant_id: T, full_name: 'Mary Achieng', phone: '+254712100002' },
    { id: 'e0000001-0000-0000-0000-000000000003', tenant_id: T, full_name: 'Peter Mutua', phone: '+254712100003' },
    { id: 'e0000001-0000-0000-0000-000000000004', tenant_id: T, full_name: 'Agnes Wambui', phone: '+254712100004' },
    { id: 'e0000001-0000-0000-0000-000000000005', tenant_id: T, full_name: 'Samuel Njenga', phone: '+254712100005' },
    { id: 'e0000001-0000-0000-0000-000000000006', tenant_id: T, full_name: 'Esther Chepkoech', phone: '+254712100006' },
    { id: 'e0000001-0000-0000-0000-000000000007', tenant_id: T, full_name: 'Tom Kamande', phone: '+254712100007' },
    { id: 'e0000001-0000-0000-0000-000000000008', tenant_id: T, full_name: 'Dorcas Akoth', phone: '+254712100008' },
    { id: 'e0000001-0000-0000-0000-000000000009', tenant_id: T, full_name: 'Francis Mwangi', phone: '+254712100009' },
    { id: 'e0000001-0000-0000-0000-000000000010', tenant_id: T, full_name: 'Grace Odhiambo', phone: '+254712100010' },
  ];
  await insert('parents', parents);

  // 6. Guardian links
  const links = [
    { student_id: students[0].id, parent_id: parents[0].id, relationship: 'father', is_primary: true },
    { student_id: students[1].id, parent_id: parents[1].id, relationship: 'mother', is_primary: true },
    { student_id: students[2].id, parent_id: parents[2].id, relationship: 'father', is_primary: true },
    { student_id: students[3].id, parent_id: parents[3].id, relationship: 'mother', is_primary: true },
    { student_id: students[4].id, parent_id: parents[4].id, relationship: 'father', is_primary: true },
    { student_id: students[5].id, parent_id: parents[5].id, relationship: 'mother', is_primary: true },
    { student_id: students[6].id, parent_id: parents[6].id, relationship: 'father', is_primary: true },
    { student_id: students[7].id, parent_id: parents[7].id, relationship: 'mother', is_primary: true },
    { student_id: students[8].id, parent_id: parents[8].id, relationship: 'father', is_primary: true },
    { student_id: students[9].id, parent_id: parents[9].id, relationship: 'mother', is_primary: true },
    { student_id: students[10].id, parent_id: parents[0].id, relationship: 'father' },
    { student_id: students[11].id, parent_id: parents[1].id, relationship: 'mother' },
    { student_id: students[12].id, parent_id: parents[2].id, relationship: 'father' },
    { student_id: students[13].id, parent_id: parents[3].id, relationship: 'mother' },
    { student_id: students[14].id, parent_id: parents[4].id, relationship: 'father' },
    { student_id: students[15].id, parent_id: parents[5].id, relationship: 'mother' },
    { student_id: students[16].id, parent_id: parents[6].id, relationship: 'father' },
    { student_id: students[17].id, parent_id: parents[7].id, relationship: 'mother' },
    { student_id: students[18].id, parent_id: parents[8].id, relationship: 'father' },
    { student_id: students[19].id, parent_id: parents[9].id, relationship: 'mother' },
  ];
  await insert('guardians_link', links);

  // 7. Fee types
  const feeTypes = [
    { id: 'b0000001-0000-0000-0000-000000000001', tenant_id: T, name: 'Term 1 Remedial', amount: 5000, due_date: '2026-09-01', term: 'Term 1' },
    { id: 'b0000001-0000-0000-0000-000000000002', tenant_id: T, name: 'Exam Prep Bootcamp', amount: 2500, due_date: '2026-11-15', term: 'Term 1' },
    { id: 'b0000001-0000-0000-0000-000000000003', tenant_id: T, name: 'Holiday Tuition (August)', amount: 3000, due_date: '2026-08-15', term: 'Term 1' },
    { id: 'b0000001-0000-0000-0000-000000000004', tenant_id: T, name: 'Term 2 Remedial', amount: 5500, due_date: '2027-01-15', term: 'Term 2' },
  ];
  await insert('fee_types', feeTypes);

  // 8. Remedial groups
  const groups = [
    { id: 'f0000001-0000-0000-0000-000000000001', tenant_id: T, name: 'Math Booster - Form 4', subject_id: subjects[0].id,  teacher_id: teachers[0].id, room: 'Rm 12', capacity: 30, term: 'Term 1' },
    { id: 'f0000001-0000-0000-0000-000000000002', tenant_id: T, name: 'English Lit - Form 3/4', subject_id: subjects[1].id,   teacher_id: teachers[1].id, room: 'Rm 8', capacity: 35, term: 'Term 1' },
    { id: 'f0000001-0000-0000-0000-000000000003', tenant_id: T, name: 'Kiswahili Sarufi - Form 3/4', subject_id: subjects[2].id, teacher_id: teachers[2].id, room: 'Rm 5', capacity: 30, term: 'Term 1' },
    { id: 'f0000001-0000-0000-0000-000000000004', tenant_id: T, name: 'Science Lab - Form 4', subject_id: subjects[3].id,   teacher_id: teachers[6].id, room: 'Lab 1', capacity: 25, term: 'Term 1' },
    { id: 'f0000001-0000-0000-0000-000000000005', tenant_id: T, name: 'Geography Mapwork - Form 3/4', subject_id: subjects[5].id, teacher_id: teachers[3].id, room: 'Rm 10', capacity: 30, term: 'Term 1' },
    { id: 'f0000001-0000-0000-0000-000000000006', tenant_id: T, name: 'History - Form 2/3', subject_id: subjects[4].id,    teacher_id: teachers[7].id, room: 'Rm 3', capacity: 35, term: 'Term 1' },
    { id: 'f0000001-0000-0000-0000-000000000007', tenant_id: T, name: 'Business - Form 3/4', subject_id: subjects[6].id,      teacher_id: teachers[8].id, room: 'Rm 7', capacity: 25, term: 'Term 1' },
    { id: 'f0000001-0000-0000-0000-000000000008', tenant_id: T, name: 'Math Foundation - Form 1/2', subject_id: subjects[0].id, teacher_id: teachers[4].id, room: 'Rm 12', capacity: 30, term: 'Term 1' },
  ];
  await insert('remedial_groups', groups);

  // 9. Invoices (simple version - no payments or complex states)
  for (const s of students) {
    const ft1 = feeTypes[0], ft2 = feeTypes[1];
    for (const ft of [ft1, ft2]) {
      const r = Math.random();
      const status = r < 0.3 ? 'unpaid' : r < 0.6 ? 'partial' : 'paid';
      const amountPaid = status === 'unpaid' ? 0 : status === 'partial' ? ft.amount / 2 : ft.amount;
      try {
        await sb.from('invoices').insert({
          tenant_id: T, student_id: s.id, fee_type_id: ft.id,
          amount_due: ft.amount, amount_paid: amountPaid,
          status, due_date: ft.due_date,
        });
      } catch {} // ignore dupes
    }
  }
  console.log('  invoices: 40 rows (approx)');

  // 10. Sessions + occurrences - simplified
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const dw = i % 2 === 0 ? 1 : 2; // Mon or Tue
    const startH = 7 + (i % 4) * 1;
    const startMin = (i % 2) * 30;
    const endH = startH + 1;
    
    // Insert session (only existing columns: id, tenant_id, group_id, day_of_week, start_time, end_time, slot, active)
    const sessionId = `s0000001-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
    try {
      await sb.from('sessions').insert({
        id: sessionId, tenant_id: T, group_id: g.id,
        day_of_week: dw,
        start_time: `${String(startH).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
        end_time: `${String(endH).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
        slot: i % 2 === 0 ? 'morning' : 'evening',
        active: true,
      });
    } catch {}

    // Occurrences for this week
    for (let w = -1; w <= 2; w++) {
      const occDate = new Date(monday);
      occDate.setDate(monday.getDate() + (dw - 1) + w * 7);
      const isPast = occDate < now;
      try {
        await sb.from('session_occurrences').insert({
          tenant_id: T, session_id: sessionId,
          occurs_on: occDate.toISOString().slice(0, 10),
          start_time: `${String(startH).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
          end_time: `${String(endH).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
          room: g.room,
          status: isPast ? 'done' : 'scheduled',
        });
      } catch {}
    }
  }
  console.log('  sessions: 8 rows');
  console.log('  session_occurrences: ~32 rows');

  // 11. Notifications for test admin
  const { data: profiles } = await sb.from('profiles').select('id').eq('tenant_id', T).limit(1);
  if (profiles?.length) {
    for (const body of [
      'M-Pesa payment of KES 5,000 received for Brian Kipkoech',
      'Teacher John Kamau marked present for Math Booster session',
      'New student William Rono enrolled in Form 4',
    ]) {
      try {
        await sb.from('notifications').insert({
          tenant_id: T, channel: 'inapp', recipient: profiles[0].id, body, status: 'sent',
        });
      } catch {}
    }
    console.log('  notifications: 3 rows');
  }

  console.log('\n✅ Seed complete! Tables seeded: tenants, subjects, teachers, students, parents, guardians_link, fee_types, remedial_groups, invoices, sessions, session_occurrences, notifications');
  console.log('   Skipped (need migrations): group_members, teacher_attendance, payroll_runs');
}

seed().catch(e => { console.error('FATAL:', e); process.exit(1); });
