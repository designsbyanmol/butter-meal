-- =========================================================
-- Update tenant display name / owner phone
-- =========================================================
CREATE OR REPLACE FUNCTION update_tenant(
  tenant_slug_in TEXT,
  display_name_in TEXT,
  owner_phone_in TEXT DEFAULT NULL
) RETURNS star_veg_tenants AS $$
DECLARE
  row star_veg_tenants;
BEGIN
  UPDATE star_veg_tenants
  SET
    display_name = COALESCE(NULLIF(trim(display_name_in), ''), display_name),
    owner_phone  = COALESCE(NULLIF(trim(owner_phone_in), ''), owner_phone)
  WHERE slug = tenant_slug_in
  RETURNING * INTO row;

  IF row IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_tenant(TEXT, TEXT, TEXT) TO anon, authenticated;

-- =========================================================
-- Reset the tenant owner's password by tenant slug
-- =========================================================
CREATE OR REPLACE FUNCTION reset_tenant_owner_password(
  tenant_slug_in TEXT,
  owner_phone_in TEXT,
  new_password_in TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE star_veg_users u
  SET password_hash = crypt(new_password_in, gen_salt('bf', 10))
  FROM star_veg_tenants t
  WHERE u.tenant_id = t.id
    AND t.slug = tenant_slug_in
    AND u.phone = owner_phone_in
    AND u.role = 'admin';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_tenant_owner_password(TEXT, TEXT, TEXT)
TO anon, authenticated;