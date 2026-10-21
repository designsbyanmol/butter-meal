-- =========================================================
-- star_veg_plans — public read (pricing is public)
-- =========================================================
ALTER TABLE star_veg_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read plans" ON star_veg_plans;
CREATE POLICY "public read plans" ON star_veg_plans
  FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON star_veg_plans TO anon, authenticated;

-- =========================================================
-- star_veg_invoices — anon can insert (signup) + read own
-- =========================================================
ALTER TABLE star_veg_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public insert invoices" ON star_veg_invoices;
CREATE POLICY "public insert invoices" ON star_veg_invoices
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public read invoices" ON star_veg_invoices;
CREATE POLICY "public read invoices" ON star_veg_invoices
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "public update invoices" ON star_veg_invoices;
CREATE POLICY "public update invoices" ON star_veg_invoices
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON star_veg_invoices TO anon, authenticated;

-- =========================================================
-- star_veg_pause_requests — read/insert/update allowed
-- =========================================================
ALTER TABLE star_veg_pause_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read pause_requests" ON star_veg_pause_requests;
CREATE POLICY "public read pause_requests" ON star_veg_pause_requests
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "public insert pause_requests" ON star_veg_pause_requests;
CREATE POLICY "public insert pause_requests" ON star_veg_pause_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public update pause_requests" ON star_veg_pause_requests;
CREATE POLICY "public update pause_requests" ON star_veg_pause_requests
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON star_veg_pause_requests TO anon, authenticated;