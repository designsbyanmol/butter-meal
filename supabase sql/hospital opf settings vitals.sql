-- sql/hospital_opd_settings_vitals.sql
ALTER TABLE star_veg_hospital_opd_settings
  ADD COLUMN IF NOT EXISTS vitals JSONB NOT NULL DEFAULT
  '{"bp":"","spo2":"","pulse":"","temp":"","weight":""}'::jsonb;

CREATE OR REPLACE FUNCTION upsert_hospital_opd_settings(
  tenant_slug_in     TEXT,
  facilities_in      JSONB,
  footer_heading_in  TEXT,
  footer_info_in     TEXT,
  disclaimer_in      TEXT,
  vitals_in          JSONB DEFAULT NULL
) RETURNS star_veg_hospital_opd_settings AS $$
DECLARE
  tid UUID;
  row star_veg_hospital_opd_settings;
  vitals_payload JSONB := COALESCE(
    vitals_in,
    '{"bp":"","spo2":"","pulse":"","temp":"","weight":""}'::jsonb
  );
BEGIN
  SELECT id INTO tid FROM star_veg_tenants WHERE slug = tenant_slug_in;
  IF tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;

  INSERT INTO star_veg_hospital_opd_settings (
    tenant_id, facilities, footer_heading, footer_info, disclaimer, vitals, updated_at
  )
  VALUES (
    tid,
    COALESCE(facilities_in, '[]'::jsonb),
    COALESCE(footer_heading_in, 'Best Wishes'),
    COALESCE(footer_info_in, ''),
    COALESCE(disclaimer_in, ''),
    vitals_payload,
    NOW()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    facilities     = EXCLUDED.facilities,
    footer_heading = EXCLUDED.footer_heading,
    footer_info    = EXCLUDED.footer_info,
    disclaimer     = EXCLUDED.disclaimer,
    vitals         = EXCLUDED.vitals,
    updated_at     = NOW()
  RETURNING * INTO row;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION
  upsert_hospital_opd_settings(TEXT, JSONB, TEXT, TEXT, TEXT, JSONB)
  TO anon, authenticated;