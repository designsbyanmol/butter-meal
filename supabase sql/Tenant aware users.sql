-- ============================================
-- Tenant Aware users
-- ============================================
DROP FUNCTION IF EXISTS create_user(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_user(
  tenant_slug_in TEXT,
  phone_in TEXT,
  name_in TEXT,
  pw_in TEXT,
  role_in TEXT DEFAULT 'user'
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
  tid UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  INSERT INTO star_veg_users (tenant_id, phone, name, password_hash, role, is_active)
  VALUES (tid, phone_in, name_in, crypt(pw_in, gen_salt('bf', 10)),
          COALESCE(role_in, 'user'), TRUE)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- verify_password: now returns tenant info
DROP FUNCTION IF EXISTS verify_password(TEXT, TEXT);

CREATE OR REPLACE FUNCTION verify_password(phone_in TEXT, pw TEXT)
RETURNS TABLE (
  id UUID, phone VARCHAR, name VARCHAR, role VARCHAR,
  is_active BOOLEAN, tenant_id UUID, tenant_slug TEXT,
  created_at TIMESTAMPTZ, last_login TIMESTAMPTZ
) AS $$
  SELECT u.id, u.phone, u.name, u.role, u.is_active,
         u.tenant_id, t.slug AS tenant_slug,
         u.created_at, u.last_login
  FROM star_veg_users u
  JOIN star_veg_tenants t ON t.id = u.tenant_id
  WHERE u.phone = phone_in
    AND u.password_hash = crypt(pw, u.password_hash);
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO anon, authenticated;

-- list_users: now tenant-scoped
DROP FUNCTION IF EXISTS list_users();

CREATE OR REPLACE FUNCTION list_users(tenant_slug_in TEXT)
RETURNS TABLE (
  id UUID, phone VARCHAR, name VARCHAR, role VARCHAR,
  is_active BOOLEAN, tenant_id UUID,
  created_at TIMESTAMPTZ, last_login TIMESTAMPTZ
) AS $$
  SELECT u.id, u.phone, u.name, u.role, u.is_active, u.tenant_id,
         u.created_at, u.last_login
  FROM star_veg_users u
  WHERE u.tenant_id = resolve_tenant_id(tenant_slug_in)
  ORDER BY u.created_at ASC;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION list_users(TEXT) TO anon, authenticated;

-- get_user_by_phone: now tenant-scoped
DROP FUNCTION IF EXISTS get_user_by_phone(TEXT);

CREATE OR REPLACE FUNCTION get_user_by_phone(tenant_slug_in TEXT, phone_in TEXT)
RETURNS TABLE (
  id UUID, phone VARCHAR, name VARCHAR, role VARCHAR,
  is_active BOOLEAN, tenant_id UUID,
  created_at TIMESTAMPTZ, last_login TIMESTAMPTZ
) AS $$
  SELECT u.id, u.phone, u.name, u.role, u.is_active, u.tenant_id,
         u.created_at, u.last_login
  FROM star_veg_users u
  WHERE u.phone = phone_in
    AND u.tenant_id = resolve_tenant_id(tenant_slug_in);
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_by_phone(TEXT, TEXT) TO anon, authenticated;