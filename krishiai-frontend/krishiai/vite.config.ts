
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Satisfies the process.env.API_KEY requirement in browser environments
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.SUPABASE_KEY': JSON.stringify(process.env.SUPABASE_KEY)
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});
