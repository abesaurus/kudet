import { defineConfig } from 'vite';

// Hybrid Cash landing — plain HTML+vanilla JS bundled by Vite.
// Backend Express runs on :4190; proxy /api so the browser only
// talks to one origin (no CORS issues in dev or preview).
export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 4191,
    proxy: {
      '/api': 'http://127.0.0.1:4190',
    },
  },
  preview: {
    port: 4191,
    proxy: {
      '/api': 'http://127.0.0.1:4190',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
