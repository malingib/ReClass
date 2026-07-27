import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const TRACK_TABLE = '_schema_migrations';
const REF = 'rlswdeswlkuaigwtojxw';
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SRK) { console.error('SUPABASE_SERVICE_ROLE_KEY env var required'); process.exit(1); }

async function connect() {
  const regions = ['eu-west-1', 'us-east-1', 'eu-central-1', 'ap-southeast-1', 'us-west-2', 'ap-northeast-1', 'sa-east-1'];
  for (const region of regions) {
    const cs = `postgresql://postgres.${REF}:${encodeURIComponent(SRK)}@aws-0-${region}.pooler.supabase.com:6543/postgres?sslmode=require`;
    const pool = new Pool({ connectionString: cs, max: 1, connectionTimeoutMillis: 5000 });
    try {
      const c = await pool.connect();
      await c.query('SELECT 1');
      c.release();
      console.log(`Connected via ${region}`);
      return pool;
    } catch { await pool.end().catch(() => {}); }
  }
  throw new Error('Could not connect to any Supabase pooler region');
}

async function ensureTrackTable(pool) {
  const c = await pool.connect();
  await c.query(`CREATE TABLE IF NOT EXISTS ${TRACK_TABLE} (id serial PRIMARY KEY, filename text UNIQUE NOT NULL, applied_at timestamptz DEFAULT now())`);
  c.release();
}

async function getApplied(pool) {
  const c = await pool.connect();
  const { rows } = await c.query(`SELECT filename FROM ${TRACK_TABLE} ORDER BY id`);
  c.release();
  return new Set(rows.map(r => r.filename));
}

async function applyMigration(pool, filepath, filename) {
  const sql = readFileSync(filepath, 'utf8');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query(sql);
    await c.query(`INSERT INTO ${TRACK_TABLE} (filename) VALUES ($1)`, [filename]);
    await c.query('COMMIT');
    console.log(`  ✅ ${filename}`);
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    console.error(`  ❌ ${filename}: ${e.message.substring(0, 200)}`);
    process.exit(1);
  } finally {
    c.release();
  }
}

async function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  if (!files.length) { console.log('No migration files found'); return; }

  const pool = await connect();
  await ensureTrackTable(pool);
  const applied = await getApplied(pool);
  const pending = files.filter(f => !applied.has(f));

  if (!pending.length) { console.log('All migrations already applied'); await pool.end(); return; }

  console.log(`\nApplying ${pending.length} migration(s)...\n`);
  for (const f of pending) {
    await applyMigration(pool, join(MIGRATIONS_DIR, f), f);
  }

  console.log('\nDone!');
  await pool.end();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
