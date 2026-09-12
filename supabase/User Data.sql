-- ============================================
-- FILE: 01_star_veg_users.sql
-- PURPOSE: Users table with hashed passwords + RLS
-- IDEMPOTENT: Safe to run multiple times
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS star_veg_users (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone          VARCHAR(15) UNIQUE NOT NULL,
  name           VARCHAR(255) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login     TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_star_veg_users_phone ON star_veg_users(phone);

-- ============================================
-- Password helper functions
-- ============================================
CREATE OR REPLACE FUNCTION hash_password(pw TEXT)
RETURNS TEXT AS $$
  SELECT crypt(pw, gen_salt('bf', 10));
$$ LANGUAGE SQL IMMUTABLE;

-- Verify a plaintext password against the stored hash
CREATE OR REPLACE FUNCTION verify_password(phone_in TEXT, pw TEXT)
RETURNS TABLE (
  id UUID,
  phone VARCHAR,
  name VARCHAR,
  role VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
) AS $$
  SELECT u.id, u.phone, u.name, u.role, u.is_active, u.created_at, u.last_login
  FROM star_veg_users u
  WHERE u.phone = phone_in
    AND u.password_hash = crypt(pw, u.password_hash);
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- RLS: no direct public access to users
-- ============================================
ALTER TABLE star_veg_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "no public access" ON star_veg_users;
CREATE POLICY "no public access" ON star_veg_users
  FOR ALL USING (false) WITH CHECK (false);

-- Revoke broad grants from anon/authenticated
REVOKE ALL ON TABLE star_veg_users FROM anon;
REVOKE ALL ON TABLE star_veg_users FROM authenticated;

-- ============================================
-- Safe read functions (SECURITY DEFINER bypasses RLS)
-- Only expose what's needed through functions.
-- ============================================

-- List users (safe projection; no password_hash)
CREATE OR REPLACE FUNCTION list_users()
RETURNS TABLE (
  id UUID,
  phone VARCHAR,
  name VARCHAR,
  role VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
) AS $$
  SELECT id, phone, name, role, is_active, created_at, last_login
  FROM star_veg_users
  ORDER BY created_at ASC;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get one user by phone (safe projection)
CREATE OR REPLACE FUNCTION get_user_by_phone(phone_in TEXT)
RETURNS TABLE (
  id UUID,
  phone VARCHAR,
  name VARCHAR,
  role VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
) AS $$
  SELECT id, phone, name, role, is_active, created_at, last_login
  FROM star_veg_users
  WHERE phone = phone_in;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create a user (hashes the password server-side)
CREATE OR REPLACE FUNCTION create_user(
  phone_in TEXT,
  name_in TEXT,
  pw_in TEXT,
  role_in TEXT DEFAULT 'user'
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO star_veg_users (phone, name, password_hash, role, is_active)
  VALUES (phone_in, name_in, crypt(pw_in, gen_salt('bf', 10)), COALESCE(role_in, 'user'), TRUE)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Change a user's password
CREATE OR REPLACE FUNCTION change_user_password(user_id UUID, new_pw TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE star_veg_users
  SET password_hash = crypt(new_pw, gen_salt('bf', 10))
  WHERE id = user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle active status
CREATE OR REPLACE FUNCTION toggle_user_active(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE star_veg_users
  SET is_active = NOT is_active
  WHERE id = user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete a user
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM star_veg_users WHERE id = user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Touch last_login
CREATE OR REPLACE FUNCTION touch_last_login(user_id UUID)
RETURNS VOID AS $$
  UPDATE star_veg_users SET last_login = NOW() WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_password(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_phone(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_user(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION change_user_password(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION toggle_user_active(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION touch_last_login(UUID) TO anon, authenticated;