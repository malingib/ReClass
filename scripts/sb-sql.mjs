#!/usr/bin/env node
/**
 * Run SQL against a Supabase project via the Management API's arbitrary-query
 * endpoint (POST /v1/projects/{ref}/database/query) — no pooler or database
 * credentials needed, just a personal access token. Useful when the connection
 * pooler is unreachable from the current network (e.g. behind a proxy) or when
 * you want the dashboard-SQL-editor-equivalent privilege level (postgres role).
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/sb-sql.mjs "SELECT 1"
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/sb-sql.mjs file:supabase/migrations/foo.sql
 *   echo "SELECT 1" | SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/sb-sql.mjs
 *
 * The project ref defaults to rlswdeswlkuaigwtojxw but can be overridden with
 * SUPABASE_PROJECT_REF.
 */
import { readFileSync } from 'node:fs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN env var required');
  process.exit(1);
}
const ref = process.env.SUPABASE_PROJECT_REF ?? 'rlswdeswlkuaigwtojxw';

let query = process.argv[2] ?? '';
if (!query && !process.stdin.isTTY) {
  query = readFileSync(0, 'utf8');
}
if (query.startsWith('file:')) {
  query = readFileSync(query.slice(5), 'utf8');
}
if (!query.trim()) {
  console.error('Pass SQL as an argument, file:path, or via stdin');
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});
const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text.length > 8000 ? `${text.slice(0, 8000)}\n…[truncated]` : text);
if (!res.ok) process.exit(1);
