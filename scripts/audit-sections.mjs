// scripts/audit-sections.mjs
// Inventory of every SvelteKit page route grouped by role "section" and by
// owning module (from the canonical registry, not hand-maintained regexes).
//
// Usage: node scripts/audit-sections.mjs
import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { routeFor, KERNEL_ROUTES } from '../packages/shared/src/lib/modules.js';

const root = process.cwd();
const routesRoot = join(root, 'src', 'routes');

const ROLE_PREFIXES = new Set(['admin', 'bursar', 'parent', 'principal', 'teacher', 'super-admin']);

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path);
  }
  return files;
}

function routeFromPage(file) {
  const rel = relative(routesRoot, file).split(sep).join('/');
  const parts = rel.split('/');
  parts.pop();
  const route = parts
    .filter((part) => !/^\(.+\)$/.test(part))
    .map((part) => part.replace(/^\[(.+)\]$/, ':$1'))
    .filter((part) => part !== '+page')
    .join('/');
  return `/${route}`.replace(/\/+/g, '/') === '//' ? '/' : `/${route}`.replace(/\/+/g, '/');
}

function sectionFor(route) {
  const first = route.split('/').filter(Boolean)[0] ?? 'shared';
  return ROLE_PREFIXES.has(first) ? first : 'shared';
}

/** Owning module id via the registry; ungated kernel pages report as platform. */
function domainFor(route) {
  const mod = routeFor(route);
  if (mod) return mod;
  if (KERNEL_ROUTES.some((p) => route === p || route.startsWith(`${p}/`))) return 'platform';
  return 'shared';
}

const files = await filesUnder(routesRoot);
const pages = files.filter((file) => file.endsWith('+page.svelte'));
const serverLoaders = new Set(files.filter((file) => file.endsWith('+page.server.ts')).map((file) => file.replace('+page.server.ts', '+page.svelte')));
const rows = pages
  .map((file) => ({
    route: routeFromPage(file),
    section: sectionFor(routeFromPage(file)),
    domain: domainFor(routeFromPage(file)),
    page: relative(root, file).split(sep).join('/'),
    server: serverLoaders.has(file),
  }))
  .sort((a, b) => a.route.localeCompare(b.route));

const counts = rows.reduce((acc, row) => {
  acc[row.section] = (acc[row.section] ?? 0) + 1;
  return acc;
}, {});

console.log(`Section inventory: ${rows.length} page routes`);
console.log(`Sections: ${Object.entries(counts).map(([name, count]) => `${name}=${count}`).join(', ')}`);
console.log(`(domains resolved from packages/shared/src/lib/modules.js — routeFor)`);
console.log('');
console.log('route\tsection\tdomain\tserver-loader\tpage');
for (const row of rows) console.log(`${row.route}\t${row.section}\t${row.domain}\t${row.server ? 'yes' : 'no'}\t${row.page}`);
