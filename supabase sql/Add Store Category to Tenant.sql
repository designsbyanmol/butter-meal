-- =========================================================
-- 1. Add store_category to tenants
-- =========================================================
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS store_category TEXT DEFAULT 'restaurant';

-- Backfill existing tenants
UPDATE star_veg_tenants
SET store_category = 'restaurant'
WHERE store_category IS NULL;

-- =========================================================
-- 2. Recreate create_tenant_with_plan with store_category
-- =========================================================
DROP FUNCTION IF EXISTS create_tenant_with_plan(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT
);

CREATE OR REPLACE FUNCTION create_tenant_with_plan(
  display_name_in   TEXT,
  slug_in           TEXT,
  owner_phone_in    TEXT,
  owner_name_in     TEXT,
  owner_pw_in       TEXT,
  plan_id_in        TEXT,
  months_in         INTEGER,
  whatsapp_phone_in TEXT DEFAULT NULL,
  store_category_in TEXT DEFAULT 'restaurant'
) RETURNS star_veg_tenants AS $$
DECLARE
  tenant_row star_veg_tenants;
  new_user_id UUID;
  plan_row star_veg_plans;
  months_int INTEGER;
BEGIN
  IF slug_in IS NULL OR length(trim(slug_in)) = 0 THEN
    RAISE EXCEPTION 'Slug is required';
  END IF;
  IF slug_in !~ '^[a-z0-9\-]+$' THEN
    RAISE EXCEPTION 'Slug can only contain lowercase letters, numbers and hyphens';
  END IF;
  IF EXISTS (SELECT 1 FROM star_veg_tenants WHERE slug = slug_in) THEN
    RAISE EXCEPTION 'A tenant with slug "%" already exists', slug_in;
  END IF;

  SELECT * INTO plan_row FROM star_veg_plans WHERE id = plan_id_in AND is_active = TRUE;
  IF plan_row IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive plan: %', plan_id_in;
  END IF;

  months_int := GREATEST(COALESCE(months_in, 1), 1);

  INSERT INTO star_veg_tenants (
    slug, display_name, owner_phone, is_active,
    plan_id, subscription_status,
    subscription_started_at, subscription_expires_at,
    whatsapp_phone,
    store_category
  )
  VALUES (
    slug_in, display_name_in, owner_phone_in, TRUE,
    plan_id_in, 'active',
    NOW(), NOW() + (months_int || ' months')::INTERVAL,
    COALESCE(whatsapp_phone_in, owner_phone_in),
    COALESCE(NULLIF(trim(store_category_in), ''), 'restaurant')
  )
  RETURNING * INTO tenant_row;

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

  INSERT INTO star_veg_store_settings (
    tenant_id, is_open, closed_message, last_updated, accepting_orders
  )
  VALUES (tenant_row.id, TRUE, '', NOW(), TRUE)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN tenant_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_tenant_with_plan(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT
) TO anon, authenticated;

-- =========================================================
-- 3. Recreate create_tenant_with_owner (admin path) with store_category
-- =========================================================
DROP FUNCTION IF EXISTS create_tenant_with_owner(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_tenant_with_owner(
  display_name_in   TEXT,
  slug_in           TEXT,
  owner_phone_in    TEXT,
  owner_name_in     TEXT,
  owner_pw_in       TEXT,
  whatsapp_phone_in TEXT DEFAULT NULL,
  store_category_in TEXT DEFAULT 'restaurant'
) RETURNS star_veg_tenants AS $$
DECLARE
  tenant_row star_veg_tenants;
  new_user_id UUID;
BEGIN
  IF slug_in IS NULL OR length(trim(slug_in)) = 0 THEN
    RAISE EXCEPTION 'Slug is required';
  END IF;
  IF slug_in !~ '^[a-z0-9\-]+$' THEN
    RAISE EXCEPTION 'Slug can only contain lowercase letters, numbers and hyphens';
  END IF;
  IF EXISTS (SELECT 1 FROM star_veg_tenants WHERE slug = slug_in) THEN
    RAISE EXCEPTION 'A tenant with slug "%" already exists', slug_in;
  END IF;

  INSERT INTO star_veg_tenants (
    slug, display_name, owner_phone, is_active,
    whatsapp_phone, store_category
  )
  VALUES (
    slug_in, display_name_in, owner_phone_in, TRUE,
    COALESCE(whatsapp_phone_in, owner_phone_in),
    COALESCE(NULLIF(trim(store_category_in), ''), 'restaurant')
  )
  RETURNING * INTO tenant_row;

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

  INSERT INTO star_veg_store_settings (
    tenant_id, is_open, closed_message, last_updated, accepting_orders
  )
  VALUES (tenant_row.id, TRUE, '', NOW(), TRUE)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN tenant_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_tenant_with_owner(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;