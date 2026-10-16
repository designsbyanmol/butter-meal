DROP FUNCTION IF EXISTS get_tenant_reviews_paged(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_tenant_reviews_paged(
  tenant_slug_in TEXT,
  filter_in      TEXT DEFAULT 'all',
  limit_in       INTEGER DEFAULT 16,
  offset_in      INTEGER DEFAULT 0
) RETURNS TABLE (
  id UUID,
  item_id INTEGER,
  item_name TEXT,
  item_category TEXT,
  rating NUMERIC,
  comment TEXT,
  customer_name TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  tid UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  RETURN QUERY
  SELECT
    r.id,
    r.item_id,
    m.name::TEXT                                AS item_name,
    COALESCE(m.category, '')::TEXT              AS item_category,
    r.rating::NUMERIC                           AS rating,
    COALESCE(r.comment, '')::TEXT               AS comment,
    COALESCE(r.customer_name, '')::TEXT         AS customer_name,
    COALESCE(r.device_id, '')::TEXT             AS device_id,
    r.created_at
  FROM star_veg_reviews r
  JOIN star_veg_menu_items m ON m.id = r.item_id
  WHERE r.tenant_id = tid
    AND (
      CASE filter_in
        WHEN 'commented' THEN COALESCE(r.comment, '') <> ''
        WHEN 'lte4'      THEN r.rating <= 4
        WHEN 'lte3'      THEN r.rating <= 3
        WHEN 'lte2'      THEN r.rating <= 2
        ELSE (COALESCE(r.comment, '') <> '' OR r.rating <= 3)
      END
    )
  ORDER BY r.created_at DESC
  LIMIT limit_in OFFSET offset_in;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_tenant_reviews_paged(TEXT, TEXT, INTEGER, INTEGER)
TO anon, authenticated;