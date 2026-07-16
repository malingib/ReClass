import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
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
