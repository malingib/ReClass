// scripts/audit-nav-links.mjs
// Audits navigation links against the real SvelteKit route tree and the
// canonical module registry (packages/shared/src/lib/modules.js).
//
// Checks:
//   1. BROKEN  — a nav href points at a URL with no matching page/endpoint.
//   2. CROSS   — a sidebar group whose items belong to more than one module
//                (handled by per-item derivation in AppShell; portals span
//                modules by design — informational, not a failure).
//   3. DEAD    — registry route entries whose route doesn't exist (stale).
//
// Usage: node scripts/audit-nav-links.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { routeFor, suiteModules, MODULES } from '../packages/shared/src/lib/modules.js';

const root = process.cwd();
const routesRoot = join(root, 'src', 'routes');

// ── 1. Build the set of real URL routes ─────────────────────────────────────
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const FILE_RE = /^\+((page\.server)|page|server)\.(svelte|ts|js)$/;
const pages = new Map(); // exact URL -> 'page' | 'endpoint'
const dynamics = []; // { pattern, type } with :param / * segments

for (const f of walk(routesRoot)) {
  const name = f.split(/[\\/]/).pop();
  if (!FILE_RE.test(name)) continue;
  const type = name.startsWith('+server') ? 'endpoint' : 'page';
  const rel = relative(routesRoot, f).split(sep).join('/');
  const urlParts = [];
  let dynamic = false;
  for (const part of rel.split('/').slice(0, -1)) {
    if (/^\(.+\)$/.test(part)) continue; // route groups don't appear in URLs
    const m = part.match(/^\[(\.\.\.)?(.+)\]$/);
    if (m) {
      dynamic = true;
      urlParts.push(m[1] ? '*' : `:${m[2]}`);
    } else {
      urlParts.push(part);
    }
  }
  const url = '/' + urlParts.join('/');
  if (dynamic) dynamics.push({ pattern: url, type });
  else pages.set(url.replace(/\/+/g, '/') === '//' ? '/' : url.replace(/\/+/g, '/'), type);
}

function findRoute(href) {
  const clean = (href.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  const exact = pages.get(clean);
  if (exact) return { status: 'ok', type: exact };
  for (const d of dynamics) {
    const dp = d.pattern.split('/');
    const hp = clean.split('/');
    if (dp.length !== hp.length) continue;
    if (dp.every((p, i) => p === '*' || p.startsWith(':') || p === hp[i])) {
      return { status: 'ok', type: d.type };
    }
  }
  return { status: 'broken' };
}

// ── 2. Extract nav links from AppShell.svelte ───────────────────────────────
const shell = readFileSync(join(root, 'src', 'lib', 'components', 'layout', 'AppShell.svelte'), 'utf8');

// a) roleNav structure: groups (label + defaultOpen + items) with their items.
const groups = [];
const groupRe = /label:\s*'([^']+)'\s*,\s*defaultOpen:[^,]+,\s*items:\s*\[/g;
let gm;
while ((gm = groupRe.exec(shell))) {
  const start = groupRe.lastIndex; // just after '['
  let depth = 1;
  let i = start;
  while (i < shell.length && depth > 0) {
    if (shell[i] === '[') depth++;
    else if (shell[i] === ']') depth--;
    i++;
  }
  const block = shell.slice(start, i - 1);
  const items = [...block.matchAll(/label:\s*'([^']+)'\s*,\s*href:\s*'([^']+)'/g)]
    .map((mm) => ({ label: mm[1], href: mm[2] }));
  groups.push({ label: gm[1], items });
}

// b) plain template links + goto() calls (profile menu, module picker, etc.)
const miscHrefs = new Set();
for (const m of shell.matchAll(/href:\s*'([^']+)'/g)) miscHrefs.add(m[1]);
for (const m of shell.matchAll(/href="([^"]+)"/g)) miscHrefs.add(m[1]);
for (const m of shell.matchAll(/goto\(\s*'([^']+)'/g)) miscHrefs.add(m[1]);
miscHrefs.delete('#main-content');

// Note: sidebar module gating is now derived per item via routeFor() in
// AppShell — there is no group→module map left to cross-check.

// ── 3. Route ownership comes from the canonical registry ────────────────────

// ── 4. Module hub cards come from the registry ──────────────────────────────
const hubHrefs = suiteModules.map((m) => m.href).filter(Boolean);

// ── 5. Report ───────────────────────────────────────────────────────────────
const rows = [];
const seen = new Set();
const add = (row) => {
  if (seen.has(row.href)) return;
  seen.add(row.href);
  rows.push(row);
};

for (const g of groups) {
  for (const item of g.items) {
    const r = findRoute(item.href);
    add({
      href: item.href,
      label: item.label,
      group: g.label,
      status: r.status,
      type: r.type ?? '',
      routeMod: routeFor(item.href) || '',
    });
  }
}
for (const href of miscHrefs) {
  if (href.startsWith('#') || href.startsWith('http')) continue;
  const r = findRoute(href);
  add({ href, label: '(shell)', group: '(template)', status: r.status, type: r.type ?? '', routeMod: '' });
}
for (const href of hubHrefs) {
  const r = findRoute(href);
  add({ href, label: '(module hub)', group: '(hub)', status: r.status, type: r.type ?? '', routeMod: '' });
}

console.log('NAV LINK AUDIT');
console.log('==============\n');

const broken = rows.filter((r) => r.status === 'broken');
const ok = rows.filter((r) => r.status === 'ok');

// Groups whose items span more than one owning module. Per-item derivation
// in AppShell keeps every link visible inside its module; a cross-module
// group is a portal shell mixing modules by design (e.g. principal Oversight).
const crossModule = groups
  .map((g) => ({
    label: g.label,
    mods: [...new Set(g.items.map((it) => routeFor(it.href) || '').filter(Boolean))],
  }))
  .filter((g) => g.mods.length > 1);

console.log(`Routes found in src/routes: ${pages.size} static, ${dynamics.length} dynamic\n`);

if (ok.length) {
  console.log(`-- OK (${ok.length}) --`);
  for (const r of ok) console.log(`  [OK]     ${r.href.padEnd(42)} ${r.label}`);
  console.log('');
}
if (crossModule.length) {
  console.log(`-- CROSS-MODULE NAV GROUPS (${crossModule.length}) — per-item derivation handles these --`);
  for (const g of crossModule) {
    console.log(`  [CROSS]  "${g.label}" spans modules: ${g.mods.join(', ')}`);
  }
  console.log('');
}
if (broken.length) {
  console.log(`-- BROKEN (${broken.length}) — no matching route --`);
  for (const r of broken) console.log(`  [BROKEN] ${r.href.padEnd(42)} ${r.label} (${r.group})`);
  console.log('');
}

// Dead registry route entries: mapped prefix with no static route AND no
// dynamic route underneath it.
const allRouteEntries = Object.values(MODULES).flatMap((mod) => mod.routes.map((p) => [p, mod.id]));
const deadRm = allRouteEntries.filter(([prefix]) => {
  if (findRoute(prefix).status === 'ok') return false;
  return !dynamics.some((d) => d.pattern.startsWith(prefix));
});
if (deadRm.length) {
  console.log(`-- DEAD REGISTRY ROUTE ENTRIES (${deadRm.length}) — mapped but no route exists --`);
  for (const [prefix, mod] of deadRm) console.log(`  [DEAD]   ${prefix.padEnd(42)} → ${mod}`);
  console.log('');
}

console.log('SUMMARY');
console.log(`  ${ok.length} routes resolve, ${crossModule.length} cross-module groups, ${broken.length} broken hrefs, ${deadRm.length} dead registry entries`);
process.exit(broken.length + deadRm.length ? 1 : 0);
