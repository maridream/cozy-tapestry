/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps asset URLs relative so the build works both locally and
// under https://<user>.github.io/<repo>/ without knowing the repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      // The cutout runs on the CPU only, and its WASM files are self-hosted in public/models/imgly/.
      // Use onnxruntime's CPU-only build so the GPU variant and its 24 MB WASM are not copied into dist/.
      { find: /^onnxruntime-web(\/webgpu)?$/, replacement: 'onnxruntime-web/wasm' },
    ],
  },
  server: { port: 5173, strictPort: true },
  // ES-module workers so the background-removal worker can lazy-load its own chunks.
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
