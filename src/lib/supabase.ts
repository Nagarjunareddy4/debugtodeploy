import { createClient } from '@supabase/supabase-js';

// These are build-time constants injected by vite.config.ts via `define`.
// They are NOT accessible through import.meta.env and are NOT prefixed with
// VITE_, so they won't be trivially discoverable as named env vars in the bundle.
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

const supabaseUrl: string = __SUPABASE_URL__;
const supabaseAnonKey: string = __SUPABASE_ANON_KEY__;

if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
  console.warn('Supabase URL is missing. Please configure SUPABASE_URL in your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    },
    global: {
      headers: { 'x-application-name': 'debugtodeploy' }
    }
  }
);
