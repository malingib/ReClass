import pg from 'pg';
const { Pool } = pg;

const REF = 'rlswdeswlkuaigwtojxw';
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function tryConnect(region) {
  const connStr = `postgresql://postgres.${REF}:${SRK}@aws-0-${region}.pooler.supabase.com:6543/postgres?sslmode=require`;
  const pool = new Pool({ connectionString: connStr, max: 1, connectionTimeoutMillis: 5000 });
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT 1 AS ok');
    client.release();
    await pool.end();
    console.log(`Connected via ${region}`);
    return connStr;
  } catch (e) {
    await pool.end().catch(() => {});
    return null;
  }
}

async function runSQL(sql, pool) {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log(`  OK: ${sql.substring(0, 60)}...`);
  } catch (e) {
    console.error(`  FAIL: ${e.message.substring(0, 100)}`);
  } finally {
    client.release();
  }
}

async function main() {
  const regions = ['eu-west-1', 'us-east-1', 'us-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'sa-east-1'];
  
  let connStr = null;
  for (const r of regions) {
    console.log(`Trying ${r}...`);
    connStr = await tryConnect(r);
    if (connStr) break;
  }
  
  if (!connStr) {
    console.error('Could not connect to database pooler');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: connStr, max: 1 });

  // Run all missing migrations
  console.log('\nRunning migrations...');

  // 1. Add missing columns to sessions
  await runSQL(`ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS title text;`, pool);
  await runSQL(`ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS subject text;`, pool);
  await runSQL(`ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS grade text;`, pool);

  // 2. Add payroll_rate_per_session to tenants
  await runSQL(`ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS payroll_rate_per_session numeric(10,2) DEFAULT 0;`, pool);

  // 3. Ensure group_members table exists
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.group_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id),
      student_id uuid NOT NULL REFERENCES students(id),
      group_id uuid NOT NULL REFERENCES remedial_groups(id),
      enrolled_at timestamptz DEFAULT now(),
      UNIQUE (student_id, group_id)
    );
    CREATE INDEX IF NOT EXISTS idx_group_members_student ON public.group_members(student_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
    ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
  `, pool);

  // 4. Ensure teacher_attendance table exists
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.teacher_attendance (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id),
      occurrence_id uuid NOT NULL REFERENCES session_occurrences(id),
      teacher_id uuid NOT NULL REFERENCES teachers(id),
      status text NOT NULL CHECK (status IN ('present','late','absent','excused')),
      marked_by uuid REFERENCES profiles(id),
      marked_at timestamptz DEFAULT now(),
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      UNIQUE (occurrence_id, teacher_id)
    );
    CREATE INDEX IF NOT EXISTS idx_teacher_attendance_occ ON public.teacher_attendance(occurrence_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON public.teacher_attendance(teacher_id);
    ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
  `, pool);

  // 5. Ensure payroll_runs table exists
  await runSQL(`
    CREATE TABLE IF NOT EXISTS public.payroll_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id),
      period_start date NOT NULL,
      period_end date NOT NULL,
      teacher_id uuid NOT NULL REFERENCES teachers(id),
      occurrences_count int NOT NULL DEFAULT 0,
      rate_per_session numeric(10,2) NOT NULL DEFAULT 0,
      amount numeric(12,2) NOT NULL DEFAULT 0,
      status text DEFAULT 'draft' CHECK (status IN ('draft','approved','paid')),
      paid_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz
    );
    ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
  `, pool);

  console.log('\nMigrations done!');
  await pool.end();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
