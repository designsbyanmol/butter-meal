-- =========================================================
-- HOSPITAL BILLING & PARTICULARS SCHEMA
-- =========================================================

-- 1. Add registration_no to tenants
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS registration_no TEXT;

-- Allow editing via update_tenant_info
DROP FUNCTION IF EXISTS update_tenant_info(TEXT, TEXT, TEXT);
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
    'gst_no', 'store_address', 'registration_no'
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
    store_address         = CASE WHEN field_in = 'store_address'         THEN NULLIF(value_in,'') ELSE store_address         END,
    registration_no       = CASE WHEN field_in = 'registration_no'       THEN NULLIF(value_in,'') ELSE registration_no       END
  WHERE slug = tenant_slug_in
  RETURNING * INTO row;

  IF row IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_tenant_info(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 2. Hospital Particulars (for IPD)
CREATE TABLE IF NOT EXISTS star_veg_hospital_particulars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('one-time', 'per-day')),
  charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE star_veg_hospital_particulars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all particulars" ON star_veg_hospital_particulars FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON star_veg_hospital_particulars TO anon, authenticated;

-- 3. IPD Bills
CREATE TABLE IF NOT EXISTS star_veg_hospital_ipd_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  age TEXT,
  gender TEXT,
  address TEXT,
  date_from DATE,
  date_to DATE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance NUMERIC(10,2) NOT NULL DEFAULT 0,
  remaining NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  footer_heading TEXT,
  footer_info TEXT,
  disclaimer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE star_veg_hospital_ipd_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all ipd bills" ON star_veg_hospital_ipd_bills FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON star_veg_hospital_ipd_bills TO anon, authenticated;

-- 4. OPD Bills
CREATE TABLE IF NOT EXISTS star_veg_hospital_opd_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  age TEXT,
  gender TEXT,
  address TEXT,
  bp TEXT,
  spo2 TEXT,
  pulse TEXT,
  temp TEXT,
  weight TEXT,
  facilities JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of strings
  footer_heading TEXT,
  footer_info TEXT,
  disclaimer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE star_veg_hospital_opd_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all opd bills" ON star_veg_hospital_opd_bills FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON star_veg_hospital_opd_bills TO anon, authenticated;

-- 5. Add patient age/gender columns if not already present
ALTER TABLE star_veg_hospital_patients
  ADD COLUMN IF NOT EXISTS age_years INTEGER,
  ADD COLUMN IF NOT EXISTS age_months INTEGER;