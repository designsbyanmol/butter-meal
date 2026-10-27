-- migrations/next_available_slug.sql

CREATE OR REPLACE FUNCTION next_available_slug(
  base_slug_in TEXT,
  max_suffix_in INTEGER DEFAULT 20
) RETURNS TEXT AS $$
DECLARE
  base TEXT;
  suffix INTEGER := 0;
  candidate TEXT;
  exists_already BOOLEAN;
  max_suffix INTEGER := GREATEST(COALESCE(max_suffix_in, 20), 1);
BEGIN
  -- Sanitize the base slug the same way the client does.
  base := lower(trim(base_slug_in));
  base := regexp_replace(base, '[^a-z0-9-]+', '-', 'g');
  base := regexp_replace(base, '^-|-$', '', 'g');

  IF base IS NULL OR length(base) = 0 THEN
    RETURN NULL;
  END IF;

  -- Try the bare slug first.
  SELECT EXISTS(SELECT 1 FROM star_veg_tenants WHERE slug = base)
    INTO exists_already;

  IF NOT exists_already THEN
    RETURN base;
  END IF;

  -- Try base-1, base-2, ..., base-N.
  FOR suffix IN 1..max_suffix LOOP
    candidate := base || '-' || suffix;

    SELECT EXISTS(SELECT 1 FROM star_veg_tenants WHERE slug = candidate)
      INTO exists_already;

    IF NOT exists_already THEN
      RETURN candidate;
    END IF;
  END LOOP;

  -- Every candidate is taken. Return NULL to signal "give up".
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION next_available_slug(TEXT, INTEGER)
TO anon, authenticated;