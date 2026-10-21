-- =========================================================
-- DINE-IN PAY FLOW — one-shot migration
-- Idempotent. Safe to re-run.
-- =========================================================

-- 1. New columns
ALTER TABLE star_veg_dinein_orders
  ADD COLUMN IF NOT EXISTS pay_online_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS session_closed       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS closed_at            TIMESTAMPTZ;

-- 2. Customer requests a bill and states their intent.
--    This ONLY records the customer's choice. The admin's approval
--    (pay_online) is set separately via set_dinein_pay_online.
CREATE OR REPLACE FUNCTION request_dinein_bill(
  order_id_in            UUID,
  pay_online_requested_in BOOLEAN
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord star_veg_dinein_orders;
  tid UUID;
  tslug TEXT;
  tlabel TEXT;
BEGIN
  SELECT tenant_id, tenant_slug, table_label
  INTO tid, tslug, tlabel
  FROM star_veg_dinein_orders
  WHERE id = order_id_in;

  IF tid IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', order_id_in;
  END IF;

  UPDATE star_veg_dinein_orders
  SET
    status               = 'bill_requested',
    bill_requested       = TRUE,
    bill_requested_at    = NOW(),
    pay_online_requested = COALESCE(pay_online_requested_in, FALSE),
    -- The admin must approve online payment; reset to false on every
    -- fresh request so a rejected pay link doesn't leak forward.
    pay_online           = FALSE,
    updated_at           = NOW()
  WHERE id = order_id_in
  RETURNING * INTO ord;

  INSERT INTO star_veg_dinein_events (
    tenant_id, tenant_slug, order_id, table_label, kind, payload
  )
  VALUES (
    tid, tslug, order_id_in, tlabel, 'bill_request',
    jsonb_build_object('payOnline', COALESCE(pay_online_requested_in, FALSE))
  );

  RETURN ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION request_dinein_bill(UUID, BOOLEAN)
  TO anon, authenticated;

-- 3. Customer ends their session — the order stays in the DB but
--    drops out of the tenant's Served tab.
CREATE OR REPLACE FUNCTION end_dinein_order(
  order_id_in UUID
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord star_veg_dinein_orders;
BEGIN
  UPDATE star_veg_dinein_orders
  SET
    session_closed = TRUE,
    closed_at      = NOW(),
    updated_at     = NOW()
  WHERE id = order_id_in
  RETURNING * INTO ord;

  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', order_id_in;
  END IF;
  RETURN ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION end_dinein_order(UUID)
  TO anon, authenticated;

-- 4. Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'star_veg_dinein_orders'
  AND column_name IN (
    'pay_online_requested', 'session_closed', 'closed_at'
  )
ORDER BY column_name;