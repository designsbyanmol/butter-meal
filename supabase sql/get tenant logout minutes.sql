CREATE OR REPLACE FUNCTION get_tenant_login_lockout(
  tenant_slug_in TEXT
)
RETURNS INTEGER AS $$
DECLARE
  lockout_time TIMESTAMPTZ;
  recent_failures INTEGER;
BEGIN
  -- Count failures in the last hour for anyone at this tenant
  SELECT COUNT(*) INTO recent_failures
  FROM auth_login_attempts AS a
  WHERE COALESCE(a.tenant_slug, '__platform__') = COALESCE(tenant_slug_in, '__platform__')
    AND a.succeeded = FALSE
    AND a.created_at > NOW() - INTERVAL '1 hour';

  IF recent_failures >= 3 THEN
    SELECT MIN(a.created_at) + INTERVAL '1 hour' INTO lockout_time
    FROM auth_login_attempts AS a
    WHERE COALESCE(a.tenant_slug, '__platform__') = COALESCE(tenant_slug_in, '__platform__')
      AND a.succeeded = FALSE
      AND a.created_at > NOW() - INTERVAL '1 hour';

    IF lockout_time > NOW() THEN
      RETURN CEIL(EXTRACT(EPOCH FROM (lockout_time - NOW())) / 60)::INTEGER;
    END IF;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_tenant_login_lockout(TEXT) TO anon, authenticated;