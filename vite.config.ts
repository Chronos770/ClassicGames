import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import path from 'path';

// Best-effort git lookups. If git isn't available (rare — even Vercel's
// build container has it), fall back to env vars Vercel/GH Actions
// already provide, and ultimately to literals so the build never fails.
function safeGit(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

const buildSha =
  safeGit('git rev-parse --short HEAD') ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.GITHUB_SHA?.slice(0, 7) ||
  'unknown';

const buildMessage =
  safeGit('git log -1 --pretty=%s') ||
  process.env.VERCEL_GIT_COMMIT_MESSAGE?.split('\n')[0] ||
  '';

const buildTime = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
    __BUILD_MESSAGE__: JSON.stringify(buildMessage),
    __BUILD_TIME__: JSON.stringify(buildTime),
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
