import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  ssr: {
    noExternal: ['@eshule/shared'],
  },
  server: {
    watch: {
      // Freebuff's own desktop state files churn on every message — don't let
      // them trigger SSR page reloads / HMR on the open page.
      ignored: ['**/.freebuff/**'],
    },
  },
});
