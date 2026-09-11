// config/env.ts
export const config = {
  // Hardcoded because Blogger doesn't support import.meta.env
  supabaseUrl: 'https://uanfdjcqiurpjihlmrvz.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhbmZkamNxaXVycGppaGxtcnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTQxNDYsImV4cCI6MjEwNDU5MDE0Nn0.KzQZ28VsMIKrZnsYvl5O-ezERU5Iak-cPYou9Wt2OlU',
};

export const isSupabaseConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey
);

export const env = {
  VITE_SUPABASE_URL: config.supabaseUrl,
  VITE_SUPABASE_ANON_KEY: config.supabaseAnonKey,
};