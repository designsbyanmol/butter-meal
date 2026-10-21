// config/env.ts

/**
 * Runtime config for the Supabase client, table names, and Razorpay
 * key. Everything here is client-safe (public anon key + public key
 * only). Secrets live in Supabase function env vars, never here.
 */
export const config = {
  supabaseUrl: 'https://bhnuktahneeuujtxqolb.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobnVrdGFobmVldXVqdHhxb2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDI3ODcsImV4cCI6MjEwMzkxODc4N30.onOTbSo_GbBEH_E1_O1iLQnL59UF0JnfRhhuIF6I38M',

  // All table names the app touches. Kept here so `tables.ts`
  // can reference every table the codebase uses.
  tables: {
    menu: 'star_veg_menu_items',
    users: 'star_veg_users',
    storeSettings: 'star_veg_store_settings',
    tenants: 'star_veg_tenants',
    plans: 'star_veg_plans',
    invoices: 'star_veg_invoices',
    pauseRequests: 'star_veg_pause_requests',
    reviews: 'star_veg_reviews',
    reviewDisputes: 'star_veg_review_disputes',
    dineinTables: 'star_veg_dinein_tables',
    dineinOrders: 'star_veg_dinein_orders',
    dineinEvents: 'star_veg_dinein_events',
    dineinOrderCounter: 'star_veg_dinein_order_counter',
    authLoginAttempts: 'auth_login_attempts',
  },

  razorpay: {
    keyId: 'rzp_test_TdSomk4m8hX0be', // public, safe in the browser
    // The secret is stored only in Supabase function env vars.
  },
};

export const isSupabaseConfigured = Boolean(
  config.supabaseUrl && config.supabaseAnonKey,
);

/**
 * Mirrors of the config exposed as `import.meta.env.VITE_*` vars.
 * Kept for code that reads through the Vite env convention instead
 * of importing `config` directly.
 */
export const env = {
  VITE_SUPABASE_URL: config.supabaseUrl,
  VITE_SUPABASE_ANON_KEY: config.supabaseAnonKey,
};