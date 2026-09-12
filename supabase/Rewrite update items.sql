CREATE OR REPLACE FUNCTION update_menu_item(item_id INTEGER, payload JSONB)
RETURNS star_veg_menu_items AS $$
DECLARE
  row star_veg_menu_items;
BEGIN
  UPDATE star_veg_menu_items SET
    in_stock = CASE
      WHEN payload ? 'in_stock' THEN (payload->>'in_stock')::BOOLEAN
      ELSE in_stock
    END,

    name = CASE
      WHEN payload ? 'name' AND payload->>'name' <> '' THEN payload->>'name'
      ELSE name
    END,

    description = CASE
      WHEN payload ? 'description' THEN COALESCE(payload->>'description', '')
      ELSE description
    END,

    -- NULL-able fields: if the key is present and its value is null/empty,
    -- explicitly set the column to NULL to clear it.
    cost_price = CASE
      WHEN payload ? 'cost_price' THEN
        CASE
          WHEN payload->>'cost_price' IS NULL OR payload->>'cost_price' = ''
          THEN NULL
          ELSE (payload->>'cost_price')::DECIMAL
        END
      ELSE cost_price
    END,

    price = CASE
      WHEN payload ? 'price' AND payload->>'price' <> ''
      THEN (payload->>'price')::DECIMAL
      ELSE price
    END,

    image_url = CASE
      WHEN payload ? 'image_url' AND payload->>'image_url' <> ''
      THEN payload->>'image_url'
      ELSE image_url
    END,

    category = CASE
      WHEN payload ? 'category' THEN NULLIF(payload->>'category', '')
      ELSE category
    END,

    is_veg = CASE
      WHEN payload ? 'is_veg' THEN (payload->>'is_veg')::BOOLEAN
      ELSE is_veg
    END,

    is_spicy = CASE
      WHEN payload ? 'is_spicy' THEN (payload->>'is_spicy')::BOOLEAN
      ELSE is_spicy
    END,

    is_gluten_free = CASE
      WHEN payload ? 'is_gluten_free' THEN (payload->>'is_gluten_free')::BOOLEAN
      ELSE is_gluten_free
    END,

    preparation_time = CASE
      WHEN payload ? 'preparation_time' THEN NULLIF(payload->>'preparation_time', '')
      ELSE preparation_time
    END,

    calories = CASE
      WHEN payload ? 'calories' THEN
        CASE
          WHEN payload->>'calories' IS NULL OR payload->>'calories' = ''
          THEN NULL
          ELSE (payload->>'calories')::INTEGER
        END
      ELSE calories
    END,

    rating = CASE
      WHEN payload ? 'rating' THEN
        CASE
          WHEN payload->>'rating' IS NULL OR payload->>'rating' = ''
          THEN NULL
          ELSE (payload->>'rating')::DECIMAL
        END
      ELSE rating
    END,

    review_count = CASE
      WHEN payload ? 'review_count' THEN
        CASE
          WHEN payload->>'review_count' IS NULL OR payload->>'review_count' = ''
          THEN 0
          ELSE (payload->>'review_count')::INTEGER
        END
      ELSE review_count
    END,

    ingredients = CASE
      WHEN payload ? 'ingredients' THEN
        CASE
          WHEN jsonb_typeof(payload->'ingredients') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(payload->'ingredients'))
          ELSE NULL
        END
      ELSE ingredients
    END,

    nutritional_info = CASE
      WHEN payload ? 'nutritional_info' THEN payload->'nutritional_info'
      ELSE nutritional_info
    END,

    attributes = CASE
      WHEN payload ? 'attributes' THEN payload->'attributes'
      ELSE attributes
    END,

    customization_options = CASE
      WHEN payload ? 'customization_options' THEN payload->'customization_options'
      ELSE customization_options
    END,

    updated_at = NOW()
  WHERE id = item_id
  RETURNING * INTO row;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;