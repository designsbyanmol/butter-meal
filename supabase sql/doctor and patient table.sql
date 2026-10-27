-- 1. Doctors Table
CREATE TABLE IF NOT EXISTS star_veg_hospital_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  experience INTEGER, -- Years
  category TEXT, -- e.g. Cardiology, General Medicine
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS star_veg_hospital_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS (Public read/write for app demo)
ALTER TABLE star_veg_hospital_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all doctors" ON star_veg_hospital_doctors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE star_veg_hospital_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all patients" ON star_veg_hospital_patients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);