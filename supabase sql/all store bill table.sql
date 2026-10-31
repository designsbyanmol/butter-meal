-- Run once in Supabase SQL editor
CREATE TABLE IF NOT EXISTS star_veg_store_bills (
  id            TEXT PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  bill_no       TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  items         JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal      NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  additional_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  additional_discount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_percent   NUMERIC(5,2) NOT NULL DEFAULT 0,
  gst_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxable_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  terms         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_bills_tenant
  ON star_veg_store_bills(tenant_id, created_at DESC);

ALTER TABLE star_veg_store_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all store bills"
  ON star_veg_store_bills
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON star_veg_store_bills TO anon, authenticated;