// services/supabase.service.ts
import { supabase, isSupabaseConfigured } from './supabase.client';
import { User, MenuItem, StoreSettings } from '../types';
import { TABLES } from '../config/tables';

// =========================================================
// Module-level helpers — do not depend on `this`
// =========================================================

/**
 * Normalizes a raw `customization_options` value from Supabase into
 * the canonical `CustomizationOption[]` shape. Handles both:
 *   - New:    [{ name, choices: [{ name, price }], default? }]
 *   - Legacy: [{ name, options: ["Spicy +Rs10", "Mild"], default? }]
 * Returns `undefined` when nothing valid is present.
 */
function normalizeCustomizationOptions(
  raw: any,
): MenuItem['customizationOptions'] {
  if (!Array.isArray(raw)) return undefined;

  const result = raw
    .map((opt: any) => {
      if (!opt || typeof opt !== 'object') return null;

      const groupName = String(opt.name ?? '').trim();
      if (!groupName) return null;

      // New shape
      if (Array.isArray(opt.choices)) {
        const choices = opt.choices
          .map((c: any) => {
            if (!c || typeof c !== 'object') return null;
            const name = String(c.name ?? '').trim();
            if (!name) return null;
            const price = Number(c.price);
            return {
              name,
              price: Number.isFinite(price) && price > 0 ? price : 0,
            };
          })
          .filter(Boolean) as { name: string; price: number }[];

        if (choices.length === 0) return null;

        const defaultName =
          typeof opt.default === 'string' &&
          choices.some((c) => c.name === opt.default)
            ? opt.default
            : undefined;

        return { name: groupName, choices, default: defaultName };
      }

      // Legacy shape
      if (Array.isArray(opt.options)) {
        const choices = (opt.options as string[])
          .map((o) => {
            if (typeof o !== 'string') return null;
            const match = o.match(/\+Rs(\d+)/i);
            const price = match ? parseInt(match[1], 10) : 0;
            const name = o.replace(/\s*\+Rs\d+\s*$/i, '').trim();
            if (!name) return null;
            return { name, price };
          })
          .filter(Boolean) as { name: string; price: number }[];

        if (choices.length === 0) return null;

        const legacyDefault =
          typeof opt.default === 'string'
            ? opt.default.replace(/\s*\+Rs\d+\s*$/i, '').trim()
            : undefined;

        const defaultName =
          legacyDefault && choices.some((c) => c.name === legacyDefault)
            ? legacyDefault
            : undefined;

        return { name: groupName, choices, default: defaultName };
      }

      return null;
    })
    .filter(Boolean);

  return result.length > 0
    ? (result as MenuItem['customizationOptions'])
    : undefined;
}

/** Convert "empty / null / non-finite" to undefined; keep real positives. */
function positiveNum(v: any): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Same as above but allows 0 as a valid value. */
function nonNegativeNum(v: any): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function safeArray<T = any>(v: any): T[] | undefined {
  return Array.isArray(v) ? (v as T[]) : undefined;
}

function safeObject<T = any>(v: any): T | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as T)
    : undefined;
}

// =========================================================
// Service
// =========================================================

class SupabaseService {
  private static instance: SupabaseService;

  private constructor() {}

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  private getClient() {
    if (!isSupabaseConfigured || !supabase) return null;
    return supabase;
  }

  // ============ USERS ============

  async getUsers(): Promise<User[]> {
    const client = this.getClient();
    if (!client) return [];
    const { data, error } = await client.rpc('list_users');
    if (error) {
      console.error('list_users error:', error);
      return [];
    }
    return (data || []).map((row:any) => this.mapUser(row));
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc('get_user_by_phone', {
      phone_in: phone,
    });
    if (error) {
      console.error('get_user_by_phone error:', error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? this.mapUser(row) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  async createUser(
    userData: Omit<User, 'id' | 'createdAt'>,
  ): Promise<User> {
    const client = this.getClient();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client.rpc('create_user', {
      phone_in: userData.phone,
      name_in: userData.name,
      pw_in: userData.password,
      role_in: userData.role || 'user',
    });
    if (error) throw error;

    const user = await this.getUserByPhone(userData.phone);
    if (!user) throw new Error('User created but not found');
    return user;
  }

  async updateUser(
    id: string,
    updates: Partial<User>,
  ): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;

    if (updates.password) {
      await client.rpc('change_user_password', {
        user_id: id,
        new_pw: updates.password,
      });
    }
    if (updates.isActive !== undefined) {
      const current = await this.getUserById(id);
      if (current && current.isActive !== updates.isActive) {
        await client.rpc('toggle_user_active', { user_id: id });
      }
    }
    return await this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc('delete_user', { user_id: id });
    return !error;
  }

  async toggleUserStatus(id: string): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;
    const { error } = await client.rpc('toggle_user_active', { user_id: id });
    if (error) return null;
    return await this.getUserById(id);
  }

  async changeUserPassword(
    id: string,
    newPassword: string,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc('change_user_password', {
      user_id: id,
      new_pw: newPassword,
    });
    return !error;
  }

  // ============ AUTH ============

  async signIn(
    phone: string,
    password: string,
  ): Promise<{ user: User | null; error?: string }> {
    const client = this.getClient();
    if (!client) return { user: null, error: 'Supabase not configured' };

    const { data, error } = await client.rpc('verify_password', {
      phone_in: phone,
      pw: password,
    });
    if (error) {
      console.error('verify_password error:', error);
      return { user: null, error: 'Invalid phone number or password' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { user: null, error: 'Invalid phone number or password' };
    if (!row.is_active) {
      return { user: null, error: 'Account is deactivated.' };
    }

    await client.rpc('touch_last_login', { user_id: row.id });
    return { user: this.mapUser(row) };
  }

  async signOut(): Promise<void> {
    // no-op
  }

  // ============ MENU — READ ============

  async getMenuItems(): Promise<MenuItem[] | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from(TABLES.MENU)
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('id', { ascending: false });
    if (error) {
      console.error('getMenuItems error:', error);
      return null;
    }
    return (data || []).map((row:any) => this.mapMenuItem(row));
  }

  async getVisibleMenuItems(): Promise<MenuItem[] | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from(TABLES.MENU)
      .select('*')
      .eq('in_stock', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('id', { ascending: false });
    if (error) {
      console.error('getVisibleMenuItems error:', error);
      return null;
    }
    return (data || []).map((row:any) => this.mapMenuItem(row));
  }

  // ============ MENU — WRITE ============

  async addMenuItem(item: MenuItem): Promise<MenuItem | null> {
  const client = this.getClient();
  if (!client) return null;

  // Always-present scalars. Use ?? null only for genuinely nullable columns.
  const payload: Record<string, unknown> = {
    sort_order: 0,
    in_stock: item.inStock ?? true,
    name: item.name,
    description: item.desc ?? '',
    price: item.price,
    image_url: item.img,
    is_veg: item.isVeg ?? false,
    is_spicy: item.isSpicy ?? false,
    is_gluten_free: item.isGlutenFree ?? false,
    review_count: item.reviewCount ?? 0,
  };

  // Numeric fields — send only when we have a real number
  if (typeof item.costPrice === 'number' && item.costPrice > 0) {
    payload.cost_price = item.costPrice;
  }
  if (typeof item.calories === 'number' && item.calories > 0) {
    payload.calories = item.calories;
  }
  if (typeof item.rating === 'number' && item.rating > 0) {
    payload.rating = item.rating;
  }

  // Optional strings — send only when non-empty
  if (item.category && item.category.trim() !== '') {
    payload.category = item.category;
  }
  if (item.preparationTime && item.preparationTime.trim() !== '') {
    payload.preparation_time = item.preparationTime;
  }

  // JSONB / array fields — send only when they have content.
  // This is the fix for the 22023 error: no `null` values for these keys.
  if (Array.isArray(item.ingredients) && item.ingredients.length > 0) {
    payload.ingredients = item.ingredients;
  }
  if (
    item.nutritionalInfo &&
    typeof item.nutritionalInfo === 'object' &&
    Object.keys(item.nutritionalInfo).length > 0
  ) {
    payload.nutritional_info = item.nutritionalInfo;
  }
  if (
    item.attributes &&
    typeof item.attributes === 'object' &&
    Object.values(item.attributes).some(Boolean)
  ) {
    payload.attributes = item.attributes;
  }
  if (
    Array.isArray(item.customizationOptions) &&
    item.customizationOptions.length > 0
  ) {
    payload.customization_options = item.customizationOptions;
  }

  const { data, error } = await client.rpc('add_menu_item', { payload });
  if (error) {
    console.error('add_menu_item error:', error);
    return null;
  }
  return data ? this.mapMenuItem(data) : null;
}

  async deleteMenuItem(id: number): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc('delete_menu_item', { item_id: id });
    if (error) {
      console.error('delete_menu_item error:', error);
      return false;
    }
    return true;
  }

  async updateMenuItem(
  id: number,
  updates: Partial<MenuItem>,
): Promise<MenuItem | null> {
  const client = this.getClient();
  if (!client) return null;

  const payload: Record<string, unknown> = {};

  // Use `in` check (key present) instead of `!== undefined` so that explicit
  // nulls pass through and clear the column.
  if ('inStock' in updates) payload.in_stock = updates.inStock;
  if ('name' in updates) payload.name = updates.name;
  if ('desc' in updates) payload.description = updates.desc;
  if ('costPrice' in updates) payload.cost_price = updates.costPrice ?? null;
  if ('price' in updates) payload.price = updates.price;
  if ('img' in updates) payload.image_url = updates.img ?? null;
  if ('category' in updates) payload.category = updates.category ?? null;
  if ('isVeg' in updates) payload.is_veg = updates.isVeg;
  if ('isSpicy' in updates) payload.is_spicy = updates.isSpicy;
  if ('isGlutenFree' in updates) payload.is_gluten_free = updates.isGlutenFree;
  if ('preparationTime' in updates)
    payload.preparation_time = updates.preparationTime ?? null;
  if ('calories' in updates) payload.calories = updates.calories ?? null;
  if ('rating' in updates) payload.rating = updates.rating ?? null;
  if ('reviewCount' in updates) payload.review_count = updates.reviewCount ?? null;
  if ('ingredients' in updates) {
  if (Array.isArray(updates.ingredients) && updates.ingredients.length > 0) {
    payload.ingredients = updates.ingredients;
  } else if (updates.ingredients === null) {
    payload.ingredients = null;   // explicit clear
  }
  // if undefined, omit the key entirely → RPC keeps the existing value
}
if ('nutritionalInfo' in updates) {
  if (
    updates.nutritionalInfo &&
    typeof updates.nutritionalInfo === 'object' &&
    Object.keys(updates.nutritionalInfo).length > 0
  ) {
    payload.nutritional_info = updates.nutritionalInfo;
  } else if (updates.nutritionalInfo === null) {
    payload.nutritional_info = null;
  }
}
if ('attributes' in updates) {
  if (
    updates.attributes &&
    typeof updates.attributes === 'object' &&
    Object.values(updates.attributes).some(Boolean)
  ) {
    payload.attributes = updates.attributes;
  } else if (updates.attributes === null) {
    payload.attributes = null;
  }
}
if ('customizationOptions' in updates) {
  if (
    Array.isArray(updates.customizationOptions) &&
    updates.customizationOptions.length > 0
  ) {
    payload.customization_options = updates.customizationOptions;
  } else if (updates.customizationOptions === null) {
    payload.customization_options = null;
  }
}

  const { data, error } = await client.rpc('update_menu_item', {
    item_id: id,
    payload,
  });
  if (error) {
    console.error('update_menu_item error:', error);
    return null;
  }
  return data ? this.mapMenuItem(data) : null;
}

  async toggleMenuItemStock(id: number): Promise<MenuItem | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc('toggle_menu_item_stock', {
      item_id: id,
    });
    if (error) {
      console.error('toggle_menu_item_stock error:', error);
      return null;
    }
    return data ? this.mapMenuItem(data) : null;
  }

  async bulkUpdateMenuItems(
    updates: { id: number; inStock: boolean }[],
  ): Promise<MenuItem[]> {
    const results: MenuItem[] = [];
    const errors: string[] = [];
    for (const update of updates) {
      const r = await this.updateMenuItem(update.id, {
        inStock: update.inStock,
      });
      if (r) results.push(r);
      else errors.push(`id=${update.id}`);
    }
    if (errors.length) {
      console.error('bulkUpdateMenuItems failed for:', errors.join(', '));
    }
    return results;
  }

  async reorderMenuItems(
    orderedIds: number[],
  ): Promise<MenuItem[] | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc('reorder_menu_items', {
      ordered_ids: orderedIds,
    });
    if (error) {
      console.error('reorder_menu_items error:', error);
      return null;
    }
    return (data || []).map((row:any) => this.mapMenuItem(row));
  }

  async initializeMenuItems(defaultItems: MenuItem[]): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    const { count, error } = await client
      .from(TABLES.MENU)
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    if ((count ?? 0) > 0) return;

    console.log(`Seeding ${defaultItems.length} items...`);
    let inserted = 0;
    let failed = 0;

    for (const item of defaultItems) {
      const result = await this.addMenuItem(item);
      if (result) inserted++;
      else {
        failed++;
        console.error(`Failed to insert: ${item.name}`);
      }
    }
    console.log(`Seed done: ${inserted} inserted, ${failed} failed`);

    if (inserted === 0 && defaultItems.length > 0) {
      throw new Error(
        'Seeding failed entirely — check add_menu_item RPC + grants.',
      );
    }
  }

  // ============ STORE SETTINGS ============

  async getStoreSettings(): Promise<StoreSettings | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from(TABLES.STORE_SETTINGS)
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getStoreSettings error:', error);
      return null;
    }
    if (!data) return null;

    return {
      isOpen: data.is_open ?? true,
      closedMessage: data.closed_message || '',
      expectedOpenDate: data.expected_open_date || '',
      expectedOpenTime: data.expected_open_time || '',
      lastUpdated: data.last_updated || new Date().toISOString(),
    };
  }

  async updateStoreSettings(settings: StoreSettings): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc('upsert_store_settings', {
      is_open_in: settings.isOpen,
      closed_message_in: settings.closedMessage || '',
      expected_open_date_in: settings.expectedOpenDate || null,
      expected_open_time_in: settings.expectedOpenTime || null,
    });
    if (error) {
      console.error('upsert_store_settings error:', error);
      return false;
    }
    return true;
  }

  // ============ MAPPERS ============

  private mapUser(row: any): User {
    return {
      id: row.id,
      phone: row.phone,
      name: row.name,
      password: '',
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      lastLogin: row.last_login,
    };
  }

  private mapMenuItem(item: any): MenuItem {
    return {
      id: item.id,
      sortOrder: item.sort_order ?? undefined,
      inStock: item.in_stock,
      name: item.name,
      desc: item.description ?? '',
      costPrice: positiveNum(item.cost_price),
      price: item.price,
      img: item.image_url,
      category: item.category || undefined,
      isVeg: item.is_veg ?? false,
      isSpicy: item.is_spicy ?? false,
      isGlutenFree: item.is_gluten_free ?? false,
      preparationTime: item.preparation_time || undefined,
      calories: positiveNum(item.calories),
      rating: positiveNum(item.rating),
      reviewCount: positiveNum(item.review_count),
      ingredients:
        safeArray<string>(item.ingredients)?.filter(
          (s) => typeof s === 'string' && s.trim() !== '',
        ) ?? undefined,
      nutritionalInfo: safeObject<MenuItem['nutritionalInfo']>(
        item.nutritional_info,
      ),
      attributes: safeObject<MenuItem['attributes']>(item.attributes),
      customizationOptions: normalizeCustomizationOptions(
        item.customization_options,
      ),
    };
  }
}

export const supabaseService = SupabaseService.getInstance();