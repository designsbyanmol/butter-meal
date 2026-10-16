-- ============================================
-- FILE: 04_validation_and_triggers.sql
-- PURPOSE: Triggers, functions, permissions and validation
-- IDEMPOTENT: Safe to run multiple times
-- ⚠️  NO automated DROP-everything. Do that manually if needed.
-- ============================================

-- ============================================
-- 1. UPDATED_AT FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ============================================
-- 2. DROP + RE-CREATE TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_star_veg_menu_items_updated_at ON star_veg_menu_items;

CREATE TRIGGER update_star_veg_menu_items_updated_at
BEFORE UPDATE ON star_veg_menu_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. DROP + RE-ADD CONSTRAINTS (idempotent)
-- ============================================
ALTER TABLE star_veg_menu_items DROP CONSTRAINT IF EXISTS check_price_positive;
ALTER TABLE star_veg_menu_items DROP CONSTRAINT IF EXISTS check_cost_price_positive;
ALTER TABLE star_veg_menu_items DROP CONSTRAINT IF EXISTS check_rating_range;
ALTER TABLE star_veg_menu_items DROP CONSTRAINT IF EXISTS check_review_count_positive;

-- Relax price to allow free items (>= 0)
ALTER TABLE star_veg_menu_items
    ADD CONSTRAINT check_price_positive CHECK (price >= 0);

ALTER TABLE star_veg_menu_items
    ADD CONSTRAINT check_cost_price_positive CHECK (cost_price IS NULL OR cost_price >= 0);

ALTER TABLE star_veg_menu_items
    ADD CONSTRAINT check_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

ALTER TABLE star_veg_menu_items
    ADD CONSTRAINT check_review_count_positive CHECK (review_count >= 0);

-- ============================================
-- 4. VERIFICATION
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

-- Cross-table counts (guarded for fresh installs)
DO $$
DECLARE
  users_cnt INT := 0;
  menu_cnt  INT := 0;
  set_cnt   INT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='star_veg_users') THEN
    EXECUTE 'SELECT COUNT(*) FROM star_veg_users' INTO users_cnt;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='star_veg_menu_items') THEN
    EXECUTE 'SELECT COUNT(*) FROM star_veg_menu_items' INTO menu_cnt;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='star_veg_store_settings') THEN
    EXECUTE 'SELECT COUNT(*) FROM star_veg_store_settings' INTO set_cnt;
  END IF;
  RAISE NOTICE 'users=%, menu=%, settings=%', users_cnt, menu_cnt, set_cnt;
END $$;