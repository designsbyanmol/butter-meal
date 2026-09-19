// services/supabase.client.ts
import { createClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from '../config/env';

export const supabase = isSupabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

// ---- DEV ONLY: attach to window for console debugging ----
if (typeof window !== 'undefined' && import.meta.env.DEV && supabase) {
  (window as any).supabase = supabase;
}

export { isSupabaseConfigured };