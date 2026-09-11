-- =====================================================================
-- 0. DIAGNOSTIC: Check if the table already exists anywhere
-- =====================================================================
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name = 'star_veg_store_settings';

-- =====================================================================
-- 1. CREATE TABLE IF NOT EXISTS (safe to run even if it exists)
--    Includes all NEW columns already so the ALTERs below are no-ops
--    if the table was just created.
-- =====================================================================
CREATE TABLE IF NOT EXISTS star_veg_store_settings (
  id                  INTEGER PRIMARY KEY,
  is_open             BOOLEAN      DEFAULT false,
  closed_message      TEXT         DEFAULT '',
  expected_open_date  DATE         DEFAULT NULL,
  expected_open_time  TIME         DEFAULT NULL,
  last_updated        TIMESTAMPTZ  DEFAULT NOW()
);

-- =====================================================================
-- 2. DROP old columns that are no longer needed
-- =====================================================================
ALTER TABLE star_veg_store_settings 
  DROP COLUMN IF EXISTS auto_open_enabled,
  DROP COLUMN IF EXISTS auto_open_date,
  DROP COLUMN IF EXISTS auto_open_time,
  DROP COLUMN IF EXISTS auto_open_days,
  DROP COLUMN IF EXISTS auto_open_close_time,
  DROP COLUMN IF EXISTS auto_open_close_date,
  DROP COLUMN IF EXISTS holiday_enabled,
  DROP COLUMN IF EXISTS holiday_start_date,
  DROP COLUMN IF EXISTS holiday_start_time,
  DROP COLUMN IF EXISTS holiday_end_date,
  DROP COLUMN IF EXISTS holiday_end_time;

-- =====================================================================
-- 3. ADD new columns (IF NOT EXISTS protects against re-runs)
-- =====================================================================
ALTER TABLE star_veg_store_settings 
  ADD COLUMN IF NOT EXISTS closed_message     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_open_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expected_open_time TIME DEFAULT NULL;

-- =====================================================================
-- 4. Ensure the required base columns exist too
--    (in case the table pre-existed without them)
-- =====================================================================
ALTER TABLE star_veg_store_settings 
  ADD COLUMN IF NOT EXISTS is_open      BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- =====================================================================
-- 5. Seed the singleton row (id = 1) if missing
-- =====================================================================
INSERT INTO star_veg_store_settings (id, is_open, closed_message, expected_open_date, expected_open_time, last_updated)
VALUES (1, false, '', NULL, NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 6. Normalize existing row values
-- =====================================================================
UPDATE star_veg_store_settings 
SET 
  closed_message     = COALESCE(closed_message, ''),
  expected_open_date = NULL,
  expected_open_time = NULL,
  last_updated       = NOW()
WHERE id = 1;

-- =====================================================================
-- 7. VERIFY final structure
-- =====================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'star_veg_store_settings'
ORDER BY ordinal_position;

-- =====================================================================
-- 8. VERIFY data in the singleton row
-- =====================================================================
SELECT * FROM star_veg_store_settings WHERE id = 1;