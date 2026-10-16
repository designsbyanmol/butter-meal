-- =========================================================
-- DISPUTE NOTIFICATION READ STATE — one-shot migration
-- Idempotent. Safe to re-run.
-- =========================================================

ALTER TABLE star_veg_review_disputes
  ADD COLUMN IF NOT EXISTS platform_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tenant_seen_at   TIMESTAMPTZ;

-- Platform admin marks a dispute notification as seen.
CREATE OR REPLACE FUNCTION mark_dispute_platform_seen(
  dispute_id_in UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE star_veg_review_disputes
  SET platform_seen_at = COALESCE(platform_seen_at, NOW())
  WHERE id = dispute_id_in;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_dispute_platform_seen(UUID)
  TO anon, authenticated;

-- Tenant admin marks a resolved/rejected dispute notification as seen.
CREATE OR REPLACE FUNCTION mark_dispute_tenant_seen(
  dispute_id_in UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE star_veg_review_disputes
  SET tenant_seen_at = COALESCE(tenant_seen_at, NOW())
  WHERE id = dispute_id_in;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_dispute_tenant_seen(UUID)
  TO anon, authenticated;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'star_veg_review_disputes'
  AND column_name IN ('platform_seen_at', 'tenant_seen_at');