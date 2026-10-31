CREATE OR REPLACE FUNCTION prune_old_history(months_in INTEGER DEFAULT 3)
RETURNS JSONB AS $$
DECLARE
  cutoff TIMESTAMPTZ;
  removed_pharmacy INT := 0;
  removed_store    INT := 0;
  removed_dinein   INT := 0;
BEGIN
  IF months_in IS NULL OR months_in < 1 THEN
    months_in := 3;
  END IF;

  cutoff := NOW() - (months_in || ' months')::INTERVAL;

  DELETE FROM star_veg_pharmacy_bills WHERE created_at < cutoff;
  GET DIAGNOSTICS removed_pharmacy = ROW_COUNT;

  DELETE FROM star_veg_store_bills WHERE created_at < cutoff;
  GET DIAGNOSTICS removed_store = ROW_COUNT;

  DELETE FROM star_veg_dinein_orders WHERE created_at < cutoff;
  GET DIAGNOSTICS removed_dinein = ROW_COUNT;

  RETURN jsonb_build_object(
    'pharmacy', removed_pharmacy,
    'store', removed_store,
    'dinein', removed_dinein,
    'cutoff', cutoff
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;