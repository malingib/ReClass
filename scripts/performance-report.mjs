import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = '.svelte-kit/output';
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return files.flat();
}

try {
  const files = await walk(root);
  const sized = await Promise.all(files.map(async (file) => ({ file, bytes: (await stat(file)).size })));
  const total = sized.reduce((sum, item) => sum + item.bytes, 0);
  const largest = sized.sort((a, b) => b.bytes - a.bytes).slice(0, 20);
  console.log(JSON.stringify({
    output: root,
    totalBytes: total,
    totalKiB: Number((total / 1024).toFixed(1)),
    largest: largest.map(({ file, bytes }) => ({ file, bytes, KiB: Number((bytes / 1024).toFixed(1)) }))
  }, null, 2));
} catch {
  console.error('No build output found. Run npm run build before npm run perf:report.');
  process.exit(1);
}
