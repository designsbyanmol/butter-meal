-- =========================================================
-- Ensure tenant_id can be NULL on invoices (signup flow)
-- =========================================================
ALTER TABLE star_veg_invoices
  ALTER COLUMN tenant_id DROP NOT NULL;

-- =========================================================
-- Ensure plan_id FK is permissive and matches
-- =========================================================
-- (No change needed if the column exists and FK is correct;
--  the following is a no-op if it's already set.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'star_veg_invoices_plan_id_fkey'
  ) THEN
    ALTER TABLE star_veg_invoices
      ADD CONSTRAINT star_veg_invoices_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES star_veg_plans(id);
  END IF;
END $$;

-- =========================================================
-- Drop and recreate permissive policies on invoices
-- =========================================================
ALTER TABLE star_veg_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public insert invoices" ON star_veg_invoices;
DROP POLICY IF EXISTS "public read invoices" ON star_veg_invoices;
DROP POLICY IF EXISTS "public update invoices" ON star_veg_invoices;

CREATE POLICY "public insert invoices" ON star_veg_invoices
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "public read invoices" ON star_veg_invoices
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "public update invoices" ON star_veg_invoices
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- =========================================================
-- Grants
-- =========================================================
GRANT SELECT, INSERT, UPDATE ON star_veg_invoices TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;