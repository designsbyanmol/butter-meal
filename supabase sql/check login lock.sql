CREATE OR REPLACE FUNCTION check_login_lockout(
  phone_in TEXT,
  tenant_slug_in TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  recent_failures INTEGER;
  lockout_time TIMESTAMPTZ;
  minutes_left INTEGER;
  scoped_slug TEXT := COALESCE(tenant_slug_in, '__platform__');
BEGIN
  -- Count failures in the last 1 hour
  SELECT COUNT(*) INTO recent_failures
  FROM auth_login_attempts AS a
  WHERE a.phone = phone_in
    AND COALESCE(a.tenant_slug, '__platform__') = scoped_slug
    AND a.succeeded = FALSE
    AND a.created_at > NOW() - INTERVAL '1 hour';

  -- If 3+ failures, calculate time left
  IF recent_failures >= 3 THEN
    SELECT MIN(a.created_at) + INTERVAL '1 hour' INTO lockout_time
    FROM auth_login_attempts AS a
    WHERE a.phone = phone_in
      AND COALESCE(a.tenant_slug, '__platform__') = scoped_slug
      AND a.succeeded = FALSE
      AND a.created_at > NOW() - INTERVAL '1 hour';

    IF lockout_time > NOW() THEN
      -- Calculate minutes remaining (ceiling)
      minutes_left := CEIL(EXTRACT(EPOCH FROM (lockout_time - NOW())) / 60)::INTEGER;
      RETURN minutes_left;
    END IF;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_login_lockout(TEXT, TEXT) TO anon, authenticated;