import { defineConfig } from 'vite';

// The autonomous-agent-system source is part of the repository tooling surface;
// the production eShule app is SvelteKit and does not need the React/PWA plugins here.
export default defineConfig({
  server: {
    proxy: {
      '/agents': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
