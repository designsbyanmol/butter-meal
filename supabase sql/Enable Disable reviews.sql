-- =========================================================
-- 1. Add reviews_enabled to tenants
-- =========================================================
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS reviews_enabled BOOLEAN DEFAULT TRUE;

UPDATE star_veg_tenants
SET reviews_enabled = TRUE
WHERE reviews_enabled IS NULL;

-- =========================================================
-- 2. RPC: set reviews_enabled for a single tenant
-- =========================================================
CREATE OR REPLACE FUNCTION set_tenant_reviews_enabled(
  tenant_slug_in TEXT,
  enabled_in     BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE star_veg_tenants
  SET reviews_enabled = enabled_in
  WHERE slug = tenant_slug_in;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_tenant_reviews_enabled(TEXT, BOOLEAN)
TO anon, authenticated;

-- =========================================================
-- 3. RPC: global switch (main row)
-- =========================================================
CREATE OR REPLACE FUNCTION set_global_reviews_enabled(
  enabled_in BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE star_veg_tenants
  SET reviews_enabled = enabled_in
  WHERE slug = 'main';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_global_reviews_enabled(BOOLEAN)
TO anon, authenticated;

-- =========================================================
-- 4. RPC: effective state for a tenant
--    (renamed local vars — `global_on` was clashing with
--     the reserved word `global`)
-- =========================================================
CREATE OR REPLACE FUNCTION reviews_effective_for_tenant(
  tenant_slug_in TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  is_global_on BOOLEAN;
  is_tenant_on BOOLEAN;
BEGIN
  SELECT reviews_enabled INTO is_global_on
  FROM star_veg_tenants
  WHERE slug = 'main';

  IF is_global_on IS NULL THEN
    is_global_on := TRUE;
  END IF;

  SELECT reviews_enabled INTO is_tenant_on
  FROM star_veg_tenants
  WHERE slug = tenant_slug_in;

  IF is_tenant_on IS NULL THEN
    is_tenant_on := TRUE;
  END IF;

  RETURN is_global_on AND is_tenant_on;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reviews_effective_for_tenant(TEXT)
TO anon, authenticated;