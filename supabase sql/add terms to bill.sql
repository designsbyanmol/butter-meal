-- =========================================================
-- 1. PHARMACY STOCK TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_medicine_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  composition TEXT,
  manufacturer TEXT,
  hsn_code TEXT,
  pack_size TEXT, -- e.g., "10 tablets", "100 ml"
  batch_no TEXT,
  expiry_date DATE,
  mrp NUMERIC(10,2) NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_med_stock_tenant ON star_veg_medicine_stock(tenant_id);
CREATE INDEX IF NOT EXISTS idx_med_stock_name ON star_veg_medicine_stock(name);

ALTER TABLE star_veg_medicine_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read med stock" ON star_veg_medicine_stock FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert med stock" ON star_veg_medicine_stock FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update med stock" ON star_veg_medicine_stock FOR UPDATE TO anon, authenticated USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON star_veg_medicine_stock TO anon, authenticated;

-- =========================================================
-- 2. PHARMACY BILLS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_pharmacy_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  bill_no TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  doctor_name TEXT,
  items JSONB NOT NULL, -- Array of medicines billed
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharm_bills_tenant ON star_veg_pharmacy_bills(tenant_id, created_at DESC);

ALTER TABLE star_veg_pharmacy_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pharm bills" ON star_veg_pharmacy_bills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert pharm bills" ON star_veg_pharmacy_bills FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT SELECT, INSERT ON star_veg_pharmacy_bills TO anon, authenticated;