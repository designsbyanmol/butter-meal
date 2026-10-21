-- Update the monthly price for each plan
UPDATE star_veg_plans SET monthly_price = 49 WHERE id = 'basic';
UPDATE star_veg_plans SET monthly_price = 99 WHERE id = 'dynamic';
UPDATE star_veg_plans SET monthly_price = 199 WHERE id = 'professional';

-- Verify
SELECT id, name, monthly_price, is_active FROM star_veg_plans ORDER BY sort_order;