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
    'banner_url', 'store_tagline',
    'delivery_charge', 'storewide_discount',
    'gst_percent', 'packing_charge'
  ) THEN
    RAISE EXCEPTION 'Field "%" is not editable through this RPC', field_in;
  END IF;

  UPDATE star_veg_tenants SET
    display_name       = CASE WHEN field_in = 'display_name'       THEN value_in               ELSE display_name       END,
    owner_phone        = CASE WHEN field_in = 'owner_phone'        THEN value_in               ELSE owner_phone        END,
    whatsapp_phone     = CASE WHEN field_in = 'whatsapp_phone'     THEN value_in               ELSE whatsapp_phone     END,
    banner_url         = CASE WHEN field_in = 'banner_url'         THEN value_in               ELSE banner_url         END,
    store_tagline      = CASE WHEN field_in = 'store_tagline'      THEN value_in               ELSE store_tagline      END,
    delivery_charge    = CASE WHEN field_in = 'delivery_charge'    THEN NULLIF(value_in,'')::NUMERIC
                                                                    ELSE delivery_charge    END,
    storewide_discount = CASE WHEN field_in = 'storewide_discount' THEN NULLIF(value_in,'')::NUMERIC
                                                                    ELSE storewide_discount END,
    gst_percent        = CASE WHEN field_in = 'gst_percent'        THEN NULLIF(value_in,'')::NUMERIC
                                                                    ELSE gst_percent        END,
    packing_charge     = CASE WHEN field_in = 'packing_charge'     THEN NULLIF(value_in,'')::NUMERIC
                                                                    ELSE packing_charge     END
  WHERE slug = tenant_slug_in
  RETURNING * INTO row;

  IF row IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_tenant_info(TEXT, TEXT, TEXT) TO anon, authenticated;