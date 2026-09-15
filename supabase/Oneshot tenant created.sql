-- =========================================================
-- One-shot: create a tenant + its owner user + default settings
-- =========================================================
CREATE OR REPLACE FUNCTION create_tenant_with_owner(
  display_name_in TEXT,
  slug_in TEXT,
  owner_phone_in TEXT,
  owner_name_in TEXT,
  owner_pw_in TEXT
) RETURNS star_veg_tenants AS $$
DECLARE
  tenant_row star_veg_tenants;
  new_user_id UUID;
BEGIN
  -- Validate slug
  IF slug_in IS NULL OR length(trim(slug_in)) = 0 THEN
    RAISE EXCEPTION 'Slug is required';
  END IF;
  IF slug_in !~ '^[a-z0-9\-]+$' THEN
    RAISE EXCEPTION 'Slug can only contain lowercase letters, numbers and hyphens';
  END IF;

  -- Check uniqueness
  IF EXISTS (SELECT 1 FROM star_veg_tenants WHERE slug = slug_in) THEN
    RAISE EXCEPTION 'A tenant with slug "%" already exists', slug_in;
  END IF;

  -- Create the tenant
  INSERT INTO star_veg_tenants (slug, display_name, owner_phone, is_active)
  VALUES (slug_in, display_name_in, owner_phone_in, TRUE)
  RETURNING * INTO tenant_row;

  -- Create the owner user (tenant-scoped admin)
  INSERT INTO star_veg_users (
    tenant_id, phone, name, password_hash, role, is_active
  )
  VALUES (
    tenant_row.id,
    owner_phone_in,
    COALESCE(NULLIF(trim(owner_name_in), ''), display_name_in || ' Owner'),
    crypt(owner_pw_in, gen_salt('bf', 10)),
    'admin',
    TRUE
  )
  RETURNING id INTO new_user_id;

  -- Seed a default store-settings row
  INSERT INTO star_veg_store_settings (
    tenant_id, is_open, closed_message, last_updated
  )
  VALUES (tenant_row.id, FALSE, '', NOW())
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN tenant_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_tenant_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT)
TO anon, authenticated;