-- ============================================
-- FILE: 03_star_veg_store_settings.sql
-- PURPOSE: Store settings singleton row
-- IDEMPOTENT: Safe to run multiple times
-- ============================================

CREATE TABLE IF NOT EXISTS star_veg_store_settings (
  id                  INTEGER PRIMARY KEY,
  is_open             BOOLEAN      DEFAULT false,
  closed_message      TEXT         DEFAULT '',
  expected_open_date  DATE         DEFAULT NULL,
  expected_open_time  TIME         DEFAULT NULL,
  last_updated        TIMESTAMPTZ  DEFAULT NOW(),
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE star_veg_store_settings
  ADD COLUMN IF NOT EXISTS closed_message     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_open_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expected_open_time TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_open            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_updated       TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ DEFAULT NOW();

-- Seed singleton
INSERT INTO star_veg_store_settings (id, is_open, closed_message, last_updated, created_at)
VALUES (1, false, '', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Normalize (but DO NOT wipe expected dates on re-run)
UPDATE star_veg_store_settings
SET
  closed_message = COALESCE(closed_message, ''),
  last_updated   = NOW()
WHERE id = 1;

-- RLS
ALTER TABLE IF EXISTS star_veg_store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read settings" ON star_veg_store_settings;
CREATE POLICY "public read settings" ON star_veg_store_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "no public write settings" ON star_veg_store_settings;
CREATE POLICY "no public write settings" ON star_veg_store_settings
  FOR ALL USING (false) WITH CHECK (false);

-- Upsert through a function
CREATE OR REPLACE FUNCTION upsert_store_settings(
  is_open_in BOOLEAN,
  closed_message_in TEXT,
  expected_open_date_in DATE,
  expected_open_time_in TIME
) RETURNS star_veg_store_settings AS $$
DECLARE
  row star_veg_store_settings;
BEGIN
  INSERT INTO star_veg_store_settings (
    id, is_open, closed_message, expected_open_date, expected_open_time, last_updated
  )
  VALUES (
    1, is_open_in, COALESCE(closed_message_in, ''), expected_open_date_in, expected_open_time_in, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    is_open            = EXCLUDED.is_open,
    closed_message     = EXCLUDED.closed_message,
    expected_open_date = EXCLUDED.expected_open_date,
    expected_open_time = EXCLUDED.expected_open_time,
    last_updated       = NOW()
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT SELECT ON star_veg_store_settings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_store_settings(BOOLEAN, TEXT, DATE, TIME) TO anon, authenticated;