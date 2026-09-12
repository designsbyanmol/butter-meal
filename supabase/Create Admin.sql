-- ============================================
-- FILE: 05_seed_admin.sql
-- Seed default admin (password hashed)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM star_veg_users WHERE phone = '100') THEN
    PERFORM create_user('100', 'Admin', '100', 'admin');
  END IF;
END $$;