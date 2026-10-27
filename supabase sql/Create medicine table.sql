-- 1. Drop the old table
DROP TABLE IF EXISTS star_veg_medicine_master;

-- 2. Create the table with the EXACT CSV headers (Case and symbols matter!)
CREATE TABLE star_veg_medicine_master (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT,
  "price(₹)" TEXT, 
  "Is_discontinued" TEXT,
  "manufacturer_name" TEXT,
  "type" TEXT,
  "pack_size_label" TEXT,
  "short_composition1" TEXT,
  "short_composition2" TEXT,
  search_vector tsvector
);

-- 3. Create the search index
CREATE INDEX idx_med_master_search ON star_veg_medicine_master USING GIN(search_vector);

-- 4. Create the trigger (Note: we have to use the exact quoted names here too)
CREATE OR REPLACE FUNCTION update_med_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."short_composition1", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."short_composition2", '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_med_search
BEFORE INSERT OR UPDATE ON star_veg_medicine_master
FOR EACH ROW EXECUTE FUNCTION update_med_search_vector();

-- 5. Enable public read access
ALTER TABLE star_veg_medicine_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read med master" ON star_veg_medicine_master FOR SELECT TO anon, authenticated USING (true);