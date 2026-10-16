// vite.config.ts
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Relative base keeps asset URLs working after deployment (Render Static Site).
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Keep the 3D engine in its own cacheable chunk.
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
