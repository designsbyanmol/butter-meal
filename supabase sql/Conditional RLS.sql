-- =========================================================
-- star_veg_tenants — public read (customers need slug → tenant)
-- =========================================================
DROP POLICY IF EXISTS "public read tenants" ON star_veg_tenants;
CREATE POLICY "public read tenants" ON star_veg_tenants
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON star_veg_tenants TO anon, authenticated;


-- =========================================================
-- star_veg_menu_items — public read (menu display)
-- =========================================================
DROP POLICY IF EXISTS "public read menu" ON star_veg_menu_items;
CREATE POLICY "public read menu" ON star_veg_menu_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON star_veg_menu_items TO anon, authenticated;


-- =========================================================
-- star_veg_store_settings — public read (open/closed banner)
-- =========================================================
DROP POLICY IF EXISTS "public read settings" ON star_veg_store_settings;
CREATE POLICY "public read settings" ON star_veg_store_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON star_veg_store_settings TO anon, authenticated;


-- =========================================================
-- star_veg_users — NO POLICIES
-- Deny all direct access from anon/authenticated.
-- Access is only via SECURITY DEFINER RPCs (verify_password, list_users, etc.)
-- =========================================================
REVOKE ALL ON star_veg_users FROM anon;
REVOKE ALL ON star_veg_users FROM authenticated;