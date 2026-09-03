// services/supabase.client.ts
import { createClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from '../config/env';

// Log configuration status
console.log('🔧 Initializing Supabase Client...');
console.log('Supabase URL:', config.supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Supabase Key:', config.supabaseAnonKey ? '✅ Set' : '❌ Missing');

// Only create client if Supabase is configured
export const supabase = isSupabaseConfigured 
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;

console.log('Supabase Client:', supabase ? '✅ Created' : '❌ Not Created');

export { isSupabaseConfigured };