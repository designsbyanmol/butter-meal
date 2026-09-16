-- =========================================================
-- 1. Add new info columns to tenants
-- =========================================================
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS banner_url        TEXT,
  ADD COLUMN IF NOT EXISTS store_tagline     TEXT,
  ADD COLUMN IF NOT EXISTS delivery_charge   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storewide_discount NUMERIC(5,2) DEFAULT 0;

-- =========================================================
-- 2. Sanity checks on ranges
-- =========================================================
ALTER TABLE star_veg_tenants
  DROP CONSTRAINT IF EXISTS check_storewide_discount_range;
ALTER TABLE star_veg_tenants
  ADD CONSTRAINT check_storewide_discount_range
  CHECK (storewide_discount IS NULL OR (storewide_discount >= 0 AND storewide_discount <= 100));

ALTER TABLE star_veg_tenants
  DROP CONSTRAINT IF EXISTS check_delivery_charge_positive;
ALTER TABLE star_veg_tenants
  ADD CONSTRAINT check_delivery_charge_positive
  CHECK (delivery_charge IS NULL OR delivery_charge >= 0);

-- =========================================================
-- 3. RPC to update a single field at a time
-- =========================================================
CREATE OR REPLACE FUNCTION update_tenant_info(
  tenant_slug_in TEXT,
  field_in       TEXT,
  value_in       TEXT
) RETURNS star_veg_tenants AS $$
DECLARE
  row star_veg_tenants;
BEGIN
  -- Allow-list of editable columns (guards against SQL injection)
  IF field_in NOT IN (
    'display_name', 'owner_phone', 'whatsapp_phone',
    'banner_url', 'store_tagline',
    'delivery_charge', 'storewide_discount'
  ) THEN
    RAISE EXCEPTION 'Field "%" is not editable through this RPC', field_in;
  END IF;

  -- Explicit per-field UPDATE, all in one statement using CASE
  UPDATE star_veg_tenants SET
    display_name       = CASE WHEN field_in = 'display_name'       THEN value_in               ELSE display_name       END,
    owner_phone        = CASE WHEN field_in = 'owner_phone'        THEN value_in               ELSE owner_phone        END,
    whatsapp_phone     = CASE WHEN field_in = 'whatsapp_phone'     THEN value_in               ELSE whatsapp_phone     END,
    banner_url         = CASE WHEN field_in = 'banner_url'         THEN value_in               ELSE banner_url         END,
    store_tagline      = CASE WHEN field_in = 'store_tagline'      THEN value_in               ELSE store_tagline      END,
    delivery_charge    = CASE WHEN field_in = 'delivery_charge'    THEN NULLIF(value_in,'')::NUMERIC
                                                                    ELSE delivery_charge    END,
    storewide_discount = CASE WHEN field_in = 'storewide_discount' THEN NULLIF(value_in,'')::NUMERIC
                                                                    ELSE storewide_discount END
  WHERE slug = tenant_slug_in
  RETURNING * INTO row;

  IF row IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_tenant_info(TEXT, TEXT, TEXT) TO anon, authenticated;