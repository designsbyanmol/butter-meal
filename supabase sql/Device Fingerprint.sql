ALTER TABLE star_veg_reviews
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT DEFAULT '';

-- New uniqueness: one review per item per fingerprint
DROP INDEX IF EXISTS idx_reviews_item_fingerprint;
CREATE UNIQUE INDEX idx_reviews_item_fingerprint
  ON star_veg_reviews(item_id, device_fingerprint)
  WHERE device_fingerprint <> '';

-- Update the submit RPC to accept + use the fingerprint
DROP FUNCTION IF EXISTS submit_review(TEXT, INTEGER, TEXT, TEXT, NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION submit_review(
  tenant_slug_in      TEXT,
  item_id_in          INTEGER,
  device_id_in        TEXT,
  device_fp_in        TEXT,
  name_in             TEXT,
  rating_in           NUMERIC,
  comment_in          TEXT
) RETURNS star_veg_reviews AS $$
DECLARE
  row star_veg_reviews;
  tid UUID;
  existing_id UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  IF NOT EXISTS (
    SELECT 1 FROM star_veg_menu_items
    WHERE id = item_id_in AND tenant_id = tid
  ) THEN
    RAISE EXCEPTION 'Item % does not belong to tenant %', item_id_in, tenant_slug_in;
  END IF;

  IF rating_in < 1 OR rating_in > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Find an existing review for this item by device_id OR fingerprint
  SELECT id INTO existing_id
  FROM star_veg_reviews
  WHERE item_id = item_id_in
    AND (
      device_id = device_id_in
      OR (device_fp_in <> '' AND device_fingerprint = device_fp_in)
    )
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE star_veg_reviews
    SET
      device_id          = device_id_in,
      device_fingerprint = COALESCE(NULLIF(device_fp_in, ''), device_fingerprint),
      customer_name      = COALESCE(name_in, ''),
      rating             = rating_in,
      comment            = COALESCE(comment_in, ''),
      updated_at         = NOW()
    WHERE id = existing_id
    RETURNING * INTO row;
  ELSE
    INSERT INTO star_veg_reviews (
      tenant_id, item_id, device_id, device_fingerprint,
      customer_name, rating, comment
    )
    VALUES (
      tid, item_id_in, device_id_in,
      COALESCE(device_fp_in, ''),
      COALESCE(name_in, ''),
      rating_in,
      COALESCE(comment_in, '')
    )
    RETURNING * INTO row;
  END IF;

  PERFORM recompute_item_rating(item_id_in);
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_review(TEXT, INTEGER, TEXT, TEXT, TEXT, NUMERIC, TEXT)
TO anon, authenticated;

-- Optional: enrich get_item_reviews to also return fingerprint
-- (only needed if you want the client to check "did this fingerprint already review?")