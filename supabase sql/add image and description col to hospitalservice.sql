ALTER TABLE star_veg_hospital_services
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;