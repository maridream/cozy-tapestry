/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps asset URLs relative so the build works both locally and
// under https://<user>.github.io/<repo>/ without knowing the repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
