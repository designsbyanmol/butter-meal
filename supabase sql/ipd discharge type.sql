-- migrations/ipd_discharge_type.sql
ALTER TABLE star_veg_hospital_ipd_bills
  ADD COLUMN IF NOT EXISTS discharge_type TEXT;

-- Optional: constrain to a known set so bad values can't slip in
ALTER TABLE star_veg_hospital_ipd_bills
  DROP CONSTRAINT IF EXISTS check_ipd_discharge_type;
ALTER TABLE star_veg_hospital_ipd_bills
  ADD CONSTRAINT check_ipd_discharge_type
  CHECK (
    discharge_type IS NULL OR discharge_type IN (
      'recovered',
      'lama',
      'referred',
      'absconded',
      'expired',
      'transferred',
      'dama'
    )
  );