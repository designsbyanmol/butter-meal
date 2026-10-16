-- =========================================================
-- DINE-IN PER-ITEM SERVED FLAG — one-shot migration
-- Idempotent. Safe to re-run.
-- =========================================================

-- 1. Backfill `served: false` on every existing item in every order.
UPDATE star_veg_dinein_orders
SET items = (
  SELECT jsonb_agg(
    CASE
      WHEN item ? 'served' THEN item
      ELSE item || jsonb_build_object('served', FALSE)
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items IS NOT NULL
  AND jsonb_typeof(items) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(items) AS it
    WHERE NOT (it ? 'served')
  );

-- 2. RPC: set per-item served flag(s) for one order, atomically.
--    item_indexes is 0-based, matching the position in the items array.
CREATE OR REPLACE FUNCTION set_dinein_order_items_served(
  order_id_in     UUID,
  item_indexes_in INTEGER[],
  served_in       BOOLEAN
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord  star_veg_dinein_orders;
  arr  JSONB;
  idx  INTEGER;
BEGIN
  SELECT * INTO ord FROM star_veg_dinein_orders WHERE id = order_id_in;
  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', order_id_in;
  END IF;

  arr := ord.items;

  FOREACH idx IN ARRAY item_indexes_in LOOP
    IF idx IS NULL OR idx < 0 OR idx >= jsonb_array_length(arr) THEN
      CONTINUE;
    END IF;
    arr := jsonb_set(
      arr,
      ARRAY[idx::TEXT, 'served'],
      to_jsonb(served_in),
      true
    );
  END LOOP;

  UPDATE star_veg_dinein_orders
  SET items = arr,
      updated_at = NOW()
  WHERE id = order_id_in
  RETURNING * INTO ord;

  RETURN ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_dinein_order_items_served(UUID, INTEGER[], BOOLEAN)
  TO anon, authenticated;

-- 3. Verify
SELECT id, jsonb_array_length(items) AS item_count
FROM star_veg_dinein_orders
LIMIT 5;