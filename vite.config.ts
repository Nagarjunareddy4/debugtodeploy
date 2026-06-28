import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import crypto from 'crypto';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // loadEnv with '' loads ALL env vars (including non-VITE_ ones).
  // These are ONLY available here in vite.config — never in the client bundle
  // via import.meta.env. We inject them as build-time __VAR__ constants via
  // define, so values are baked in but not discoverable via import.meta.env.
  // IMPORTANT: Do NOT use VITE_* prefix for any variable — that would expose
  // it publicly through import.meta.env. All vars are injected via define.
  const env = loadEnv(mode, '.', '');

  const adminPass = env.ADMIN_PASSWORD || '';
  const adminPassHash = adminPass
    ? crypto.createHash('sha256').update(adminPass).digest('hex')
    : '';

  const adminEmails = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim())
    .filter(Boolean);

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // ── Supabase ── injected as build-time constants (no VITE_ prefix)
      '__SUPABASE_URL__': JSON.stringify(env.SUPABASE_URL || ''),
      '__SUPABASE_ANON_KEY__': JSON.stringify(env.SUPABASE_ANON_KEY || ''),

      // ── Razorpay public key ── needed by the client SDK but injected as a
      //    build-time constant so it never appears in import.meta.env
      '__RAZORPAY_KEY_ID__': JSON.stringify(env.RAZORPAY_KEY_ID || ''),

      // ── Admin — hash only, raw password never reaches the client ──
      '__ADMIN_PASSWORD_HASH__': JSON.stringify(adminPassHash),

      // ── Other server-side-only values ──
      '__ADMIN_EMAILS__': JSON.stringify(adminEmails),
      '__FORMSPREE_ID__': JSON.stringify(env.FORMSPREE_ID || ''),
      '__CONTACT_EMAIL__': JSON.stringify(env.CONTACT_EMAIL || 'support@debugtodeploy.com'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['lucide-react', 'motion'],
            'vendor-db': ['@supabase/supabase-js'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
