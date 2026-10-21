-- =========================================================
-- 1. Plan definitions
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_plans (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  monthly_price NUMERIC(10,2) NOT NULL,
  description   TEXT DEFAULT '',
  features      JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO star_veg_plans (id, name, monthly_price, description, features, sort_order)
VALUES
  (
    'basic', 'Basic', 99,
    'Menu display only',
    jsonb_build_object(
      'canOrder', false,
      'canEditFields', false,
      'canManageStore', false,
      'canManageUsers', false,
      'canWishlist', false,
      'canReview', false,
      'canAddCustomMessage', false,
      'canEditProfileFields', jsonb_build_array(
        'display_name','store_tagline','owner_phone','storewide_discount'
      )
    ),
    1
  ),
  (
    'dynamic', 'Dynamic', 199,
    'Menu + WhatsApp ordering',
    jsonb_build_object(
      'canOrder', true,
      'canEditFields', true,
      'canManageStore', true,
      'canManageUsers', false,
      'canWishlist', false,
      'canReview', false,
      'canAddCustomMessage', true,
      'canEditProfileFields', jsonb_build_array(
        'display_name','store_tagline','owner_phone','storewide_discount',
        'whatsapp_phone','delivery_charge','message_template'
      )
    ),
    2
  ),
  (
    'professional', 'Professional', 499,
    'Everything included',
    jsonb_build_object(
      'canOrder', true,
      'canEditFields', true,
      'canManageStore', true,
      'canManageUsers', true,
      'canWishlist', true,
      'canReview', true,
      'canAddCustomMessage', true,
      'canEditProfileFields', jsonb_build_array(
        'display_name','store_tagline','owner_phone','storewide_discount',
        'whatsapp_phone','delivery_charge','message_template',
        'banner_url'
      )
    ),
    3
  )
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- 2. Subscription columns on tenants
-- =========================================================
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS plan_id                 TEXT REFERENCES star_veg_plans(id) DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_requested         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pause_requested_at      TIMESTAMPTZ;

-- Backfill existing tenants to Professional
UPDATE star_veg_tenants
SET
  plan_id = COALESCE(plan_id, 'professional'),
  subscription_status = COALESCE(subscription_status, 'active'),
  subscription_started_at = COALESCE(subscription_started_at, NOW()),
  subscription_expires_at = COALESCE(subscription_expires_at, NOW() + INTERVAL '365 days')
WHERE plan_id IS NULL
   OR subscription_started_at IS NULL
   OR subscription_expires_at IS NULL;

-- =========================================================
-- 3. Invoices
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_invoices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  tenant_slug          TEXT NOT NULL,
  plan_id              TEXT NOT NULL,
  months               INTEGER NOT NULL,
  base_amount          NUMERIC(10,2) NOT NULL,
  discount_pct         NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_amount         NUMERIC(10,2) NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  paid_at              TIMESTAMPTZ,
  marked_paid_by       TEXT,
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  notes                TEXT DEFAULT '',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant
  ON star_veg_invoices(tenant_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON star_veg_invoices(status, created_at DESC);

-- =========================================================
-- 4. Pause requests
-- =========================================================
CREATE TABLE IF NOT EXISTS star_veg_pause_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES star_veg_tenants(id) ON DELETE CASCADE,
  tenant_slug  TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status       TEXT NOT NULL DEFAULT 'pending',
  resolved_at  TIMESTAMPTZ,
  resolved_by  TEXT
);

CREATE INDEX IF NOT EXISTS idx_pause_requests_pending
  ON star_veg_pause_requests(status, requested_at DESC);

-- =========================================================
-- 5. RPC: create tenant with plan (signup)
-- =========================================================
DROP FUNCTION IF EXISTS create_tenant_with_plan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION create_tenant_with_plan(
  display_name_in   TEXT,
  slug_in           TEXT,
  owner_phone_in    TEXT,
  owner_name_in     TEXT,
  owner_pw_in       TEXT,
  plan_id_in        TEXT,
  months_in         INTEGER,
  whatsapp_phone_in TEXT DEFAULT NULL
) RETURNS star_veg_tenants AS $$
DECLARE
  tenant_row star_veg_tenants;
  new_user_id UUID;
  plan_row star_veg_plans;
  months_int INTEGER;
BEGIN
  IF slug_in IS NULL OR length(trim(slug_in)) = 0 THEN
    RAISE EXCEPTION 'Slug is required';
  END IF;
  IF slug_in !~ '^[a-z0-9\-]+$' THEN
    RAISE EXCEPTION 'Slug can only contain lowercase letters, numbers and hyphens';
  END IF;
  IF EXISTS (SELECT 1 FROM star_veg_tenants WHERE slug = slug_in) THEN
    RAISE EXCEPTION 'A tenant with slug "%" already exists', slug_in;
  END IF;

  SELECT * INTO plan_row FROM star_veg_plans WHERE id = plan_id_in AND is_active = TRUE;
  IF plan_row IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive plan: %', plan_id_in;
  END IF;

  months_int := GREATEST(COALESCE(months_in, 1), 1);

  INSERT INTO star_veg_tenants (
    slug, display_name, owner_phone, is_active,
    plan_id, subscription_status,
    subscription_started_at, subscription_expires_at,
    whatsapp_phone
  )
  VALUES (
    slug_in, display_name_in, owner_phone_in, TRUE,
    plan_id_in, 'active',
    NOW(), NOW() + (months_int || ' months')::INTERVAL,
    COALESCE(whatsapp_phone_in, owner_phone_in)
  )
  RETURNING * INTO tenant_row;

  INSERT INTO star_veg_users (
    tenant_id, phone, name, password_hash, role, is_active
  )
  VALUES (
    tenant_row.id,
    owner_phone_in,
    COALESCE(NULLIF(trim(owner_name_in), ''), display_name_in || ' Owner'),
    crypt(owner_pw_in, gen_salt('bf', 10)),
    'admin',
    TRUE
  )
  RETURNING id INTO new_user_id;

  INSERT INTO star_veg_store_settings (
    tenant_id, is_open, closed_message, last_updated, accepting_orders
  )
  VALUES (tenant_row.id, FALSE, '', NOW(), TRUE)
  ON CONFLICT (tenant_id) DO NOTHING;

  RETURN tenant_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_tenant_with_plan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT)
TO anon, authenticated;

-- =========================================================
-- 6. RPC: extend subscription
-- =========================================================
CREATE OR REPLACE FUNCTION extend_subscription(
  tenant_slug_in TEXT,
  months_in      INTEGER
) RETURNS star_veg_tenants AS $$
DECLARE
  row star_veg_tenants;
  current_expiry TIMESTAMPTZ;
  current_status TEXT;
  new_expiry TIMESTAMPTZ;
  months_int INTEGER;
BEGIN
  months_int := GREATEST(COALESCE(months_in, 1), 1);

  SELECT subscription_expires_at, subscription_status
  INTO current_expiry, current_status
  FROM star_veg_tenants WHERE slug = tenant_slug_in;

  -- Paused stores forfeit remaining days
  IF current_expiry IS NULL
     OR current_expiry < NOW()
     OR current_status = 'paused' THEN
    new_expiry := NOW();
  ELSE
    new_expiry := current_expiry;
  END IF;

  UPDATE star_veg_tenants
  SET
    subscription_status = 'active',
    subscription_expires_at = new_expiry + (months_int || ' months')::INTERVAL,
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

GRANT EXECUTE ON FUNCTION extend_subscription(TEXT, INTEGER)
TO anon, authenticated;

-- =========================================================
-- 7. RPC: change plan
-- =========================================================
CREATE OR REPLACE FUNCTION change_plan(
  tenant_slug_in TEXT,
  plan_id_in     TEXT,
  months_in      INTEGER
) RETURNS star_veg_tenants AS $$
DECLARE
  row star_veg_tenants;
  plan_row star_veg_plans;
  current_expiry TIMESTAMPTZ;
  current_status TEXT;
  new_expiry TIMESTAMPTZ;
  months_int INTEGER;
BEGIN
  months_int := GREATEST(COALESCE(months_in, 1), 1);

  SELECT * INTO plan_row FROM star_veg_plans WHERE id = plan_id_in AND is_active = TRUE;
  IF plan_row IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive plan: %', plan_id_in;
  END IF;

  SELECT subscription_expires_at, subscription_status
  INTO current_expiry, current_status
  FROM star_veg_tenants WHERE slug = tenant_slug_in;

  IF current_expiry IS NULL
     OR current_expiry < NOW()
     OR current_status = 'paused' THEN
    new_expiry := NOW();
  ELSE
    new_expiry := current_expiry;
  END IF;

  UPDATE star_veg_tenants
  SET
    plan_id = plan_id_in,
    subscription_status = 'active',
    subscription_expires_at = new_expiry + (months_int || ' months')::INTERVAL,
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
-- 8. RPC: mark invoice paid
-- =========================================================
CREATE OR REPLACE FUNCTION mark_invoice_paid(
  invoice_id_in UUID,
  admin_note_in TEXT DEFAULT NULL
) RETURNS star_veg_invoices AS $$
DECLARE
  row star_veg_invoices;
BEGIN
  UPDATE star_veg_invoices
  SET
    status = 'paid',
    paid_at = NOW(),
    marked_paid_by = COALESCE(admin_note_in, 'admin')
  WHERE id = invoice_id_in
  RETURNING * INTO row;
  RETURN row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_invoice_paid(UUID, TEXT)
TO anon, authenticated;

-- =========================================================
-- 9. RPC: request pause (tenant-initiated)
-- =========================================================
CREATE OR REPLACE FUNCTION request_pause_tenant(
  tenant_slug_in TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE star_veg_tenants
  SET
    pause_requested = TRUE,
    pause_requested_at = NOW()
  WHERE slug = tenant_slug_in;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  INSERT INTO star_veg_pause_requests (tenant_id, tenant_slug, status)
  SELECT id, slug, 'pending'
  FROM star_veg_tenants WHERE slug = tenant_slug_in;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION request_pause_tenant(TEXT)
TO anon, authenticated;

-- =========================================================
-- 10. RPC: resolve pause request (super admin)
-- =========================================================
CREATE OR REPLACE FUNCTION resolve_pause_request(
  request_id_in UUID,
  accept_in     BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
  row star_veg_pause_requests;
BEGIN
  UPDATE star_veg_pause_requests
  SET
    status = CASE WHEN accept_in THEN 'accepted' ELSE 'rejected' END,
    resolved_at = NOW()
  WHERE id = request_id_in
  RETURNING * INTO row;

  IF row IS NULL THEN RETURN FALSE; END IF;

  IF accept_in THEN
    UPDATE star_veg_tenants
    SET
      subscription_status = 'paused',
      is_active = FALSE,
      pause_requested = FALSE,
      pause_requested_at = NULL
    WHERE slug = row.tenant_slug;
  ELSE
    UPDATE star_veg_tenants
    SET
      pause_requested = FALSE,
      pause_requested_at = NULL
    WHERE slug = row.tenant_slug;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resolve_pause_request(UUID, BOOLEAN)
TO anon, authenticated;

-- =========================================================
-- 11. RPC: expire stale subscriptions
-- =========================================================
CREATE OR REPLACE FUNCTION expire_stale_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE star_veg_tenants
  SET
    subscription_status = 'expired',
    is_active = FALSE
  WHERE
    subscription_status = 'active'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at < NOW()
    AND slug <> 'main';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION expire_stale_subscriptions()
TO anon, authenticated;