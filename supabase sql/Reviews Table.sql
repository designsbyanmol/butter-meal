-- =========================================================
-- 1. Reviews table
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  item_id     INTEGER NOT NULL REFERENCES star_veg_menu_items(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  rating      NUMERIC(3,2) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_item_device
  ON star_veg_reviews(item_id, device_id);

CREATE INDEX IF NOT EXISTS idx_reviews_tenant
  ON star_veg_reviews(tenant_id, created_at DESC);

ALTER TABLE star_veg_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read reviews (needed for customer display)
DROP POLICY IF EXISTS "public read reviews" ON star_veg_reviews;
CREATE POLICY "public read reviews" ON star_veg_reviews
  FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON star_veg_reviews TO anon, authenticated;

-- =========================================================
-- 2. Helper: recompute item rating + count from reviews
-- =========================================================
CREATE OR REPLACE FUNCTION recompute_item_rating(item_id_in INTEGER)
RETURNS VOID AS $$
DECLARE
  avg_r NUMERIC(3,2);
  cnt   INTEGER;
BEGIN
  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)
  INTO avg_r, cnt
  FROM star_veg_reviews
  WHERE item_id = item_id_in;

  UPDATE star_veg_menu_items
  SET
    rating       = COALESCE(avg_r, NULL),
    review_count = COALESCE(cnt, 0),
    updated_at   = NOW()
  WHERE id = item_id_in;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- 3. Submit (insert or update) a review
-- =========================================================
CREATE OR REPLACE FUNCTION submit_review(
  tenant_slug_in TEXT,
  item_id_in     INTEGER,
  device_id_in   TEXT,
  name_in        TEXT,
  rating_in      NUMERIC,
  comment_in     TEXT
) RETURNS star_veg_reviews AS $$
DECLARE
  row star_veg_reviews;
  tid UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  -- Verify the item belongs to this tenant
  IF NOT EXISTS (
    SELECT 1 FROM star_veg_menu_items
    WHERE id = item_id_in AND tenant_id = tid
  ) THEN
    RAISE EXCEPTION 'Item % does not belong to tenant %', item_id_in, tenant_slug_in;
  END IF;

  IF rating_in < 1 OR rating_in > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  INSERT INTO star_veg_reviews (
    tenant_id, item_id, device_id, customer_name, rating, comment
  )
  VALUES (
    tid, item_id_in, device_id_in,
    COALESCE(name_in, ''),
    rating_in,
    COALESCE(comment_in, '')
  )
  ON CONFLICT (item_id, device_id) DO UPDATE SET
    rating        = EXCLUDED.rating,
    comment       = EXCLUDED.comment,
    customer_name = EXCLUDED.customer_name,
    updated_at    = NOW()
  RETURNING * INTO row;

  PERFORM recompute_item_rating(item_id_in);

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_review(TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT)
TO anon, authenticated;

-- =========================================================
-- 4. Delete own review
-- =========================================================
CREATE OR REPLACE FUNCTION delete_own_review(
  tenant_slug_in TEXT,
  item_id_in     INTEGER,
  device_id_in   TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  affected INT;
  tid UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  DELETE FROM star_veg_reviews
  WHERE item_id = item_id_in
    AND device_id = device_id_in
    AND tenant_id = tid;

  GET DIAGNOSTICS affected = ROW_COUNT;
  PERFORM recompute_item_rating(item_id_in);
  RETURN affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_own_review(TEXT, INTEGER, TEXT)
TO anon, authenticated;

-- =========================================================
-- 5. Admin: delete any review (used by Reviews Overview)
-- =========================================================
CREATE OR REPLACE FUNCTION admin_delete_review(review_id_in UUID)
RETURNS BOOLEAN AS $$
DECLARE
  item_id_out INTEGER;
  affected INT;
BEGIN
  SELECT item_id INTO item_id_out
  FROM star_veg_reviews
  WHERE id = review_id_in;

  IF item_id_out IS NULL THEN
    RETURN FALSE;
  END IF;

  DELETE FROM star_veg_reviews WHERE id = review_id_in;
  GET DIAGNOSTICS affected = ROW_COUNT;

  PERFORM recompute_item_rating(item_id_out);
  RETURN affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_delete_review(UUID) TO anon, authenticated;

-- =========================================================
-- 6. Read: reviews for one item
-- =========================================================
CREATE OR REPLACE FUNCTION get_item_reviews(
  item_id_in INTEGER
) RETURNS SETOF star_veg_reviews AS $$
  SELECT * FROM star_veg_reviews
  WHERE item_id = item_id_in
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_item_reviews(INTEGER) TO anon, authenticated;

-- =========================================================
-- 7. Read: paginated reviews for the admin dashboard
--    Filters:
--      filter_in = 'all'        → any
--                = 'lte5'       → rating <= 5 (all)
--                = 'lte4'       → rating <= 4
--                = 'lte3'       → rating <= 3
--                = 'lte2'       → rating <= 2
--                = 'commented'  → comment <> ''
--    Only returns rows that either have a comment OR are <= 3.
-- =========================================================
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
    m.name,
    COALESCE(m.category, ''),
    r.rating,
    r.comment,
    r.customer_name,
    r.device_id,
    r.created_at
  FROM star_veg_reviews r
  JOIN star_veg_menu_items m ON m.id = r.item_id
  WHERE r.tenant_id = tid
    AND (
      -- show only reviews with a comment, OR with rating <= 3
      COALESCE(r.comment, '') <> '' OR r.rating <= 3
    )
    AND (
      CASE filter_in
        WHEN 'lte4'      THEN r.rating <= 4
        WHEN 'lte3'      THEN r.rating <= 3
        WHEN 'lte2'      THEN r.rating <= 2
        WHEN 'commented' THEN COALESCE(r.comment, '') <> ''
        ELSE TRUE
      END
    )
  ORDER BY r.created_at DESC
  LIMIT limit_in OFFSET offset_in;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_tenant_reviews_paged(TEXT, TEXT, INTEGER, INTEGER)
TO anon, authenticated;