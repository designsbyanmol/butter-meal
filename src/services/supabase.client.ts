// services/supabase.client.ts
import { createClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from '../config/env';

// Only create client if Supabase is configured
export const supabase = isSupabaseConfigured 
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

export { isSupabaseConfigured };