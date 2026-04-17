import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    headers: {
      // Pyodide wants a cross-origin isolated context for SharedArrayBuffer.
      // 'credentialless' lets us isolate without forcing CORP on every CDN asset.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'editor': ['@uiw/react-codemirror', '@codemirror/lang-html', '@codemirror/lang-python'],
          'blockly': ['blockly'],
          'motion': ['framer-motion', 'gsap'],
        },
      },
    },
  },
});
