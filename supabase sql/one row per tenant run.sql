CREATE OR REPLACE FUNCTION get_tenant_owner_map()
RETURNS TABLE (tenant_slug TEXT, phone TEXT, name TEXT) AS $$
  SELECT
    t.slug,
    COALESCE(u.phone, '') AS phone,
    COALESCE(u.name, '') AS name
  FROM star_veg_tenants t
  LEFT JOIN star_veg_users u
    ON u.tenant_id = t.id
   AND u.role = 'admin'
  ORDER BY t.slug;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_tenant_owner_map() TO anon, authenticated;