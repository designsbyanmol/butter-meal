ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS gst_percent     NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packing_charge  NUMERIC(10,2) DEFAULT 0;

-- Sanity checks.
ALTER TABLE star_veg_tenants
  DROP CONSTRAINT IF EXISTS check_gst_percent_range;
ALTER TABLE star_veg_tenants
  ADD CONSTRAINT check_gst_percent_range
  CHECK (gst_percent IS NULL OR (gst_percent >= 0 AND gst_percent <= 100));

ALTER TABLE star_veg_tenants
  DROP CONSTRAINT IF EXISTS check_packing_charge_positive;
ALTER TABLE star_veg_tenants
  ADD CONSTRAINT check_packing_charge_positive
  CHECK (packing_charge IS NULL OR packing_charge >= 0);