-- 1. Services (The 30+ problems)
CREATE TABLE IF NOT EXISTS star_veg_hospital_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  daily_limits JSONB DEFAULT '{}'::jsonb, -- e.g. {"mon": 40, "tue": 3, "wed": 0}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Appointments
CREATE TABLE IF NOT EXISTS star_veg_hospital_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  service_id UUID REFERENCES star_veg_hospital_services(id),
  category TEXT NOT NULL,
  token_no INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  doctor_name TEXT,
  payment_status TEXT DEFAULT 'pending', -- pending, confirmed, rejected
  status TEXT DEFAULT 'new', -- new, confirmed, resolved, hold, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  booking_date DATE DEFAULT CURRENT_DATE
);

-- 3. RPC: Get Next Token for Today
CREATE OR REPLACE FUNCTION get_next_hospital_token(tenant_slug_in TEXT)
RETURNS INTEGER AS $$
DECLARE
  tid UUID;
  next_token INTEGER;
BEGIN
  SELECT id INTO tid FROM star_veg_tenants WHERE slug = tenant_slug_in;
  SELECT COALESCE(MAX(token_no), 0) + 1 INTO next_token
  FROM star_veg_hospital_appointments
  WHERE tenant_id = tid AND booking_date = CURRENT_DATE;
  RETURN next_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS
ALTER TABLE star_veg_hospital_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all services" ON star_veg_hospital_services FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE star_veg_hospital_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all appointments" ON star_veg_hospital_appointments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);