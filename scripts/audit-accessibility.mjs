import { readFile } from 'node:fs/promises';

const files = [
  'src/routes/(app)/admin/+page.svelte',
  'src/routes/(app)/teacher/+page.svelte',
  'src/routes/(app)/parent/+page.svelte',
  'src/routes/(app)/parent/pay/+page.svelte',
  'src/routes/(app)/principal/+page.svelte',
  'src/routes/(app)/bursar/+page.svelte',
];

const failures = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const buttons = [...source.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  for (const [, attrs, body] of buttons) {
    const hasName = /aria-label\s*=|aria-labelledby\s*=/.test(attrs) || body.replace(/<[^>]+>/g, '').trim().length > 0;
    if (!hasName) failures.push(`${file}: button has no accessible name`);
  }

  const inputs = [...source.matchAll(/<input\b([^>]*)>/g)];
  for (const [, attrs] of inputs) {
    if (/type\s*=\s*['"]hidden['"]/.test(attrs)) continue;
    const hasName = /aria-label\s*=|aria-labelledby\s*=|id\s*=/.test(attrs);
    if (!hasName) failures.push(`${file}: input has no programmatic label or accessible name`);
  }

  const images = [...source.matchAll(/<img\b([^>]*)>/g)];
  for (const [, attrs] of images) {
    if (!/alt\s*=/.test(attrs)) failures.push(`${file}: image is missing alt text`);
  }
}

if (failures.length) {
  console.error('Accessibility audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Accessibility audit passed for ${files.length} core journey files.`);
