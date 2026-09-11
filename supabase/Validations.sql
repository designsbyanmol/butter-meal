-- ============================================
-- FILE: 03_validation_and_triggers.sql
-- PURPOSE: Triggers, functions, permissions and validation
-- IDEMPOTENT: Safe to run multiple times
-- ============================================

-- ============================================
-- 0. CLEANUP: DROP UNWANTED TABLES
-- ============================================
-- Keeps only: star_veg_menu_items, star_veg_users, star_veg_store_settings
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
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- ============================================
-- 1. UPDATED_AT FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 2. DROP EXISTING TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_star_veg_menu_items_updated_at ON star_veg_menu_items;

-- ============================================
-- 3. CREATE TRIGGERS
-- ============================================
CREATE TRIGGER update_star_veg_menu_items_updated_at
BEFORE UPDATE ON star_veg_menu_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4-6. DROP + RE-ADD CONSTRAINTS (idempotent)
-- ============================================
ALTER TABLE star_veg_menu_items DROP CONSTRAINT IF EXISTS check_price_positive;
ALTER TABLE star_veg_menu_items DROP CONSTRAINT IF EXISTS check_cost_price_positive;
ALTER TABLE star_veg_menu_items DROP CONSTRAINT IF EXISTS check_rating_range;
ALTER TABLE star_veg_menu_items DROP CONSTRAINT IF EXISTS check_review_count_positive;

ALTER TABLE star_veg_menu_items
    ADD CONSTRAINT check_price_positive CHECK (price > 0);

ALTER TABLE star_veg_menu_items
    ADD CONSTRAINT check_cost_price_positive CHECK (cost_price IS NULL OR cost_price >= 0);

ALTER TABLE star_veg_menu_items
    ADD CONSTRAINT check_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

ALTER TABLE star_veg_menu_items
    ADD CONSTRAINT check_review_count_positive CHECK (review_count >= 0);

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- 8. VERIFICATION
-- ============================================
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  tgfoid::regproc AS function_name
FROM pg_trigger
WHERE tgrelid::regclass::text = 'star_veg_menu_items'
  AND tgisinternal = false;

SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'star_veg_menu_items'::regclass;

SELECT
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT 'star_veg_users' AS table_name, COUNT(*) AS row_count FROM star_veg_users
UNION ALL
SELECT 'star_veg_menu_items', COUNT(*) FROM star_veg_menu_items
UNION ALL
SELECT 'star_veg_store_settings', COUNT(*) FROM star_veg_store_settings;

-- ============================================
-- END OF VALIDATION AND TRIGGERS
-- ============================================