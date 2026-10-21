ALTER TABLE star_veg_menu_items
  ADD COLUMN IF NOT EXISTS gallery JSONB;

-- Recreate add_menu_item with gallery
DROP FUNCTION IF EXISTS add_menu_item(TEXT, JSONB);

CREATE OR REPLACE FUNCTION add_menu_item(tenant_slug_in TEXT, payload JSONB)
RETURNS star_veg_menu_items AS $$
DECLARE
  row star_veg_menu_items;
  tid UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  INSERT INTO star_veg_menu_items (
    tenant_id, sort_order, in_stock, name, description, cost_price, price,
    discount, image_url, gallery, category, is_veg, is_spicy, is_gluten_free,
    preparation_time, calories, rating, review_count, ingredients,
    nutritional_info, attributes, customization_options
  )
  VALUES (
    tid, 0,
    COALESCE((payload->>'in_stock')::BOOLEAN, TRUE),
    payload->>'name',
    COALESCE(payload->>'description', ''),
    NULLIF(payload->>'cost_price','')::DECIMAL,
    (payload->>'price')::DECIMAL,
    COALESCE(NULLIF(payload->>'discount','')::NUMERIC, 0),
    payload->>'image_url',
    CASE WHEN jsonb_typeof(payload->'gallery') = 'array'
         THEN payload->'gallery' ELSE NULL END,
    NULLIF(payload->>'category',''),
    COALESCE((payload->>'is_veg')::BOOLEAN, FALSE),
    COALESCE((payload->>'is_spicy')::BOOLEAN, FALSE),
    COALESCE((payload->>'is_gluten_free')::BOOLEAN, FALSE),
    NULLIF(payload->>'preparation_time',''),
    NULLIF(payload->>'calories','')::INTEGER,
    NULLIF(payload->>'rating','')::DECIMAL,
    COALESCE(NULLIF(payload->>'review_count','')::INTEGER, 0),
    CASE WHEN jsonb_typeof(payload->'ingredients') = 'array'
         THEN ARRAY(SELECT jsonb_array_elements_text(payload->'ingredients'))
         ELSE NULL END,
    CASE WHEN jsonb_typeof(payload->'nutritional_info') = 'object'
         THEN payload->'nutritional_info' ELSE NULL END,
    CASE WHEN jsonb_typeof(payload->'attributes') = 'object'
         THEN payload->'attributes' ELSE NULL END,
    CASE WHEN jsonb_typeof(payload->'customization_options') = 'array'
         THEN payload->'customization_options' ELSE NULL END
  )
  RETURNING * INTO row;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_menu_item(TEXT, JSONB) TO anon, authenticated;

-- Recreate update_menu_item with gallery
DROP FUNCTION IF EXISTS update_menu_item(TEXT, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION update_menu_item(
  tenant_slug_in TEXT,
  item_id INTEGER,
  payload JSONB
)
RETURNS star_veg_menu_items AS $$
DECLARE
  row star_veg_menu_items;
  tid UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  UPDATE star_veg_menu_items SET
    in_stock              = COALESCE((payload->>'in_stock')::BOOLEAN, in_stock),
    name                  = COALESCE(payload->>'name', name),
    description           = COALESCE(payload->>'description', description),
    cost_price            = CASE WHEN payload ? 'cost_price'
                                 THEN NULLIF(payload->>'cost_price','')::DECIMAL
                                 ELSE cost_price END,
    price                 = COALESCE(NULLIF(payload->>'price','')::DECIMAL, price),
    discount              = CASE WHEN payload ? 'discount'
                                 THEN COALESCE(NULLIF(payload->>'discount','')::NUMERIC, 0)
                                 ELSE discount END,
    image_url             = COALESCE(NULLIF(payload->>'image_url',''), image_url),
    gallery               = CASE
                              WHEN payload ? 'gallery'
                              THEN CASE WHEN jsonb_typeof(payload->'gallery') = 'array'
                                        THEN payload->'gallery'
                                        ELSE NULL END
                              ELSE gallery
                            END,
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
    ingredients           = CASE WHEN jsonb_typeof(payload->'ingredients') = 'array'
                                 THEN ARRAY(SELECT jsonb_array_elements_text(payload->'ingredients'))
                                 ELSE ingredients END,
    nutritional_info      = CASE WHEN jsonb_typeof(payload->'nutritional_info') = 'object'
                                 THEN payload->'nutritional_info'
                                 ELSE nutritional_info END,
    attributes            = CASE WHEN jsonb_typeof(payload->'attributes') = 'object'
                                 THEN payload->'attributes'
                                 ELSE attributes END,
    customization_options = CASE WHEN jsonb_typeof(payload->'customization_options') = 'array'
                                 THEN payload->'customization_options'
                                 ELSE customization_options END,
    updated_at            = NOW()
  WHERE id = item_id AND tenant_id = tid
  RETURNING * INTO row;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_menu_item(TEXT, INTEGER, JSONB) TO anon, authenticated;