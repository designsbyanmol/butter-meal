-- =========================================================
-- Tenant-aware menu RPCs
-- =========================================================

-- Helper: resolve slug → uuid, raise if unknown
CREATE OR REPLACE FUNCTION resolve_tenant_id(slug_in TEXT)
RETURNS UUID AS $$
DECLARE tid UUID;
BEGIN
  SELECT id INTO tid FROM star_veg_tenants
  WHERE slug = slug_in AND is_active = TRUE;
  IF tid IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive tenant: %', slug_in;
  END IF;
  RETURN tid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- add_menu_item
CREATE OR REPLACE FUNCTION add_menu_item(tenant_slug_in TEXT, payload JSONB)
RETURNS star_veg_menu_items AS $$
DECLARE
  row star_veg_menu_items;
  tid UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  INSERT INTO star_veg_menu_items (
    tenant_id, sort_order, in_stock, name, description, cost_price, price,
    image_url, category, is_veg, is_spicy, is_gluten_free, preparation_time,
    calories, rating, review_count, ingredients, nutritional_info, attributes,
    customization_options
  )
  VALUES (
    tid, 0,
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

-- update_menu_item
CREATE OR REPLACE FUNCTION update_menu_item(tenant_slug_in TEXT, item_id INTEGER, payload JSONB)
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
    ingredients           = CASE
                              WHEN jsonb_typeof(payload->'ingredients') = 'array'
                              THEN ARRAY(SELECT jsonb_array_elements_text(payload->'ingredients'))
                              ELSE ingredients
                            END,
    nutritional_info      = CASE
                              WHEN jsonb_typeof(payload->'nutritional_info') = 'object'
                              THEN payload->'nutritional_info'
                              ELSE nutritional_info
                            END,
    attributes            = CASE
                              WHEN jsonb_typeof(payload->'attributes') = 'object'
                              THEN payload->'attributes'
                              ELSE attributes
                            END,
    customization_options = CASE
                              WHEN jsonb_typeof(payload->'customization_options') = 'array'
                              THEN payload->'customization_options'
                              ELSE customization_options
                            END,
    updated_at            = NOW()
  WHERE id = item_id AND tenant_id = tid
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_menu_item(TEXT, INTEGER, JSONB) TO anon, authenticated;

-- toggle_menu_item_stock
CREATE OR REPLACE FUNCTION toggle_menu_item_stock(tenant_slug_in TEXT, item_id INTEGER)
RETURNS star_veg_menu_items AS $$
DECLARE row star_veg_menu_items;
BEGIN
  UPDATE star_veg_menu_items
  SET in_stock = NOT in_stock, updated_at = NOW()
  WHERE id = item_id
    AND tenant_id = resolve_tenant_id(tenant_slug_in)
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION toggle_menu_item_stock(TEXT, INTEGER) TO anon, authenticated;

-- delete_menu_item
CREATE OR REPLACE FUNCTION delete_menu_item(tenant_slug_in TEXT, item_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE deleted_count INT;
BEGIN
  DELETE FROM star_veg_menu_items
  WHERE id = item_id
    AND tenant_id = resolve_tenant_id(tenant_slug_in);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_menu_item(TEXT, INTEGER) TO anon, authenticated;

-- reorder_menu_items
CREATE OR REPLACE FUNCTION reorder_menu_items(tenant_slug_in TEXT, ordered_ids INTEGER[])
RETURNS SETOF star_veg_menu_items AS $$
DECLARE
  item_id INTEGER;
  pos INTEGER := 1;
  tid UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  FOREACH item_id IN ARRAY ordered_ids LOOP
    UPDATE star_veg_menu_items
    SET sort_order = pos, updated_at = NOW()
    WHERE id = item_id AND tenant_id = tid;
    pos := pos + 1;
  END LOOP;

  RETURN QUERY
    SELECT * FROM star_veg_menu_items
    WHERE tenant_id = tid
    ORDER BY sort_order ASC, id DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reorder_menu_items(TEXT, INTEGER[]) TO anon, authenticated;