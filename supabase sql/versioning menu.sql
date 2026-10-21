-- 1. Column
ALTER TABLE star_veg_tenants
  ADD COLUMN IF NOT EXISTS menu_version BIGINT NOT NULL DEFAULT 0;

-- 2. Bump helper
CREATE OR REPLACE FUNCTION bump_tenant_menu_version(tenant_id_in UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE star_veg_tenants
  SET menu_version = menu_version + 1
  WHERE id = tenant_id_in;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger on star_veg_menu_items
CREATE OR REPLACE FUNCTION trg_menu_items_bump_version()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM bump_tenant_menu_version(OLD.tenant_id);
    RETURN OLD;
  ELSE
    PERFORM bump_tenant_menu_version(NEW.tenant_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS menu_items_bump_version ON star_veg_menu_items;
CREATE TRIGGER menu_items_bump_version
AFTER INSERT OR UPDATE OR DELETE ON star_veg_menu_items
FOR EACH ROW EXECUTE FUNCTION trg_menu_items_bump_version();