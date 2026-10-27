ALTER TABLE star_veg_hospital_appointments
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;