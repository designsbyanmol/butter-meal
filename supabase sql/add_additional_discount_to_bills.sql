-- sql/add_additional_discount_to_bills.sql
ALTER TABLE star_veg_pharmacy_bills
  ADD COLUMN IF NOT EXISTS additional_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_discount     NUMERIC(10,2) NOT NULL DEFAULT 0;