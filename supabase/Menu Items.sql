-- ============================================
-- FILE: 02_star_veg_menu_items_table.sql
-- PURPOSE: Create menu items table
-- ============================================

CREATE TABLE IF NOT EXISTS star_veg_menu_items (
  id SERIAL PRIMARY KEY,
  in_stock BOOLEAN DEFAULT TRUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  cost_price DECIMAL(10, 2),
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT NOT NULL,
  category VARCHAR(100),
  is_veg BOOLEAN DEFAULT FALSE,
  is_spicy BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  preparation_time VARCHAR(50),
  calories INTEGER,
  rating DECIMAL(3, 2),
  review_count INTEGER DEFAULT 0,
  ingredients TEXT[],
  nutritional_info JSONB,
  attributes JSONB,
  customization_options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_star_veg_menu_items_category ON star_veg_menu_items(category);
CREATE INDEX IF NOT EXISTS idx_star_veg_menu_items_in_stock ON star_veg_menu_items(in_stock);

-- Disable RLS for development
ALTER TABLE IF EXISTS star_veg_menu_items DISABLE ROW LEVEL SECURITY;

-- ============================================
-- END OF MENU ITEMS TABLE
-- ============================================