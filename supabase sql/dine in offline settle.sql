-- =========================================================
-- DINE-IN OFFLINE SETTLE AFTER FAILURE — one-shot migration
-- Idempotent.
-- =========================================================

ALTER TABLE star_veg_dinein_orders
  ADD COLUMN IF NOT EXISTS settled_offline_after_failure BOOLEAN DEFAULT FALSE;

-- Customer taps "Settle Offline" → record that this was a
-- failed-online-payment rescue, so the admin sees a prominent notice.
CREATE OR REPLACE FUNCTION set_dinein_settle_offline(
  order_id_in UUID
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord star_veg_dinein_orders;
BEGIN
  UPDATE star_veg_dinein_orders
  SET
    pay_online                          = FALSE,
    pay_online_requested                = FALSE,
    settled_offline_after_failure       = TRUE,
    updated_at                          = NOW()
  WHERE id = order_id_in
  RETURNING * INTO ord;

  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', order_id_in;
  END IF;
  RETURN ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_dinein_settle_offline(UUID)
  TO anon, authenticated;

-- Admin approves a fresh online payment → clear the failure flag.
CREATE OR REPLACE FUNCTION set_dinein_pay_online(
  order_id_in   UUID,
  pay_online_in BOOLEAN
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord star_veg_dinein_orders;
BEGIN
  UPDATE star_veg_dinein_orders
  SET
    pay_online                    = pay_online_in,
    -- Clear the offline-after-failure flag when the admin re-opens
    -- online payment (customer is retrying via a fresh link).
    settled_offline_after_failure = CASE
      WHEN pay_online_in THEN FALSE
      ELSE settled_offline_after_failure
    END,
    updated_at                    = NOW()
  WHERE id = order_id_in
  RETURNING * INTO ord;

  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', order_id_in;
  END IF;
  RETURN ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_dinein_pay_online(UUID, BOOLEAN)
  TO anon, authenticated;

-- Fresh bill request → clear the flag from any prior cycle.
CREATE OR REPLACE FUNCTION request_dinein_bill(
  order_id_in             UUID,
  pay_online_requested_in BOOLEAN
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord    star_veg_dinein_orders;
  tid    UUID;
  tslug  TEXT;
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
    status                        = 'bill_requested',
    bill_requested                = TRUE,
    bill_requested_at             = NOW(),
    pay_online_requested          = COALESCE(pay_online_requested_in, FALSE),
    pay_online                    = FALSE,
    settled_offline_after_failure = FALSE,
    updated_at                    = NOW()
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