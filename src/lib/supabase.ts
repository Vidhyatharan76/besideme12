import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured =
  Boolean(rawUrl && rawAnonKey) &&
  !rawUrl.includes('placeholder.supabase.co') &&
  !rawAnonKey.includes('placeholder-key');

const supabaseUrl = rawUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = rawAnonKey || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
