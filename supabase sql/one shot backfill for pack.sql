-- One-shot backfill of pack_of and unit on existing stock rows
UPDATE star_veg_medicine_stock
SET
  unit = COALESCE(
    NULLIF(TRIM(unit), ''),
    CASE
      WHEN LOWER(pack_size) LIKE '%tablet%'  THEN 'tablet'
      WHEN LOWER(pack_size) LIKE '%capsule%' THEN 'capsule'
      WHEN LOWER(pack_size) LIKE '%ml%'      THEN 'ml'
      WHEN LOWER(pack_size) LIKE '%mg%'      THEN 'mg'
      WHEN LOWER(pack_size) LIKE '%gm%'      THEN 'gm'
      ELSE NULL
    END
  ),
  pack_of = COALESCE(
    NULLIF(pack_of, 0),
    NULLIF(
      (regexp_match(LOWER(COALESCE(pack_size, '')), '(\d+)'))[1],
      ''
    )::numeric,
    1
  );