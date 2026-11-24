import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'calculator-entry',
      apply: 'build',
      generateBundle: {
        order: 'post',
        handler(_options, bundle) {
          const index = bundle['index.html'];
          if (index?.type === 'asset' && typeof index.source === 'string') {
            const html = index.source.replace(/\r\n/g, '\n');
            index.source = html;
            this.emitFile({ type: 'asset', fileName: 'kalkulyator/index.html', source: html });
          }
        },
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});