CREATE OR REPLACE FUNCTION deduct_pharmacy_stock(
  tenant_slug_in TEXT,
  items_in JSONB
) RETURNS VOID AS $$
DECLARE
  item RECORD;
  tid UUID;
BEGIN
  -- Get tenant ID
  SELECT id INTO tid FROM star_veg_tenants WHERE slug = tenant_slug_in;
  IF tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Loop through the items in the bill
  FOR item IN SELECT * FROM jsonb_to_recordset(items_in) AS x(name TEXT, qty INTEGER)
  LOOP
    IF item.name IS NOT NULL AND item.qty > 0 THEN
      -- Deduct stock, ensuring it never goes below 0
      UPDATE star_veg_medicine_stock
      SET stock_qty = GREATEST(0, stock_qty - item.qty),
          updated_at = NOW()
      WHERE tenant_id = tid 
        AND name = item.name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION deduct_pharmacy_stock(TEXT, JSONB) TO anon, authenticated;