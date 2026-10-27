// src/utils/medicineApi.ts
import { supabase } from '../services/supabase.client';

export interface ApiMedicineResult {
  name: string;
  composition: string;
  manufacturer: string;
  packSize: string;
}

export const searchMedicineApi = async (query: string): Promise<ApiMedicineResult[]> => {
  if (!query || query.length < 2 || !supabase) return [];

  try {
    // We use ilike with wildcards (%) for a guaranteed partial match
    const { data, error } = await supabase
      .from('star_veg_medicine_master')
      .select('"name", "short_composition1", "short_composition2", "manufacturer_name", "pack_size_label"')
      // Search for the query in EITHER the name OR the composition
      .or(`name.ilike.%${query}%,short_composition1.ilike.%${query}%`)
      .limit(15); // Limit to 15 results to keep the UI fast

    if (error) {
      console.error('Supabase medicine search error:', error);
      return [];
    }

    if (!data) return [];

    return data.map((item: any) => ({
      name: item.name || '',
      composition: [item.short_composition1, item.short_composition2]
        .filter(Boolean)
        .join(' + '),
      manufacturer: item.manufacturer_name || '',
      packSize: item.pack_size_label || '',
    }));
  } catch (err) {
    console.error('Search failed:', err);
    return [];
  }
};