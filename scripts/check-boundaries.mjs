// scripts/check-boundaries.mjs
// Enforces the module boundary rules from the canonical registry
// (packages/shared/src/lib/modules.js) against src/lib/server/_<mod>/**:
//
//   1. Kernel folders (_auth/_platform) may be imported by everyone, from
//      anywhere in server code.
//   2. Same-module imports are always fine.
//   3. Cross-module imports must be listed in the importing module's
//      `mayImport` (registry) AND target the target module's public surface
//      (index.ts / contracts.ts / api.ts).
//
// Routes (src/routes/**) are exempt — they may import any module's public
// surface, so this script only scans server module folders.
//
// Also asserts the CURRENT tenant_modules seed stays a subset of known
// registry ids (Section 3 rule 4: the DB is a mirror, checked not edited).
// Migrations are immutable, so only the most recent migration carrying a
// tenant_modules INSERT is the live seed statement.
//
// Usage: node scripts/check-boundaries.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  MODULES,
  KERNEL_MODULES,
  PUBLIC_SURFACE,
  canImport,
} from '../packages/shared/src/lib/modules.js';

const root = process.cwd();
const serverRoot = join(root, 'src', 'lib', 'server');
const migrationsRoot = join(root, 'supabase', 'migrations');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|js|mjs)$/.test(entry.name)) out.push(p);
  }
  return out;
}

// Pull every static + dynamic import specifier out of a source file.
function importSpecifiers(src) {
  const specs = [];
  let m;
  const fromRe = /\b(?:import|export)\b[\s\S]*?from\s*['"]([^'"]+)['"]/g;
  while ((m = fromRe.exec(src))) specs.push(m[1]);
  const sideEffectRe = /\bimport\s*['"]([^'"]+)['"]/g;
  while ((m = sideEffectRe.exec(src))) specs.push(m[1]);
  const dynamicRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynamicRe.exec(src))) specs.push(m[1]);
  return specs;
}

/**
 * Resolve a specifier to { from, to, fileBase } when it targets another
 * server module folder, else null.
 */
function resolveServerTarget(spec, fromFile) {
  let target;
  if (spec.startsWith('$lib/server/')) {
    target = spec.slice('$lib/server/'.length);
  } else if (spec.startsWith('./') || spec.startsWith('../')) {
    const resolved = join(sep === '\\' ? fromFile.replaceAll('/', sep) : fromFile, spec);
    const rel = relative(serverRoot, resolved);
    if (rel.startsWith('..') || rel.startsWith(sep)) return null;
    target = rel.split(sep).join('/');
  } else {
    return null;
  }

  const relFrom = relative(serverRoot, fromFile);
  const fromMod = relFrom.split(sep)[0];
  if (!fromMod || !MODULES[fromMod]) return null;

  const [toMod, ...rest] = target.split('/');
  if (!toMod || !MODULES[toMod]) return null;

  const fileBase = rest.length
    ? rest.join('/').replace(/\.(ts|js|mjs)$/, '')
    : 'index';
  return { from: fromMod, to: toMod, fileBase };
}

const files = walk(serverRoot);
const errors = [];
let checked = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(root, file).split(sep).join('/');
  for (const spec of importSpecifiers(src)) {
    const target = resolveServerTarget(spec, file);
    if (!target) continue;
    checked++;
    const { from, to, fileBase } = target;
    if (from === to) continue;
    if (KERNEL_MODULES.includes(to)) continue;
    if (!canImport(from, to)) {
      errors.push(`${rel}: ${from} imports ${to} — not in ${from}.mayImport`);
    } else if (!PUBLIC_SURFACE.includes(`${fileBase}.ts`)) {
      errors.push(`${rel}: ${from} imports ${to}/${fileBase}.ts — private surface (only index.ts/contracts.ts/api.ts)`);
    }
  }
}

// ── Seed mirror check: the live tenant_modules seed must use known ids ─────
// Only the most recent migration containing a tenant_modules INSERT is the
// current seed statement (older migrations are a historical record). Phase 3's
// rename re-issues an idempotent INSERT with the new id, keeping this green.
const provisionableIds = new Set(
  Object.values(MODULES).filter((m) => m.provisionable).map((m) => m.id),
);
const knownIds = new Set(Object.values(MODULES).map((m) => m.id));
const seedWarnings = [];
const seedErrors = [];
const seedCandidates = readdirSync(migrationsRoot)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => ({ file: f, sql: readFileSync(join(migrationsRoot, f), 'utf8') }))
  .filter(({ sql }) => sql.includes('INSERT INTO public.tenant_modules'))
  .sort((a, b) => (a.file < b.file ? -1 : 1));
const latestSeed = seedCandidates.at(-1);
if (!latestSeed) {
  seedWarnings.push('no migration contains a tenant_modules INSERT — seed mirror unverified');
} else {
  const sql = latestSeed.sql;
  // Only the tenant_modules backfill block, to avoid other ARRAY[...] literals.
  const start = sql.indexOf('INSERT INTO public.tenant_modules');
  const end = sql.indexOf('ON CONFLICT', start);
  const block = end === -1 ? sql.slice(start) : sql.slice(start, end);
  const arrayMatch = block.match(/ARRAY\[([^\]]+)\]/);
  if (!arrayMatch) {
    seedWarnings.push(`${latestSeed.file}: tenant_modules INSERT has no ARRAY seed — mirror unverified`);
  } else {
    for (const token of arrayMatch[1].matchAll(/'([^']+)'/g)) {
      const id = token[1];
      if (!knownIds.has(id)) seedErrors.push(`${latestSeed.file}: seeded module '${id}' is not in the registry`);
      else if (!provisionableIds.has(id)) seedWarnings.push(`${latestSeed.file}: seeded '${id}' is not provisionable (expected for kernel/hub)`);
    }
  }
}

console.log('BOUNDARY CHECK (registry: packages/shared/src/lib/modules.js)');
console.log('=============================================================\n');

if (checked) {
  console.log(`Scanned ${files.length} server files, ${checked} cross-module import(s) to kernel — all allowed.`);
}
if (errors.length) {
  console.log(`-- VIOLATIONS (${errors.length}) --`);
  for (const e of errors) console.log(`  [FAIL] ${e}`);
} else {
  console.log('-- Server import boundaries: OK --');
}

if (seedErrors.length || seedWarnings.length) {
  console.log('');
  console.log('-- tenant_modules seed mirror --');
  for (const w of seedWarnings) console.log(`  [WARN] ${w}`);
  for (const e of seedErrors) console.log(`  [FAIL] ${e}`);
}

console.log('');
if (errors.length || seedErrors.length) {
  console.log(`FAILED: ${errors.length} boundary violation(s), ${seedErrors.length} seed error(s)`);
  process.exit(1);
}
console.log('PASS — boundaries and seed mirror are consistent with the registry.');
