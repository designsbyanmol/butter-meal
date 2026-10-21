ALTER TABLE star_veg_store_settings
  ADD COLUMN IF NOT EXISTS accepting_orders BOOLEAN DEFAULT TRUE;

-- Recreate the upsert RPC with the new column
DROP FUNCTION IF EXISTS upsert_store_settings(TEXT, BOOLEAN, TEXT, DATE, TIME);

CREATE OR REPLACE FUNCTION upsert_store_settings(
  tenant_slug_in         TEXT,
  is_open_in             BOOLEAN,
  closed_message_in      TEXT,
  expected_open_date_in  DATE,
  expected_open_time_in  TIME,
  accepting_orders_in    BOOLEAN DEFAULT TRUE
) RETURNS star_veg_store_settings AS $$
DECLARE
  row star_veg_store_settings;
  tid UUID;
BEGIN
  tid := resolve_tenant_id(tenant_slug_in);

  INSERT INTO star_veg_store_settings (
    tenant_id, is_open, closed_message, expected_open_date, expected_open_time,
    accepting_orders, last_updated
  )
  VALUES (
    tid, is_open_in, COALESCE(closed_message_in, ''),
    expected_open_date_in, expected_open_time_in,
    COALESCE(accepting_orders_in, TRUE), NOW()
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    is_open            = EXCLUDED.is_open,
    closed_message     = EXCLUDED.closed_message,
    expected_open_date = EXCLUDED.expected_open_date,
    expected_open_time = EXCLUDED.expected_open_time,
    accepting_orders   = EXCLUDED.accepting_orders,
    last_updated       = NOW()
  RETURNING * INTO row;

  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_store_settings(TEXT, BOOLEAN, TEXT, DATE, TIME, BOOLEAN)
TO anon, authenticated;