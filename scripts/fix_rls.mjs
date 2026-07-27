import pg from 'pg';
const { Pool } = pg;

const REF = 'rlswdeswlkuaigwtojxw';
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SRK) { console.error('SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }

// Try connecting with pgbouncer transaction mode (port 5432, pgbouncer=true)
// and also with session mode (port 6543)
async function tryConnect(connStr) {
  const pool = new Pool({ connectionString: connStr + '&sslmode=verify-full', max: 1, connectionTimeoutMillis: 8000 });
  try {
    const client = await pool.connect();
    const r = await client.query('SELECT current_setting(\'server_version\') AS v');
    console.log('Connected! PostgreSQL version:', r.rows[0].v);
    return client;
  } catch (e) {
    await pool.end();
    return null;
  }
}

const regions = [
  'us-east-1', 'eu-west-1', 'ap-southeast-1',
  'us-west-2', 'eu-central-1', 'ap-northeast-1', 'sa-east-1',
  'ap-southeast-2', 'ap-south-1',
];

let client = null;
for (const region of regions) {
  const connStr = `postgresql://postgres.${REF}:${encodeURIComponent(SRK)}@aws-0-${region}.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1`;
  console.log(`Trying ${region} (port 5432)...`);
  client = await tryConnect(connStr);
  if (client) break;

  const connStr2 = `postgresql://postgres.${REF}:${encodeURIComponent(SRK)}@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`;
  console.log(`Trying ${region} (port 6543)...`);
  client = await tryConnect(connStr2);
  if (client) break;

  // Direct connection
  const connStr3 = `postgresql://postgres.${REF}:${encodeURIComponent(SRK)}@db.${REF}.supabase.co:5432/postgres`;
  console.log(`Trying ${region} (direct)...`);
  client = await tryConnect(connStr3);
  if (client) break;
}

if (!client) {
  console.error('Could not connect to any region');
  process.exit(1);
}

// Update set_tenant_context to use is_local=false (session-level)
await client.query(`
  CREATE OR REPLACE FUNCTION public.set_tenant_context(p_tenant uuid, p_role text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    PERFORM set_config('app.tenant_id', p_tenant::text, false);
    PERFORM set_config('app.role', p_role, false);
  END;
  $$;
`);
console.log('✅ Updated set_tenant_context to use session-level config');

// Create a helper function for queries that need tenant context
await client.query(`
  CREATE OR REPLACE FUNCTION public.set_tenant_context_local(p_tenant uuid, p_role text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    PERFORM set_config('app.tenant_id', p_tenant::text, true);
    PERFORM set_config('app.role', p_role, true);
  END;
  $$;
`);
console.log('✅ Created set_tenant_context_local for same-transaction use');

await client.release();
console.log('Done!');
