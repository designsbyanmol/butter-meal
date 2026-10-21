-- =========================================================
-- DINE-IN CUSTOMER PAYMENT CLAIM — one-shot migration
-- Idempotent. Safe to re-run.
-- =========================================================

-- Customer marks "I've paid" but the order stays in bill_requested
-- until an admin confirms. This flag bridges the gap.
ALTER TABLE star_veg_dinein_orders
  ADD COLUMN IF NOT EXISTS customer_paid_claimed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS customer_paid_claimed_at TIMESTAMPTZ;

-- Customer says "I've paid". Records the claim but does NOT flip
-- the status. The admin must verify and call mark_dinein_order_paid.
CREATE OR REPLACE FUNCTION claim_dinein_payment(
  order_id_in UUID
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord star_veg_dinein_orders;
BEGIN
  UPDATE star_veg_dinein_orders
  SET
    customer_paid_claimed    = TRUE,
    customer_paid_claimed_at = NOW(),
    updated_at               = NOW()
  WHERE id = order_id_in
    AND status = 'bill_requested'
  RETURNING * INTO ord;

  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found or not in bill_requested state: %',
      order_id_in;
  END IF;
  RETURN ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION claim_dinein_payment(UUID)
  TO anon, authenticated;

-- Admin confirms payment. This is the one that actually flips
-- status to 'paid'. Also clears the claim flag.
CREATE OR REPLACE FUNCTION confirm_dinein_payment(
  order_id_in    UUID,
  payment_ref_in TEXT
) RETURNS star_veg_dinein_orders AS $$
DECLARE
  ord star_veg_dinein_orders;
BEGIN
  UPDATE star_veg_dinein_orders
  SET
    status                   = 'paid',
    paid_at                  = NOW(),
    payment_ref              = payment_ref_in,
    customer_paid_claimed    = FALSE,
    customer_paid_claimed_at = NULL,
    settled_offline_after_failure = FALSE,
    updated_at               = NOW()
  WHERE id = order_id_in
  RETURNING * INTO ord;

  IF ord IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', order_id_in;
  END IF;
  RETURN ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION confirm_dinein_payment(UUID, TEXT)
  TO anon, authenticated;

-- Sanity check
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'star_veg_dinein_orders'
  AND column_name IN ('customer_paid_claimed', 'customer_paid_claimed_at');