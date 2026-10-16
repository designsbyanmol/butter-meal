-- =========================================================
-- 1. compute_plan_change_quote
--    Read-only. Returns prorated pricing for the UI.
-- =========================================================
CREATE OR REPLACE FUNCTION compute_plan_change_quote(
  tenant_slug_in     TEXT,
  new_plan_id_in     TEXT,
  months_in          INTEGER
) RETURNS TABLE (
  is_upgrade         BOOLEAN,
  is_downgrade       BOOLEAN,
  is_renewal         BOOLEAN,
  base_amount        NUMERIC,
  credit_amount      NUMERIC,
  final_amount       NUMERIC,
  extra_days         INTEGER,
  new_expires_at     TIMESTAMPTZ,
  current_plan_id    TEXT,
  current_plan_price NUMERIC,
  new_plan_price     NUMERIC,
  remaining_days     INTEGER,
  months             INTEGER
) AS $$
DECLARE
  tid            UUID;
  cur_plan_id    TEXT;
  cur_plan_price NUMERIC;
  new_plan_price NUMERIC;
  cur_expiry     TIMESTAMPTZ;
  cur_status     TEXT;
  remaining      INTEGER;
  is_upg         BOOLEAN;
  is_down        BOOLEAN;
  is_ren         BOOLEAN;
  base           NUMERIC;
  daily_cur      NUMERIC;
  daily_new      NUMERIC;
  credit         NUMERIC;
  final_amt      NUMERIC;
  extra          INTEGER;
  exp_dt         TIMESTAMPTZ;
  months_int     INTEGER;
BEGIN
  months_int := GREATEST(COALESCE(months_in, 1), 1);

  SELECT id, plan_id, subscription_expires_at, subscription_status
  INTO tid, cur_plan_id, cur_expiry, cur_status
  FROM star_veg_tenants
  WHERE slug = tenant_slug_in;

  IF tid IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;

  SELECT monthly_price INTO cur_plan_price
  FROM star_veg_plans WHERE id = cur_plan_id;

  SELECT monthly_price INTO new_plan_price
  FROM star_veg_plans WHERE id = new_plan_id_in AND is_active = TRUE;

  IF new_plan_price IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive plan: %', new_plan_id_in;
  END IF;

  is_ren  := (cur_plan_id = new_plan_id_in);
  is_upg  := (new_plan_price > cur_plan_price) AND NOT is_ren;
  is_down := (new_plan_price < cur_plan_price) AND NOT is_ren;

  IF cur_expiry IS NULL OR cur_expiry < NOW() THEN
    remaining := 0;
  ELSE
    remaining := CEIL(EXTRACT(EPOCH FROM (cur_expiry - NOW())) / 86400)::INTEGER;
  END IF;

  base := new_plan_price * months_int;

  -- Divider of 30 is intentional — keep it consistent with the UI copy.
  daily_cur := cur_plan_price / 30.0;
  daily_new := new_plan_price / 30.0;

  -- Credit only exists when upgrading an active plan with time left.
  -- Renewals, downgrades, paused, expired → credit = 0.
  IF is_upg AND remaining > 0 AND cur_status <> 'paused' THEN
    credit := remaining * daily_cur;
  ELSE
    credit := 0;
  END IF;

  base := ROUND(base, 2);
  credit := ROUND(credit, 2);

  IF is_ren THEN
    final_amt := base;
    extra := 0;
    IF cur_expiry IS NOT NULL
       AND cur_expiry > NOW()
       AND cur_status <> 'paused' THEN
      exp_dt := cur_expiry + (months_int || ' months')::INTERVAL;
    ELSE
      exp_dt := NOW() + (months_int || ' months')::INTERVAL;
    END IF;

  ELSIF is_upg THEN
    final_amt := GREATEST(base - credit, 0);
    exp_dt := NOW() + (months_int || ' months')::INTERVAL;
    IF credit > base THEN
      extra := FLOOR((credit - base) / daily_new)::INTEGER;
      exp_dt := exp_dt + (extra || ' days')::INTERVAL;
    ELSE
      extra := 0;
    END IF;

  ELSIF is_down THEN
    final_amt := base;
    extra := 0;
    IF remaining > 0 AND cur_status <> 'paused' THEN
      extra := FLOOR((remaining * daily_cur) / daily_new)::INTEGER;
    END IF;
    exp_dt := NOW() + (months_int || ' months')::INTERVAL
              + (extra || ' days')::INTERVAL;

  ELSE
    final_amt := base;
    exp_dt := NOW() + (months_int || ' months')::INTERVAL;
  END IF;

  RETURN QUERY SELECT
    is_upg, is_down, is_ren,
    base, credit, final_amt,
    COALESCE(extra, 0),
    exp_dt,
    cur_plan_id, cur_plan_price, new_plan_price,
    remaining, months_int;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION compute_plan_change_quote(TEXT, TEXT, INTEGER)
TO anon, authenticated;

-- =========================================================
-- 2. change_plan — uses the quote
-- =========================================================
DROP FUNCTION IF EXISTS change_plan(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION change_plan(
  tenant_slug_in TEXT,
  plan_id_in     TEXT,
  months_in      INTEGER
) RETURNS star_veg_tenants AS $$
DECLARE
  row star_veg_tenants;
  q   RECORD;
BEGIN
  SELECT * INTO q
  FROM compute_plan_change_quote(tenant_slug_in, plan_id_in, months_in);

  UPDATE star_veg_tenants
  SET
    plan_id = plan_id_in,
    subscription_status = 'active',
    subscription_started_at = COALESCE(subscription_started_at, NOW()),
    subscription_expires_at = q.new_expires_at,
    is_active = TRUE,
    pause_requested = FALSE,
    pause_requested_at = NULL
  WHERE slug = tenant_slug_in
  RETURNING * INTO row;

  IF row IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION change_plan(TEXT, TEXT, INTEGER)
TO anon, authenticated;

-- =========================================================
-- 3. extend_subscription — same-plan renewal via change_plan
-- =========================================================
CREATE OR REPLACE FUNCTION extend_subscription(
  tenant_slug_in TEXT,
  months_in      INTEGER
) RETURNS star_veg_tenants AS $$
DECLARE
  cur_plan_id TEXT;
BEGIN
  SELECT plan_id INTO cur_plan_id
  FROM star_veg_tenants WHERE slug = tenant_slug_in;

  IF cur_plan_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', tenant_slug_in;
  END IF;

  RETURN change_plan(tenant_slug_in, cur_plan_id, months_in);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION extend_subscription(TEXT, INTEGER)
TO anon, authenticated;