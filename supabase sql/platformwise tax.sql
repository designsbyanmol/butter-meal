-- Platform-wide tax rate, stored on the 'main' tenant row.
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) DEFAULT 0;

-- Sanity check: 0-100%.
ALTER TABLE star_veg_tenants
  DROP CONSTRAINT IF EXISTS check_tax_percent_range;
ALTER TABLE star_veg_tenants
  ADD CONSTRAINT check_tax_percent_range
  CHECK (tax_percent IS NULL OR (tax_percent >= 0 AND tax_percent <= 100));

-- Make sure main exists and starts at 0.
INSERT INTO star_veg_tenants (slug, display_name, owner_phone, tax_percent)
VALUES ('main', 'Main', '0', 0)
ON CONFLICT (slug) DO NOTHING;

-- Record the tax that was charged on each invoice.
ALTER TABLE star_veg_invoices
  ADD COLUMN IF NOT EXISTS tax_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount  NUMERIC(10,2) DEFAULT 0;

-- RPC: read/write the global tax rate.
CREATE OR REPLACE FUNCTION get_platform_tax_percent()
RETURNS NUMERIC AS $$
  SELECT COALESCE(tax_percent, 0)
  FROM star_veg_tenants
  WHERE slug = 'main';
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_platform_tax_percent(tax_in NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  normalised NUMERIC := GREATEST(0, LEAST(COALESCE(tax_in, 0), 100));
BEGIN
  UPDATE star_veg_tenants
  SET tax_percent = normalised
  WHERE slug = 'main';

  RETURN normalised;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_platform_tax_percent() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_platform_tax_percent(NUMERIC) TO anon, authenticated;