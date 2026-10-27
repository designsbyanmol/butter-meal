-- =========================================================
-- Customer-app catalog: 1 RPC, 3 tables, 1 round-trip
-- =========================================================
CREATE OR REPLACE FUNCTION get_customer_catalog(tenant_slug_in TEXT)
RETURNS JSONB AS $$
DECLARE
  tid UUID;
  result JSONB;
BEGIN
  SELECT id INTO tid FROM star_veg_tenants WHERE slug = tenant_slug_in;
  IF tid IS NULL THEN
    RETURN jsonb_build_object(
      'services', '[]'::JSONB,
      'doctors', '[]'::JSONB,
      'categories', '[]'::JSONB
    );
  END IF;

  SELECT jsonb_build_object(
    'services', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',            s.id,
          'name',          s.name,
          'category',      s.category,
          'price',         s.price,
          'image',         s.image,
          'description',   s.description,
          'daily_limits',  s.daily_limits
        )
        ORDER BY s.category, s.name
      )
      FROM star_veg_hospital_services s
      WHERE s.tenant_id = tid
    ), '[]'::JSONB),
    'doctors', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',       d.id,
          'name',     d.name,
          'category', d.category
        )
        ORDER BY d.name
      )
      FROM star_veg_hospital_doctors d
      WHERE d.tenant_id = tid
    ), '[]'::JSONB),
    'categories', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'name',       c.name,
          'sort_order', c.sort_order,
          'hidden',     c.hidden
        )
        ORDER BY c.sort_order
      )
      FROM star_veg_hospital_service_categories c
      WHERE c.tenant_id = tid
    ), '[]'::JSONB)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_customer_catalog(TEXT) TO anon, authenticated;