import { defineConfig } from 'vitest/config';
import solidPlugin from '@solidjs/vite-plugin';

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
