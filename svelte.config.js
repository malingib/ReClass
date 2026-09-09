// DEPRECATED — SvelteKit is no longer the deployment target (Vite SPA at apps/web-react/ is).
// Kept for local `npm run dev:svelte` / `build:svelte` only. Do not use for production deploys.
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Pin the serverless runtime explicitly: adapter-vercel otherwise infers it
    // from the local Node major version (20/22/24), which throws on Node 26
    // ("Unsupported Node.js version... or explicitly specify a runtime").
    // nodejs22.x also matches the declared `engines: ">=22 <23"`.
    adapter: adapter({ runtime: 'nodejs22.x' }),
    alias: {
      '@/*': './src/*',
    },
  },
  onwarn: (warning, handler) => {
    if (warning.code === 'state_referenced_locally') return;
    handler(warning);
  },
};

export default config;
