-- =========================================================
-- RPC: get_store_settings_by_slug
-- Reads a tenant's store settings in a single round-trip.
-- Returns safe defaults when the row does not exist yet.
-- Idempotent. Safe to re-run.
-- =========================================================
CREATE OR REPLACE FUNCTION get_store_settings_by_slug(
  tenant_slug_in TEXT
)
RETURNS TABLE (
  is_open            BOOLEAN,
  closed_message     TEXT,
  expected_open_date DATE,
  expected_open_time TIME,
  accepting_orders   BOOLEAN,
  last_updated       TIMESTAMPTZ
) AS $$
DECLARE
  tid UUID;
BEGIN
  -- Resolve tenant id (this also raises if the tenant is unknown).
  tid := resolve_tenant_id(tenant_slug_in);

  RETURN QUERY
  SELECT
    COALESCE(s.is_open,            TRUE)  AS is_open,
    COALESCE(s.closed_message,     '')    AS closed_message,
    s.expected_open_date,
    s.expected_open_time,
    COALESCE(s.accepting_orders,   TRUE)  AS accepting_orders,
    COALESCE(s.last_updated,       NOW()) AS last_updated
  FROM star_veg_store_settings s
  WHERE s.tenant_id = tid;

  -- No row yet: return a default row so the client always gets data.
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      TRUE::BOOLEAN       AS is_open,
      ''::TEXT            AS closed_message,
      NULL::DATE          AS expected_open_date,
      NULL::TIME          AS expected_open_time,
      TRUE::BOOLEAN       AS accepting_orders,
      NOW()               AS last_updated;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_store_settings_by_slug(TEXT)
  TO anon, authenticated;