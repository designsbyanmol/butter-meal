-- ============================================
-- Check admin
-- ============================================
SELECT id, phone, name, role, is_active
FROM star_veg_users
WHERE role = 'admin';