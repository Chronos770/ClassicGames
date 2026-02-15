import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'pixi': ['pixi.js'],
          'three': ['three'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 8001,
  },
});
