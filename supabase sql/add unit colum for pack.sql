-- Add pack_of and unit columns for multi-unit dispensing
ALTER TABLE star_veg_medicine_stock
  ADD COLUMN IF NOT EXISTS pack_of NUMERIC(10,2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit TEXT;

-- Optional: index for filtering by unit
CREATE INDEX IF NOT EXISTS idx_med_stock_unit ON star_veg_medicine_stock(unit);