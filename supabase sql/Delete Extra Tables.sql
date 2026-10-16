-- ============================================================
-- Drop every public table except star_veg_menu_items,
-- star_veg_users, and star_veg_store_settings.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  keep_tables TEXT[] := ARRAY[
    'star_veg_menu_items',
    'star_veg_users',
    'star_veg_store_settings'
  ];
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> ALL(keep_tables)
  LOOP
    RAISE NOTICE 'Dropping table: %', r.tablename;
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;

  RAISE NOTICE 'Cleanup complete. Kept: %', array_to_string(keep_tables, ', ');
END $$;