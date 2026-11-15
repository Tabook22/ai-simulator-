import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// PORT and NEURON_LAB_API let a second copy run beside one that is already open.
const port = Number(process.env.PORT) || 5173;
const backend = process.env.NEURON_LAB_API || 'http://127.0.0.1:8000';
const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Every element is created through src/i18n-jsx, which translates its text (see src/translate.ts).
  plugins: [react({ jsxImportSource: 'neuron-i18n' })],
  resolve: {
    alias: {
      'neuron-i18n/jsx-dev-runtime': local('./src/i18n-jsx/jsx-dev-runtime.ts'),
      'neuron-i18n/jsx-runtime': local('./src/i18n-jsx/jsx-runtime.ts'),
    },
  },
  server: {
    port,
    strictPort: true,
    proxy: { '/api': backend },
  },
});
