import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  return (import.meta as any).env?.[key] || process.env[key] || '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
  console.warn('Supabase URL is missing. Please configure NEXT_PUBLIC_SUPABASE_URL in the Secrets panel.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
