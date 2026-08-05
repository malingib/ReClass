import pg from 'pg';
const { Pool } = pg;

const REF = 'rlswdeswlkuaigwtojxw';
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createSetConfigFunction(region) {
  const connStr = `postgresql://postgres.${REF}:${SRK}@aws-0-${region}.pooler.supabase.com:5432/postgres?sslmode=require`;
  
  const pool = new Pool({ connectionString: connStr, max: 1, connectionTimeoutMillis: 5000 });
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE OR REPLACE FUNCTION set_config(name text, value text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        PERFORM set_config(name, value, true);
      END;
      $$;
    `);
    console.log(`✅ Created set_config function via ${region}`);
    await client.release();
    await pool.end();
    return true;
  } catch (e) {
    await pool.end();
    return false;
  }
}

// Try multiple regions
const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2', 'eu-central-1', 'ap-northeast-1', 'sa-east-1'];
for (const region of regions) {
  console.log(`Trying ${region}...`);
  if (await createSetConfigFunction(region)) process.exit(0);
}
console.error('Could not connect to any region');
process.exit(1);
