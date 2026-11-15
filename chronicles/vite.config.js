import { defineConfig } from 'vite';

// base './' erlaubt das Hosten in einem Unterordner (z. B. glutwerk/chronicles/ auf GitHub Pages)
export default defineConfig({
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0, target: 'es2020' },
  server: { port: 5173 },
});
