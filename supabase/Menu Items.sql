CREATE OR REPLACE FUNCTION add_menu_item(payload JSONB)
RETURNS star_veg_menu_items AS $$
DECLARE row star_veg_menu_items;
BEGIN
  INSERT INTO star_veg_menu_items (
    in_stock, name, description, cost_price, price, image_url, category,
    is_veg, is_spicy, is_gluten_free, preparation_time, calories, rating,
    review_count, ingredients, nutritional_info, attributes, customization_options
  )
  VALUES (
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
    CASE WHEN payload ? 'ingredients'
         THEN ARRAY(SELECT jsonb_array_elements_text(payload->'ingredients'))
         ELSE NULL END,
    payload->'nutritional_info',
    payload->'attributes',
    payload->'customization_options'
  )
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_menu_item(item_id INTEGER, payload JSONB)
RETURNS star_veg_menu_items AS $$
DECLARE row star_veg_menu_items;
BEGIN
  UPDATE star_veg_menu_items SET
    in_stock              = COALESCE((payload->>'in_stock')::BOOLEAN, in_stock),
    name                  = COALESCE(payload->>'name', name),
    description           = COALESCE(payload->>'description', description),
    cost_price            = CASE WHEN payload ? 'cost_price'
                                 THEN NULLIF(payload->>'cost_price','')::DECIMAL
                                 ELSE cost_price END,
    price                 = COALESCE(NULLIF(payload->>'price','')::DECIMAL, price),
    image_url             = COALESCE(NULLIF(payload->>'image_url',''), image_url),
    category              = COALESCE(payload->>'category', category),
    is_veg                = COALESCE((payload->>'is_veg')::BOOLEAN, is_veg),
    is_spicy              = COALESCE((payload->>'is_spicy')::BOOLEAN, is_spicy),
    is_gluten_free        = COALESCE((payload->>'is_gluten_free')::BOOLEAN, is_gluten_free),
    preparation_time      = COALESCE(payload->>'preparation_time', preparation_time),
    calories              = CASE WHEN payload ? 'calories'
                                 THEN NULLIF(payload->>'calories','')::INTEGER
                                 ELSE calories END,
    rating                = CASE WHEN payload ? 'rating'
                                 THEN NULLIF(payload->>'rating','')::DECIMAL
                                 ELSE rating END,
    review_count          = COALESCE(NULLIF(payload->>'review_count','')::INTEGER, review_count),
    ingredients           = CASE WHEN payload ? 'ingredients'
                                 THEN ARRAY(SELECT jsonb_array_elements_text(payload->'ingredients'))
                                 ELSE ingredients END,
    nutritional_info      = COALESCE(payload->'nutritional_info', nutritional_info),
    attributes            = COALESCE(payload->'attributes', attributes),
    customization_options = CASE WHEN payload ? 'customization_options'
                                 THEN payload->'customization_options'
                                 ELSE customization_options END,
    updated_at            = NOW()
  WHERE id = item_id
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION toggle_menu_item_stock(item_id INTEGER)
RETURNS star_veg_menu_items AS $$
DECLARE row star_veg_menu_items;
BEGIN
  UPDATE star_veg_menu_items
  SET in_stock = NOT in_stock, updated_at = NOW()
  WHERE id = item_id
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_menu_item(item_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM star_veg_menu_items WHERE id = item_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_menu_item(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_menu_item(INTEGER, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION toggle_menu_item_stock(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_menu_item(INTEGER) TO anon, authenticated;