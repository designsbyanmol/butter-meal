CREATE FUNCTION verify_password(
  phone_in TEXT,
  pw TEXT,
  tenant_slug_in TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  phone TEXT,
  name TEXT,
  role TEXT,
  is_active BOOLEAN,
  tenant_id UUID,
  tenant_slug TEXT,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
) AS $$
DECLARE
  recent_failures INTEGER;
  lockout_time TIMESTAMPTZ;
  result_row RECORD;
  scoped_slug TEXT := COALESCE(tenant_slug_in, '__platform__');
BEGIN
  SELECT COUNT(*) INTO recent_failures
  FROM auth_login_attempts AS a
  WHERE a.phone = phone_in
    AND COALESCE(a.tenant_slug, '__platform__') = scoped_slug
    AND a.succeeded = FALSE
    AND a.created_at > NOW() - INTERVAL '1 hour';

  IF recent_failures >= 3 THEN
    SELECT MIN(a.created_at) + INTERVAL '1 hour' INTO lockout_time
    FROM auth_login_attempts AS a
    WHERE a.phone = phone_in
      AND COALESCE(a.tenant_slug, '__platform__') = scoped_slug
      AND a.succeeded = FALSE
      AND a.created_at > NOW() - INTERVAL '1 hour';

    IF lockout_time > NOW() THEN
      RAISE EXCEPTION 'Too many failed attempts. Account locked.';
    END IF;
  END IF;

  SELECT
    u.id,
    u.phone::TEXT AS phone,
    u.name::TEXT AS name,
    u.role::TEXT AS role,
    u.is_active,
    u.tenant_id,
    t.slug::TEXT AS tenant_slug,
    u.created_at,
    u.last_login
  INTO result_row
  FROM star_veg_users u
  JOIN star_veg_tenants t ON t.id = u.tenant_id
  WHERE u.phone = phone_in
    AND u.password_hash = crypt(pw, u.password_hash)
    AND (
      tenant_slug_in IS NULL
      OR t.slug = tenant_slug_in
      OR t.slug = 'main'
    )
  LIMIT 1;

  INSERT INTO auth_login_attempts (phone, tenant_slug, succeeded)
  VALUES (phone_in, tenant_slug_in, result_row IS NOT NULL);

  IF result_row IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT
    result_row.id,
    result_row.phone,
    result_row.name,
    result_row.role,
    result_row.is_active,
    result_row.tenant_id,
    result_row.tenant_slug,
    result_row.created_at,
    result_row.last_login;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT, TEXT) TO anon, authenticated;