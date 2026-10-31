ALTER TABLE star_veg_hospital_patients
  ADD COLUMN IF NOT EXISTS age_years INTEGER,
  ADD COLUMN IF NOT EXISTS age_months INTEGER;