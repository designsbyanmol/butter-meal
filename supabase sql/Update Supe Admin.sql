-- ============================================
-- FILE: 05_seed_admin.sql
-- Seed / UPDATE the platform (smart) admin
-- ============================================

-- 1. Ensure the "main" tenant exists
INSERT INTO star_veg_tenants (slug, display_name, owner_phone)
VALUES ('main', 'Main Store', '8004608951')
ON CONFLICT (slug) DO UPDATE
  SET owner_phone  = EXCLUDED.owner_phone,
      display_name = EXCLUDED.display_name;

-- 2. Update the existing platform admin OR create one
DO $$
DECLARE
  main_tenant_id UUID;
  admin_id       UUID;
BEGIN
  SELECT id INTO main_tenant_id
  FROM star_veg_tenants
  WHERE slug = 'main';

  IF main_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Main tenant not found';
  END IF;

  -- Look for an existing admin on the main tenant
  SELECT id INTO admin_id
  FROM star_veg_users
  WHERE tenant_id = main_tenant_id
    AND role      = 'admin'
  LIMIT 1;

  IF admin_id IS NOT NULL THEN
    -- UPDATE existing admin: name, phone, password
    UPDATE star_veg_users
    SET
      name          = 'Platform Admin',                              -- 👈 new name
      phone         = '8004608951',                                          -- 👈 new phone
      password_hash = crypt('$5#$,,ADC123', gen_salt('bf', 10))               -- 👈 new password
    WHERE id = admin_id;

    RAISE NOTICE 'Platform admin updated (id = %)', admin_id;
  ELSE
    -- No admin yet — create one
    INSERT INTO star_veg_users (
      tenant_id, phone, name, password_hash, role, is_active
    )
    VALUES (
      main_tenant_id,
      '8004608951',
      'Anmol Verma',
      crypt('$5#$,,ADC123', gen_salt('bf', 10)),
      'admin',
      TRUE
    );

    RAISE NOTICE 'Platform admin created';
  END IF;
END $$;

-- 3. Verify
SELECT u.id, u.phone, u.name, u.role, u.is_active, t.slug AS tenant_slug
FROM star_veg_users u
JOIN star_veg_tenants t ON t.id = u.tenant_id
WHERE t.slug = 'main' AND u.role = 'admin';