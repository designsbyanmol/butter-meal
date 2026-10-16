-- =========================================================
-- DINE-IN EVENTS: separate READ from CLEAR
-- Idempotent. Safe to re-run.
-- =========================================================

-- Per-tenant "cleared before" cursor. Events older than this are
-- hidden from the drawer on every device. Distinct from `read_at`,
-- which only affects the read/unread styling.
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS dinein_events_cleared_before TIMESTAMPTZ;

-- Bump the cursor to NOW. Called by the drawer's Clear-all button.
CREATE OR REPLACE FUNCTION clear_dinein_events(
  tenant_slug_in TEXT
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  new_value TIMESTAMPTZ := NOW();
BEGIN
  UPDATE star_veg_tenants
  SET dinein_events_cleared_before = new_value
  WHERE slug = tenant_slug_in;

  RETURN new_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clear_dinein_events(TEXT)
  TO anon, authenticated;

-- Sanity check
SELECT slug, dinein_events_cleared_before
FROM star_veg_tenants
WHERE slug IS NOT NULL
LIMIT 5;