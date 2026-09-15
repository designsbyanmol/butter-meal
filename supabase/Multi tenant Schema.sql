-- =========================================================
-- STAGE 1: Multi-tenant schema
-- =========================================================

-- 1. Tenants table
CREATE TABLE IF NOT EXISTS star_veg_tenants (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  display_name  VARCHAR(255) NOT NULL,
  owner_phone   VARCHAR(15),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_star_veg_tenants_slug
  ON star_veg_tenants(slug);

ALTER TABLE star_veg_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read tenants" ON star_veg_tenants;
CREATE POLICY "public read tenants" ON star_veg_tenants
  FOR SELECT USING (true);

GRANT SELECT ON star_veg_tenants TO anon, authenticated;

-- 2. Add tenant_id to the three tables (nullable first, backfill, then NOT NULL)

ALTER TABLE star_veg_menu_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES star_veg_tenants(id);
ALTER TABLE star_veg_users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES star_veg_tenants(id);
ALTER TABLE star_veg_store_settings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES star_veg_tenants(id);

-- 3. Create the default "main" tenant and backfill existing rows

INSERT INTO star_veg_tenants (slug, display_name, owner_phone)
VALUES ('main', 'Main Store', '100')
ON CONFLICT (slug) DO NOTHING;

UPDATE star_veg_menu_items
SET tenant_id = (SELECT id FROM star_veg_tenants WHERE slug = 'main')
WHERE tenant_id IS NULL;

UPDATE star_veg_users
SET tenant_id = (SELECT id FROM star_veg_tenants WHERE slug = 'main')
WHERE tenant_id IS NULL;

UPDATE star_veg_store_settings
SET tenant_id = (SELECT id FROM star_veg_tenants WHERE slug = 'main')
WHERE tenant_id IS NULL;

-- 4. Enforce NOT NULL now that everything is backfilled

ALTER TABLE star_veg_menu_items     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE star_veg_users          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE star_veg_store_settings ALTER COLUMN tenant_id SET NOT NULL;

-- 5. Indexes for tenant-scoped queries

CREATE INDEX IF NOT EXISTS idx_star_veg_menu_items_tenant
  ON star_veg_menu_items(tenant_id, sort_order ASC, id DESC);
CREATE INDEX IF NOT EXISTS idx_star_veg_users_tenant
  ON star_veg_users(tenant_id, phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_star_veg_store_settings_tenant
  ON star_veg_store_settings(tenant_id);

-- 6. Users table: phone becomes unique per tenant, not globally
ALTER TABLE star_veg_users DROP CONSTRAINT IF EXISTS star_veg_users_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_star_veg_users_tenant_phone
  ON star_veg_users(tenant_id, phone);