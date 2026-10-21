-- =========================================================
-- Review disputes
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_review_disputes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID NOT NULL REFERENCES star_veg_reviews(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  tenant_slug     TEXT NOT NULL,
  raised_by       TEXT,                       -- tenant owner's phone / name
  reason          TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'resolved', 'rejected')),
  resolved_at     TIMESTAMPTZ,
  resolved_by     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- At most one open dispute per review
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_disputes_open_unique
  ON star_veg_review_disputes(review_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_review_disputes_tenant
  ON star_veg_review_disputes(tenant_slug, status, created_at DESC);

ALTER TABLE star_veg_review_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read disputes" ON star_veg_review_disputes;
CREATE POLICY "public read disputes" ON star_veg_review_disputes
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "public insert disputes" ON star_veg_review_disputes;
CREATE POLICY "public insert disputes" ON star_veg_review_disputes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public update disputes" ON star_veg_review_disputes;
CREATE POLICY "public update disputes" ON star_veg_review_disputes
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON star_veg_review_disputes TO anon, authenticated;