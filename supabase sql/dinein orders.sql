-- =========================================================
-- Dine-in tables (customer-defined)
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_dinein_tables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  tenant_slug   TEXT NOT NULL,
  -- Either a number (1, 2, 3...) or a name ("Fools", "Chai Lovers")
  label         TEXT NOT NULL,
  label_kind    TEXT NOT NULL CHECK (label_kind IN ('number', 'name')),
  -- Device identifiers of customers who have joined this table.
  device_ids    TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, label)
);

CREATE INDEX IF NOT EXISTS idx_dinein_tables_tenant
  ON star_veg_dinein_tables(tenant_slug, updated_at DESC);

-- =========================================================
-- Dine-in orders
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_dinein_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  tenant_slug       TEXT NOT NULL,
  table_id          UUID NOT NULL REFERENCES star_veg_dinein_tables(id) ON DELETE CASCADE,
  -- Snapshot of the label at the time of order (in case the table renames)
  table_label       TEXT NOT NULL,
  table_label_kind  TEXT NOT NULL,
  -- The customer's chosen display name (from CustomerNameModal)
  customer_name     TEXT NOT NULL DEFAULT '',
  -- Device ids (mirror of the table) for "who placed what"
  device_id         TEXT,
  -- Item lines stored as JSONB, snapshot at order time
  items             JSONB NOT NULL,
  subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_percent       NUMERIC(5,2)  NOT NULL DEFAULT 0,
  gst_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  packing_charge    NUMERIC(10,2) NOT NULL DEFAULT 0,
  storewide_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'bill_requested', 'paid', 'cancelled')),
  bill_requested    BOOLEAN DEFAULT FALSE,
  bill_requested_at TIMESTAMPTZ,
  pay_online        BOOLEAN DEFAULT FALSE,    -- customer chose online
  paid_at           TIMESTAMPTZ,
  payment_ref       TEXT,                     -- UPI ref / razorpay id
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dinein_orders_tenant_status
  ON star_veg_dinein_orders(tenant_slug, status, created_at DESC);

-- =========================================================
-- Customer actions log (used for the notification feed)
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_dinein_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  tenant_slug   TEXT NOT NULL,
  order_id      UUID NOT NULL REFERENCES star_veg_dinein_orders(id) ON DELETE CASCADE,
  table_label   TEXT NOT NULL,
  kind          TEXT NOT NULL
                CHECK (kind IN ('order', 'bill_request', 'rating')),
  payload       JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dinein_events_tenant
  ON star_veg_dinein_events(tenant_slug, created_at DESC);

-- =========================================================
-- Tenant columns
-- =========================================================
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS dinein_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS upi_id         TEXT;

-- Allow editing via update_tenant_info
-- (rerun the RPC with the two new fields added to the allow-list)
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
    'upi_id'
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
    upi_id             = CASE WHEN field_in = 'upi_id'             THEN NULLIF(value_in,'') ELSE upi_id END
  WHERE slug = tenant_slug_in
  RETURNING * INTO row;

  IF row IS NULL THEN RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in; END IF;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_tenant_info(TEXT, TEXT, TEXT) TO anon, authenticated;