// config/env.ts
export const config = {
  supabaseUrl: 'https://bhnuktahneeuujtxqolb.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobnVrdGFobmVldXVqdHhxb2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDI3ODcsImV4cCI6MjEwMzkxODc4N30.onOTbSo_GbBEH_E1_O1iLQnL59UF0JnfRhhuIF6I38M',

  // Table names — kept here for consistency with Supabase creds
  tables: {
    menu: 'star_veg_menu_items',
    users: 'star_veg_users',
    storeSettings: 'star_veg_store_settings',
  },

  // Third-party API keys
  imgApiKey: '62ab93456c2cb8232f6f216a1475426d',
};

export const isSupabaseConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey,
);

export const env = {
  VITE_SUPABASE_URL: config.supabaseUrl,
  VITE_SUPABASE_ANON_KEY: config.supabaseAnonKey,
};