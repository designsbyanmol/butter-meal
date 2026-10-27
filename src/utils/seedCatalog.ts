// src/utils/seedCatalog.ts
import { getCategoryDefaults } from '../data/storeDefaults';
import { supabaseService } from '../services/supabase.service';
import { supabase } from '../services/supabase.client';
import { HOSPITAL_SERVICES_SEED } from '../data/hospitalServices'; // <-- IMPORT

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

    // 🔥 IF HOSPITAL, SEED SERVICES INSTEAD OF MENU ITEMS 🔥
    if (storeCategory === 'hospital-pharmacy') {
      const { count } = await supabase
        .from('star_veg_hospital_services')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantRow.id);

      if ((count ?? 0) > 0) return; // Already seeded

      for (const service of HOSPITAL_SERVICES_SEED) {
        await supabaseService.addHospitalService(slug, service);
      }

      console.log(`[seedCatalog] seeded ${HOSPITAL_SERVICES_SEED.length} hospital services for ${slug}`);
      return;
    }

    // Standard menu seeding for other categories
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
      `[seedCatalog] seeded ${defaults.items.length} menu items for ${slug}`,
    );
  } catch (err) {
    console.error('[seedCatalog] failed:', err);
  }
};