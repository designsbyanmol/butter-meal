-- =========================================================
-- Prevent duplicate phone numbers within a tenant, with a
-- human-readable error message.
-- Idempotent.
-- =========================================================

-- Ensure the unique index exists (it should, from the multi-tenant
-- migration, but re-assert it so the migration is self-contained).
CREATE UNIQUE INDEX IF NOT EXISTS idx_star_veg_users_tenant_phone
  ON star_veg_users(tenant_id, phone);

-- Replace create_user with a version that:
--   1. Validates the tenant exists.
--   2. Validates the phone format (10 digits).
--   3. Rejects duplicate phones within the tenant with a clear message.
--   4. Hashes the password server-side and inserts.
CREATE OR REPLACE FUNCTION create_user(
  tenant_slug_in TEXT,
  phone_in       TEXT,
  name_in        TEXT,
  pw_in          TEXT,
  role_in        TEXT DEFAULT 'user'
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
  tid    UUID;
  existing_id UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  -- Validate phone
  IF phone_in IS NULL OR length(trim(phone_in)) = 0 THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;
  IF phone_in !~ '^\d{10}$' THEN
    RAISE EXCEPTION 'Phone number must be exactly 10 digits';
  END IF;

  -- Reject duplicate phone within the same tenant
  SELECT id INTO existing_id
  FROM star_veg_users
  WHERE tenant_id = tid
    AND phone = phone_in
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION
      'A user with phone % already exists in this store', phone_in
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO star_veg_users (
    tenant_id, phone, name, password_hash, role, is_active
  )
  VALUES (
    tid,
    phone_in,
    COALESCE(NULLIF(trim(name_in), ''), 'Staff'),
    crypt(pw_in, gen_salt('bf', 10)),
    COALESCE(NULLIF(trim(role_in), ''), 'user'),
    TRUE
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_user(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- Verify
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'star_veg_users'
  AND indexname LIKE '%tenant%phone%';