-- =========================================================
-- DINE-IN ORDER TRACKING — one-shot migration
-- Safe to run once. Re-running is idempotent.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Add the new columns
-- ---------------------------------------------------------
ALTER TABLE star_veg_dinein_orders
  ADD COLUMN IF NOT EXISTS order_no      TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preparing_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS served_at     TIMESTAMPTZ;

-- ---------------------------------------------------------
-- 2. Migrate any legacy status values BEFORE installing the new
--    CHECK constraint. 'open' → 'placed'; anything unknown → 'placed'.
-- ---------------------------------------------------------
UPDATE star_veg_dinein_orders
SET status = 'placed'
WHERE status = 'open';

UPDATE star_veg_dinein_orders
SET status = 'placed'
WHERE status IS NULL
   OR status NOT IN (
     'placed', 'accepted', 'preparing', 'served',
     'bill_requested', 'paid', 'cancelled'
   );

-- ---------------------------------------------------------
-- 3. Drop every status CHECK constraint on the table (any name),
--    then install the canonical one.
-- ---------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'star_veg_dinein_orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE star_veg_dinein_orders DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE star_veg_dinein_orders
  ADD CONSTRAINT star_veg_dinein_orders_status_check
  CHECK (status IN (
    'placed', 'accepted', 'preparing', 'served',
    'bill_requested', 'paid', 'cancelled'
  ));

ALTER TABLE star_veg_dinein_orders
  ALTER COLUMN status SET DEFAULT 'placed';

-- ---------------------------------------------------------
-- 4. Per-minute order-number counter
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS star_veg_dinein_order_counter (
  tenant_id   UUID    NOT NULL REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  table_id    UUID    NOT NULL REFERENCES star_veg_dinein_tables(id) ON DELETE CASCADE,
  minute_key  TEXT    NOT NULL,
  last_no     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, table_id, minute_key)
);

-- ---------------------------------------------------------
-- 5. Order-number generator
--    DDMMYYHHMM (Asia/Kolkata). Second order in the same minute
--    gets -2, third gets -3, etc.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_dinein_order_no(
  tenant_id_in UUID,
  table_id_in  UUID
) RETURNS TEXT AS $$
DECLARE
  minute_key_in TEXT := to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'DDMMYYHH24MI');
  seq_no        INTEGER;
BEGIN
  INSERT INTO star_veg_dinein_order_counter
    (tenant_id, table_id, minute_key, last_no)
  VALUES
    (tenant_id_in, table_id_in, minute_key_in, 1)
  ON CONFLICT (tenant_id, table_id, minute_key)
  DO UPDATE SET last_no = star_veg_dinein_order_counter.last_no + 1
  RETURNING last_no INTO seq_no;

  IF seq_no <= 1 THEN
    RETURN minute_key_in;
  END IF;
  RETURN minute_key_in || '-' || seq_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_dinein_order_no(UUID, UUID)
  TO anon, authenticated;

-- ---------------------------------------------------------
-- 6. Trigger that sets order_no on insert
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_dinein_orders_set_order_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_no IS NULL THEN
    NEW.order_no := generate_dinein_order_no(NEW.tenant_id, NEW.table_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_dinein_order_no ON star_veg_dinein_orders;
CREATE TRIGGER set_dinein_order_no
BEFORE INSERT ON star_veg_dinein_orders
FOR EACH ROW EXECUTE FUNCTION trg_dinein_orders_set_order_no();

-- ---------------------------------------------------------
-- 7. Backfill order_no for existing rows
-- ---------------------------------------------------------
UPDATE star_veg_dinein_orders
SET order_no = to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'DDMMYYHH24MI')
             || '-' || substring(id::text, 1, 4)
WHERE order_no IS NULL;

-- ---------------------------------------------------------
-- 8. Ensure RLS lets anon + authenticated write the status fields
-- ---------------------------------------------------------
ALTER TABLE star_veg_dinein_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read dinein_orders"   ON star_veg_dinein_orders;
DROP POLICY IF EXISTS "public insert dinein_orders" ON star_veg_dinein_orders;
DROP POLICY IF EXISTS "public update dinein_orders" ON star_veg_dinein_orders;

CREATE POLICY "public read dinein_orders"   ON star_veg_dinein_orders
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert dinein_orders" ON star_veg_dinein_orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update dinein_orders" ON star_veg_dinein_orders
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON star_veg_dinein_orders TO anon, authenticated;

ALTER TABLE star_veg_dinein_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read dinein_events"   ON star_veg_dinein_events;
DROP POLICY IF EXISTS "public insert dinein_events" ON star_veg_dinein_events;

CREATE POLICY "public read dinein_events"   ON star_veg_dinein_events
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert dinein_events" ON star_veg_dinein_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON star_veg_dinein_events TO anon, authenticated;

-- ---------------------------------------------------------
-- 9. Verify
-- ---------------------------------------------------------
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'star_veg_dinein_orders'
  AND column_name IN (
    'order_no', 'accepted_at', 'preparing_at', 'served_at'
  )
ORDER BY column_name;