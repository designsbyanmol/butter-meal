-- ============================================
-- Add sort_order column
-- ============================================
ALTER TABLE star_veg_menu_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Backfill existing rows so ordering is stable:
-- highest id gets sort_order = 1 so newest appears first
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id DESC) AS rn
  FROM star_veg_menu_items
  WHERE sort_order IS NULL
)
UPDATE star_veg_menu_items m
SET sort_order = r.rn
FROM ranked r
WHERE m.id = r.id;

-- Ensure new inserts always have a value
ALTER TABLE star_veg_menu_items
  ALTER COLUMN sort_order SET DEFAULT 0;

-- Index for the common sort
CREATE INDEX IF NOT EXISTS idx_star_veg_menu_items_sort_order
  ON star_veg_menu_items(sort_order ASC, id DESC);

-- ============================================
-- RPC to reorder in a single transaction
-- ============================================
CREATE OR REPLACE FUNCTION reorder_menu_items(ordered_ids INTEGER[])
RETURNS SETOF star_veg_menu_items AS $$
DECLARE
  item_id INTEGER;
  pos INTEGER := 1;
BEGIN
  FOREACH item_id IN ARRAY ordered_ids LOOP
    UPDATE star_veg_menu_items
    SET sort_order = pos, updated_at = NOW()
    WHERE id = item_id;
    pos := pos + 1;
  END LOOP;

  RETURN QUERY
    SELECT * FROM star_veg_menu_items
    ORDER BY sort_order ASC, id DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reorder_menu_items(INTEGER[]) TO anon, authenticated;