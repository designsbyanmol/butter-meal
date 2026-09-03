// config/env.ts
// ✅ No import.meta - Use this for single HTML file
export const config = {
  supabaseUrl: 'https://bhnuktahneeuujtxqolb.supabase.co',
  supabaseAnonKey: 'sb_publishable_rVK6WY1hvZoH-k8wectyAA_NbIsr-TA',
};

export const isSupabaseConfigured = true;

// ✅ Export for backward compatibility
export const env = {
  VITE_SUPABASE_URL: config.supabaseUrl,
  VITE_SUPABASE_ANON_KEY: config.supabaseAnonKey,
};