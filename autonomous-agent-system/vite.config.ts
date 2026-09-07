import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/agents": { target: "http://localhost:8787", changeOrigin: true }
    }
  }
});
