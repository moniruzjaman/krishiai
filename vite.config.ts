
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vite uses import.meta.env, but we also support process.env for compatibility
    'process.env': process.env,
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || ''),
    // Map Vite env to process.env for Firebase/Supabase SDKs
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth'],
        }
      }
    },
    // Ignore TypeScript errors during build
    target: 'esnext',
  },
  server: {
    port: 3000,
    host: true
  },
  // Skip TypeScript checking during build
  esbuild: {
    logLevel: 'warning',
  },
});
