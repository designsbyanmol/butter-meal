UPDATE star_veg_hospital_patients
SET age_years = age, age_months = 0
WHERE age_years IS NULL AND age IS NOT NULL;