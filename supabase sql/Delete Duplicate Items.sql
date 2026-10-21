-- ============================================
-- Delete duplicate items
-- ============================================
DELETE FROM star_veg_menu_items
WHERE id NOT IN (
  SELECT MIN(id)
  FROM star_veg_menu_items
  GROUP BY name
);