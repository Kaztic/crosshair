import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Add Monaco Editor as a dependency to be optimized
    include: ['monaco-editor/esm/vs/language/typescript/ts.worker'],
    esbuildOptions: {
      // Needed for Monaco workers
      target: 'es2020',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Monaco Editor into a separate chunk
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
  resolve: {
    dedupe: ['monaco-editor'],
  },
  worker: {
    format: 'es',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  }
}); 