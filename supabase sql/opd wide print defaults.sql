-- =========================================================
-- OPD-wide print defaults (facilities, footer, disclaimer)
-- One row per tenant. Idempotent.
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_hospital_opd_settings (
  tenant_id      UUID PRIMARY KEY REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  facilities     JSONB NOT NULL DEFAULT '[]'::jsonb,
  footer_heading TEXT  NOT NULL DEFAULT 'Best Wishes',
  footer_info    TEXT  NOT NULL DEFAULT 'Take healthy diet and be sure to maintain hygine.',
  disclaimer     TEXT  NOT NULL DEFAULT 'Prepared under the observation.',
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE star_veg_hospital_opd_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public all opd settings" ON star_veg_hospital_opd_settings;
CREATE POLICY "public all opd settings"
  ON star_veg_hospital_opd_settings
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON star_veg_hospital_opd_settings TO anon, authenticated;

-- Upsert helper
CREATE OR REPLACE FUNCTION upsert_hospital_opd_settings(
  tenant_slug_in     TEXT,
  facilities_in      JSONB,
  footer_heading_in  TEXT,
  footer_info_in     TEXT,
  disclaimer_in      TEXT
) RETURNS star_veg_hospital_opd_settings AS $$
DECLARE
  tid UUID;
  row star_veg_hospital_opd_settings;
BEGIN
  SELECT id INTO tid FROM star_veg_tenants WHERE slug = tenant_slug_in;
  IF tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;

  INSERT INTO star_veg_hospital_opd_settings (
    tenant_id, facilities, footer_heading, footer_info, disclaimer, updated_at
  )
  VALUES (
    tid,
    COALESCE(facilities_in, '[]'::jsonb),
    COALESCE(footer_heading_in, 'Best Wishes'),
    COALESCE(footer_info_in, ''),
    COALESCE(disclaimer_in, ''),
    NOW()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    facilities     = EXCLUDED.facilities,
    footer_heading = EXCLUDED.footer_heading,
    footer_info    = EXCLUDED.footer_info,
    disclaimer     = EXCLUDED.disclaimer,
    updated_at     = NOW()
  RETURNING * INTO row;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_hospital_opd_settings(TEXT, JSONB, TEXT, TEXT, TEXT)
  TO anon, authenticated;