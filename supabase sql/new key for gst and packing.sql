-- Dynamic
UPDATE star_veg_plans
SET features = jsonb_set(
  features,
  '{canEditProfileFields}',
  COALESCE(features->'canEditProfileFields', '[]'::jsonb)
    || '["gst_percent","packing_charge"]'::jsonb
)
WHERE id = 'dynamic';

-- Professional
UPDATE star_veg_plans
SET features = jsonb_set(
  features,
  '{canEditProfileFields}',
  COALESCE(features->'canEditProfileFields', '[]'::jsonb)
    || '["gst_percent","packing_charge"]'::jsonb
)
WHERE id = 'professional';