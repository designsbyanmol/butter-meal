-- =========================================================
-- DINE-IN BILL PAYMENT — one-shot migration
-- Idempotent. Safe to re-run.
-- =========================================================

-- RPC: admin sends/withdraws the pay link by flipping pay_online.
CREATE OR REPLACE FUNCTION set_dinein_pay_online(
  order_id_in  UUID,
  pay_online_in BOOLEAN
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord star_veg_dinein_orders;
BEGIN
  UPDATE star_veg_dinein_orders
  SET
    pay_online = pay_online_in,
    updated_at = NOW()
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

-- RPC: customer backs out of online payment. Keeps the bill requested,
-- just flips pay_online back to false so staff brings the bill.
CREATE OR REPLACE FUNCTION set_dinein_settle_offline(
  order_id_in UUID
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord star_veg_dinein_orders;
BEGIN
  UPDATE star_veg_dinein_orders
  SET
    pay_online = FALSE,
    updated_at = NOW()
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

-- Verify
SELECT id, status, pay_online, bill_requested
FROM star_veg_dinein_orders
LIMIT 5;