-- All three review-list datasets for one tenant in one call.
CREATE OR REPLACE FUNCTION get_reviews_admin_bundle(
  tenant_slug_in TEXT,
  filter_in      TEXT DEFAULT 'all',
  limit_in       INTEGER DEFAULT 16,
  offset_in      INTEGER DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  reviews JSONB;
  pending JSONB;
  resolved JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) INTO reviews
  FROM (
    SELECT * FROM get_tenant_reviews_paged(
      tenant_slug_in, filter_in, limit_in, offset_in
    )
  ) r;

  SELECT COALESCE(jsonb_object_agg(review_id, id), '{}'::jsonb) INTO pending
  FROM star_veg_review_disputes
  WHERE tenant_slug = tenant_slug_in AND status = 'pending';

  SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) INTO resolved
  FROM (
    SELECT id, review_id, status, outcome, resolved_at
    FROM star_veg_review_disputes
    WHERE tenant_slug = tenant_slug_in
      AND status IN ('resolved', 'rejected')
    ORDER BY resolved_at DESC NULLS LAST
  ) d;

  RETURN jsonb_build_object(
    'reviews', reviews,
    'pending', pending,
    'resolved', resolved
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_reviews_admin_bundle(TEXT, TEXT, INTEGER, INTEGER)
  TO anon, authenticated;