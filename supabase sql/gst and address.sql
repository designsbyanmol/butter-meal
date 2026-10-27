-- 1. Add new columns to tenants
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS gst_no TEXT,
  ADD COLUMN IF NOT EXISTS store_address TEXT;

-- 2. Drop the existing function so it can be re-created
DROP FUNCTION IF EXISTS update_tenant_info(TEXT, TEXT, TEXT);

-- 3. Re-create it with the new fields added to the allow-list
CREATE OR REPLACE FUNCTION update_tenant_info(
  tenant_slug_in TEXT,
  field_in       TEXT,
  value_in       TEXT
) RETURNS star_veg_tenants AS $$
DECLARE
  row star_veg_tenants;
BEGIN
  IF field_in NOT IN (
    'display_name', 'owner_phone', 'whatsapp_phone',
    'banner_url', 'avatar_url', 'store_tagline',
    'delivery_charge', 'storewide_discount',
    'gst_percent', 'packing_charge',
    'upi_id', 'dinein_enabled', 'staff_tipping_enabled',
    'gst_no', 'store_address'
  ) THEN
    RAISE EXCEPTION 'Field "%" is not editable through this RPC', field_in;
  END IF;

  UPDATE star_veg_tenants SET
    display_name          = CASE WHEN field_in = 'display_name'          THEN value_in ELSE display_name          END,
    owner_phone           = CASE WHEN field_in = 'owner_phone'           THEN value_in ELSE owner_phone           END,
    whatsapp_phone        = CASE WHEN field_in = 'whatsapp_phone'        THEN value_in ELSE whatsapp_phone        END,
    banner_url            = CASE WHEN field_in = 'banner_url'            THEN NULLIF(value_in,'') ELSE banner_url            END,
    avatar_url            = CASE WHEN field_in = 'avatar_url'            THEN NULLIF(value_in,'') ELSE avatar_url            END,
    store_tagline         = CASE WHEN field_in = 'store_tagline'         THEN value_in ELSE store_tagline         END,
    delivery_charge       = CASE WHEN field_in = 'delivery_charge'       THEN NULLIF(value_in,'')::NUMERIC ELSE delivery_charge       END,
    storewide_discount    = CASE WHEN field_in = 'storewide_discount'    THEN NULLIF(value_in,'')::NUMERIC ELSE storewide_discount    END,
    gst_percent           = CASE WHEN field_in = 'gst_percent'           THEN NULLIF(value_in,'')::NUMERIC ELSE gst_percent           END,
    packing_charge        = CASE WHEN field_in = 'packing_charge'        THEN NULLIF(value_in,'')::NUMERIC ELSE packing_charge        END,
    upi_id                = CASE WHEN field_in = 'upi_id'                THEN NULLIF(value_in,'') ELSE upi_id                END,
    dinein_enabled        = CASE WHEN field_in = 'dinein_enabled'        THEN (value_in = 'true') ELSE dinein_enabled        END,
    staff_tipping_enabled = CASE WHEN field_in = 'staff_tipping_enabled' THEN (value_in = 'true') ELSE staff_tipping_enabled END,
    gst_no                = CASE WHEN field_in = 'gst_no'                THEN NULLIF(value_in,'') ELSE gst_no                END,
    store_address         = CASE WHEN field_in = 'store_address'         THEN NULLIF(value_in,'') ELSE store_address         END
  WHERE slug = tenant_slug_in
  RETURNING * INTO row;

  IF row IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_tenant_info(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 4. Verify the columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'star_veg_tenants'
  AND column_name IN ('gst_no', 'store_address');