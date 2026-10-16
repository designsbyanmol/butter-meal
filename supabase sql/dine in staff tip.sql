-- =========================================================
-- DINE-IN STAFF TIP — one-shot migration
-- Idempotent. Safe to re-run.
-- =========================================================

-- Per-order tip amount in rupees. Included in total_amount;
-- not broken out anywhere else.
ALTER TABLE star_veg_dinein_orders
  ADD COLUMN IF NOT EXISTS staff_tip NUMERIC(10,2) DEFAULT 0;

-- Per-tenant feature flag. Only meaningful when dine-in is on.
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS staff_tipping_enabled BOOLEAN DEFAULT FALSE;

-- Customer sets the tip on their own order. Only allowed before
-- the bill is requested.
CREATE OR REPLACE FUNCTION set_dinein_staff_tip(
  order_id_in UUID,
  tip_in      NUMERIC
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord star_veg_dinein_orders;
  tip NUMERIC := GREATEST(0, COALESCE(tip_in, 0));
  base_subtotal NUMERIC;
  base_gst NUMERIC;
  base_packing NUMERIC;
  base_discount NUMERIC;
  new_total NUMERIC;
BEGIN
  SELECT * INTO ord FROM star_veg_dinein_orders WHERE id = order_id_in;
  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', order_id_in;
  END IF;

  -- Disallow changing the tip once the bill is requested or paid.
  IF ord.status NOT IN ('placed', 'accepted', 'preparing', 'served') THEN
    RAISE EXCEPTION 'Cannot set tip on an order in status %', ord.status;
  END IF;

  base_subtotal := COALESCE(ord.subtotal, 0);
  base_gst := COALESCE(ord.gst_amount, 0);
  base_packing := COALESCE(ord.packing_charge, 0);
  base_discount := COALESCE(ord.storewide_discount, 0);

  new_total := base_subtotal + base_gst + base_packing + tip - base_discount;

  UPDATE star_veg_dinein_orders
  SET
    staff_tip    = tip,
    total_amount = new_total,
    updated_at   = NOW()
  WHERE id = order_id_in
  RETURNING * INTO ord;

  RETURN ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_dinein_staff_tip(UUID, NUMERIC)
  TO anon, authenticated;

-- Also update appendDineinOrderItems' total recompute path. When new
-- items are appended, the recompute must preserve any existing tip.
-- The service does the math in JS, so we just need to make sure the
-- stored value is exposed to the client. No SQL change needed here —
-- the client reads `staff_tip` and includes it in the new total.

-- Allow the tip toggle to be written through update_tenant_info.
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
    'gst_percent', 'packing_charge',
    'upi_id', 'dinein_enabled', 'staff_tipping_enabled'
  ) THEN
    RAISE EXCEPTION 'Field "%" is not editable through this RPC', field_in;
  END IF;

  UPDATE star_veg_tenants SET
    display_name       = CASE WHEN field_in = 'display_name'       THEN value_in ELSE display_name END,
    owner_phone        = CASE WHEN field_in = 'owner_phone'        THEN value_in ELSE owner_phone END,
    whatsapp_phone     = CASE WHEN field_in = 'whatsapp_phone'     THEN value_in ELSE whatsapp_phone END,
    banner_url         = CASE WHEN field_in = 'banner_url'         THEN value_in ELSE banner_url END,
    store_tagline      = CASE WHEN field_in = 'store_tagline'      THEN value_in ELSE store_tagline END,
    delivery_charge    = CASE WHEN field_in = 'delivery_charge'    THEN NULLIF(value_in,'')::NUMERIC ELSE delivery_charge END,
    storewide_discount = CASE WHEN field_in = 'storewide_discount' THEN NULLIF(value_in,'')::NUMERIC ELSE storewide_discount END,
    gst_percent        = CASE WHEN field_in = 'gst_percent'        THEN NULLIF(value_in,'')::NUMERIC ELSE gst_percent END,
    packing_charge     = CASE WHEN field_in = 'packing_charge'     THEN NULLIF(value_in,'')::NUMERIC ELSE packing_charge END,
    upi_id             = CASE WHEN field_in = 'upi_id'             THEN NULLIF(value_in,'') ELSE upi_id END,
    dinein_enabled     = CASE WHEN field_in = 'dinein_enabled'     THEN (value_in = 'true') ELSE dinein_enabled END,
    staff_tipping_enabled = CASE WHEN field_in = 'staff_tipping_enabled' THEN (value_in = 'true') ELSE staff_tipping_enabled END
  WHERE slug = tenant_slug_in
  RETURNING * INTO row;

  IF row IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_tenant_info(TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- Sanity check
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('star_veg_dinein_orders', 'star_veg_tenants')
  AND column_name IN ('staff_tip', 'staff_tipping_enabled');