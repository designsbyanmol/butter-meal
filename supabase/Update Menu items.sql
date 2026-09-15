-- ============================================
-- update menu items
-- ============================================
CREATE OR REPLACE FUNCTION add_menu_item(payload JSONB)
RETURNS star_veg_menu_items AS $$
DECLARE row star_veg_menu_items;
BEGIN
  INSERT INTO star_veg_menu_items (
    sort_order, in_stock, name, description, cost_price, price, image_url, category,
    is_veg, is_spicy, is_gluten_free, preparation_time, calories, rating,
    review_count, ingredients, nutritional_info, attributes, customization_options
  )
  VALUES (
    0,
    COALESCE((payload->>'in_stock')::BOOLEAN, TRUE),
    payload->>'name',
    COALESCE(payload->>'description', ''),
    NULLIF(payload->>'cost_price','')::DECIMAL,
    (payload->>'price')::DECIMAL,
    payload->>'image_url',
    NULLIF(payload->>'category',''),
    COALESCE((payload->>'is_veg')::BOOLEAN, FALSE),
    COALESCE((payload->>'is_spicy')::BOOLEAN, FALSE),
    COALESCE((payload->>'is_gluten_free')::BOOLEAN, FALSE),
    NULLIF(payload->>'preparation_time',''),
    NULLIF(payload->>'calories','')::INTEGER,
    NULLIF(payload->>'rating','')::DECIMAL,
    COALESCE(NULLIF(payload->>'review_count','')::INTEGER, 0),
    -- ✅ Only extract if it's an actual array
    CASE
      WHEN jsonb_typeof(payload->'ingredients') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(payload->'ingredients'))
      ELSE NULL
    END,
    CASE
      WHEN jsonb_typeof(payload->'nutritional_info') = 'object'
      THEN payload->'nutritional_info'
      ELSE NULL
    END,
    CASE
      WHEN jsonb_typeof(payload->'attributes') = 'object'
      THEN payload->'attributes'
      ELSE NULL
    END,
    CASE
      WHEN jsonb_typeof(payload->'customization_options') = 'array'
      THEN payload->'customization_options'
      ELSE NULL
    END
  )
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_menu_item(JSONB) TO anon, authenticated;