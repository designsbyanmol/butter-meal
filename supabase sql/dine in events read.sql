-- =========================================================
-- DINE-IN EVENT READ STATE — one-shot migration
-- Idempotent. Safe to re-run.
-- =========================================================

ALTER TABLE star_veg_dinein_events
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dinein_events_unread
  ON star_veg_dinein_events(tenant_slug, read_at)
  WHERE read_at IS NULL;

-- Mark a single event as read. Called when the admin clicks it.
CREATE OR REPLACE FUNCTION mark_dinein_event_read(
  event_id_in UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE star_veg_dinein_events
  SET read_at = COALESCE(read_at, NOW())
  WHERE id = event_id_in;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_dinein_event_read(UUID)
  TO anon, authenticated;

-- Mark all currently-unread events for a tenant as read. Used by the
-- "Clear all" button if you want server-side persistence there too.
CREATE OR REPLACE FUNCTION mark_all_dinein_events_read(
  tenant_slug_in TEXT
) RETURNS INTEGER AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE star_veg_dinein_events
  SET read_at = NOW()
  WHERE tenant_slug = tenant_slug_in
    AND read_at IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_all_dinein_events_read(TEXT)
  TO anon, authenticated;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'star_veg_dinein_events'
  AND column_name = 'read_at';