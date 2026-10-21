-- Basic: allow Add New Item + Edit Fields, keep minimal profile fields
UPDATE star_veg_plans
SET features = jsonb_build_object(
  'canOrder', false,
  'canEditFields', true,
  'canManageStore', false,
  'canManageUsers', false,
  'canWishlist', false,
  'canReview', false,
  'canAddCustomMessage', false,
  'canEditProfileFields', jsonb_build_array(
    'display_name',
    'store_tagline',
    'owner_phone',
    'storewide_discount'
  )
)
WHERE id = 'basic';

-- Dynamic: unchanged feature set except removing banner_url (not present)
-- (banner_url was never in Dynamic's list, so no change needed — but
-- we re-assert the correct list to be safe.)
UPDATE star_veg_plans
SET features = jsonb_build_object(
  'canOrder', true,
  'canEditFields', true,
  'canManageStore', true,
  'canManageUsers', false,
  'canWishlist', false,
  'canReview', false,
  'canAddCustomMessage', true,
  'canEditProfileFields', jsonb_build_array(
    'display_name',
    'store_tagline',
    'owner_phone',
    'storewide_discount',
    'whatsapp_phone',
    'delivery_charge',
    'message_template'
  )
)
WHERE id = 'dynamic';

-- Professional: everything, including banner_url
UPDATE star_veg_plans
SET features = jsonb_build_object(
  'canOrder', true,
  'canEditFields', true,
  'canManageStore', true,
  'canManageUsers', true,
  'canWishlist', true,
  'canReview', true,
  'canAddCustomMessage', true,
  'canEditProfileFields', jsonb_build_array(
    'display_name',
    'store_tagline',
    'owner_phone',
    'storewide_discount',
    'whatsapp_phone',
    'delivery_charge',
    'message_template',
    'banner_url'
  )
)
WHERE id = 'professional';