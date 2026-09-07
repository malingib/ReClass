import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { MODULES, KERNEL_MODULES, canImport } from '../packages/shared/src/lib/modules.js';

const root = process.cwd();
const serverRoot = join(root, 'src', 'lib', 'server');
const migrationsRoot = join(root, 'supabase', 'migrations');
const PUBLIC_SURFACE = new Set(['index.ts', 'contracts.ts', 'api.ts']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (/\.(ts|js|mjs)$/.test(entry.name)) out.push(path);
  }
  return out;
}

function importSpecifiers(source) {
  const specs = [];
  const patterns = [
    /\b(?:import|export)\b[\s\S]*?from\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) specs.push(match[1]);
  }
  return specs;
}

function resolveTarget(spec, fromFile) {
  let target;
  if (spec.startsWith('$lib/server/')) target = spec.slice('$lib/server/'.length);
  else if (spec.startsWith('./') || spec.startsWith('../')) {
    const resolved = join(fromFile, spec);
    const rel = relative(serverRoot, resolved);
    if (rel.startsWith('..') || rel.startsWith(sep)) return null;
    target = rel.split(sep).join('/');
  } else return null;

  const relFrom = relative(serverRoot, fromFile);
  const from = relFrom.split(sep)[0];
  const [to, ...rest] = target.split('/');
  if (!from || !MODULES[from] || !to || !MODULES[to]) return null;
  return { from, to, fileBase: rest.length ? rest.join('/').replace(/\.(ts|js|mjs)$/, '') : 'index' };
}

const errors = [];
for (const file of walk(serverRoot)) {
  const source = readFileSync(file, 'utf8');
  const rel = relative(root, file).split(sep).join('/');
  for (const spec of importSpecifiers(source)) {
    const target = resolveTarget(spec, file);
    if (!target || target.from === target.to || KERNEL_MODULES.includes(target.to)) continue;
    if (!canImport(target.from, target.to)) {
      errors.push(`${rel}: ${target.from} imports ${target.to} — not in ${target.from}.mayImport`);
    } else if (!PUBLIC_SURFACE.has(`${target.fileBase}.ts`)) {
      errors.push(`${rel}: ${target.from} imports ${target.to}/${target.fileBase}.ts — private surface`);
    }
  }
}

const provisionableIds = new Set(Object.values(MODULES).filter((m) => m.provisionable).map((m) => m.id));
const knownIds = new Set(Object.values(MODULES).map((m) => m.id));
const seedErrors = [];
const seedWarnings = [];
const candidates = readdirSync(migrationsRoot)
  .filter((file) => file.endsWith('.sql'))
  .map((file) => ({ file, sql: readFileSync(join(migrationsRoot, file), 'utf8') }))
  .filter(({ sql }) => sql.includes('INSERT INTO public.tenant_modules'))
  .sort((a, b) => a.file.localeCompare(b.file));
const latestSeed = candidates.at(-1);
if (latestSeed) {
  const start = latestSeed.sql.indexOf('INSERT INTO public.tenant_modules');
  const end = latestSeed.sql.indexOf('ON CONFLICT', start);
  const block = end === -1 ? latestSeed.sql.slice(start) : latestSeed.sql.slice(start, end);
  const match = block.match(/ARRAY\[([^\]]+)\]/);
  if (match) {
    for (const token of match[1].matchAll(/'([^']+)'/g)) {
      const id = token[1];
      if (!knownIds.has(id)) seedErrors.push(`${latestSeed.file}: seeded module '${id}' is not in the registry`);
      else if (!provisionableIds.has(id)) seedWarnings.push(`${latestSeed.file}: seeded '${id}' is not provisionable`);
    }
  }
}

console.log('BOUNDARY CHECK (registry: packages/shared/src/lib/modules.js)');
if (errors.length) {
  for (const error of errors) console.log(`[FAIL] ${error}`);
}
for (const warning of seedWarnings) console.log(`[WARN] ${warning}`);
for (const error of seedErrors) console.log(`[FAIL] ${error}`);
if (errors.length || seedErrors.length) process.exit(1);
console.log(`PASS — scanned ${walk(serverRoot).length} server files.`);
