
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Only expose specific env variables, not the entire process.env
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY || ''),
    // Map Vite env to process.env for Firebase/Supabase SDKs
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth'],
          services: ['./services/geminiService', './services/modelService', './services/firebase'],
        },
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
