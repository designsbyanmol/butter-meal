// src/utils/seedCatalog.ts
import { getCategoryDefaults } from '../data/storeDefaults';
import { supabaseService } from '../services/supabase.service';
import { supabase } from '../services/supabase.client';

/**
 * Seed the default sample items for a freshly-created tenant.
 * Idempotent: if items already exist, does nothing.
 */
export const seedNewStoreCatalog = async (
  slug: string,
  storeCategory: string | undefined | null,
): Promise<void> => {
  if (!supabase) return;

  try {
    const { data: tenantRow } = await supabase
      .from('star_veg_tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (!tenantRow) {
      console.warn('[seedCatalog] tenant not found:', slug);
      return;
    }

    const { count } = await supabase
      .from('star_veg_menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantRow.id);

    if ((count ?? 0) > 0) return;

    const defaults = getCategoryDefaults(
      (storeCategory as any) || 'food-beverage',
    );

    for (const item of defaults.items) {
      await supabaseService.addMenuItem(slug, item);
    }

    console.log(
      `[seedCatalog] seeded ${defaults.items.length} items for ${slug}`,
    );
  } catch (err) {
    console.error('[seedCatalog] failed:', err);
  }
};