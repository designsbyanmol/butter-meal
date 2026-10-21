// src/data/storeDefaults.ts
// Backwards-compat shim. Prefer importing from './storeDefaults/index'
// in new code. Existing imports of `getCategoryDefaults` continue to work.
export {
  CATEGORY_DEFAULTS,
  getCategoryDefaults,
  type CategoryDefaults,
} from './storeDefaults/index';