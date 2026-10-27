-- sql/appointment_age_gender.sql
ALTER TABLE star_veg_hospital_appointments
  ADD COLUMN IF NOT EXISTS age    INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT;