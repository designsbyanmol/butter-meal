-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS star_veg_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_star_veg_users_phone ON star_veg_users(phone);

-- Disable Row Level Security (Development)
ALTER TABLE IF EXISTS star_veg_users DISABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view their own data" ON star_veg_users;
DROP POLICY IF EXISTS "Users can update their own data" ON star_veg_users;

-- Grant permissions (if needed)
GRANT ALL ON TABLE star_veg_users TO anon, authenticated;