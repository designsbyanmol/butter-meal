-- sql/hospital_service_categories.sql

CREATE TABLE IF NOT EXISTS star_veg_hospital_service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_hosp_cat_tenant
  ON star_veg_hospital_service_categories(tenant_id, sort_order);

ALTER TABLE star_veg_hospital_service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public all hosp cats" ON star_veg_hospital_service_categories;
CREATE POLICY "public all hosp cats"
  ON star_veg_hospital_service_categories
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON star_veg_hospital_service_categories
  TO anon, authenticated;