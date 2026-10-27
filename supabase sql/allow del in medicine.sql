-- Allow delete operations on the stock table
DROP POLICY IF EXISTS "public delete med stock" ON star_veg_medicine_stock;
CREATE POLICY "public delete med stock" ON star_veg_medicine_stock 
FOR DELETE TO anon, authenticated USING (true);

-- Ensure the DELETE grant is applied
GRANT DELETE ON star_veg_medicine_stock TO anon, authenticated;