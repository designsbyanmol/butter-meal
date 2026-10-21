-- =========================================================
-- DISPUTE NOTIFICATION CLEAR — one-shot migration
-- Idempotent. Safe to re-run.
-- =========================================================

-- Per-tenant cursor for each bell's Clear-all. When a platform
-- admin clears their bell, `platform_disputes_cleared_before` is
-- bumped to NOW(). When a tenant admin clears theirs,
-- `tenant_disputes_cleared_before` is bumped.
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS platform_disputes_cleared_before TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tenant_disputes_cleared_before   TIMESTAMPTZ;

-- Platform admin clears their dispute notification list.
-- Note: the platform admin works across tenants, so this is a
-- single global cursor stored on the 'main' tenant row.
CREATE OR REPLACE FUNCTION clear_platform_disputes()
RETURNS TIMESTAMPTZ AS $$
DECLARE
  new_value TIMESTAMPTZ := NOW();
BEGIN
  UPDATE star_veg_tenants
  SET platform_disputes_cleared_before = new_value
  WHERE slug = 'main';

  RETURN new_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clear_platform_disputes()
  TO anon, authenticated;

-- Tenant admin clears their own dispute notification list.
CREATE OR REPLACE FUNCTION clear_tenant_disputes(
  tenant_slug_in TEXT
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  new_value TIMESTAMPTZ := NOW();
BEGIN
  UPDATE star_veg_tenants
  SET tenant_disputes_cleared_before = new_value
  WHERE slug = tenant_slug_in;

  RETURN new_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clear_tenant_disputes(TEXT)
  TO anon, authenticated;

-- Sanity check
SELECT slug, platform_disputes_cleared_before, tenant_disputes_cleared_before
FROM star_veg_tenants
WHERE slug IS NOT NULL
LIMIT 5;