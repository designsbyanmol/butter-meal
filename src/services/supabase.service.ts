// services/supabase.service.ts
import { supabase, isSupabaseConfigured } from "./supabase.client";
import {
  MenuItem,
  MessageTemplate,
  Review,
  ReviewFilter,
  StoreSettings,
  User,
} from "../types";
import { TABLES } from "../config/tables";
import { Tenant } from "../contexts/TenantContext";
import {
  FormSchema,
  DineinTable,
  DineinOrder,
  DineinOrderItem,
  DineinEvent,
} from "../types";
import { menuService } from "./menu.service";

// =========================================================
// Module-level helpers - do not depend on `this`
// =========================================================

/**
 * Module-scoped cache for the tenant list. Three different admin
 * screens call `getAllTenants()` on mount; without a cache that's
 * three identical network round-trips for the same data within a
 * few seconds. A 30-second TTL removes the redundancy without ever
 * showing meaningfully stale data (any mutation clears the cache
 * explicitly via `invalidateTenantsCache`).
 */
let tenantsCache: { data: Tenant[]; at: number } | null = null;
const TENANTS_CACHE_MS = 30_000;

/** Invalidate the tenants cache. Call after any tenant mutation. */
export const invalidateTenantsCache = () => {
  tenantsCache = null;
};

/**
 * Normalizes a raw `customization_options` value from Supabase into
 * the canonical `CustomizationOption[]` shape. Handles both:
 *   - New:    [{ name, choices: [{ name, price }], default? }]
 *   - Legacy: [{ name, options: ["Spicy +Rs10", "Mild"], default? }]
 * Returns `undefined` when nothing valid is present.
 */
function normalizeCustomizationOptions(
  raw: any,
): MenuItem["customizationOptions"] {
  if (!Array.isArray(raw)) return undefined;

  const result = raw
    .map((opt: any) => {
      if (!opt || typeof opt !== "object") return null;

      const groupName = String(opt.name ?? "").trim();
      if (!groupName) return null;

      // New shape
      if (Array.isArray(opt.choices)) {
        const choices = opt.choices
          .map((c: any) => {
            if (!c || typeof c !== "object") return null;
            const name = String(c.name ?? "").trim();
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
          typeof opt.default === "string" &&
          choices.some((c) => c.name === opt.default)
            ? opt.default
            : undefined;

        return { name: groupName, choices, default: defaultName };
      }

      // Legacy shape
      if (Array.isArray(opt.options)) {
        const choices = (opt.options as string[])
          .map((o) => {
            if (typeof o !== "string") return null;
            const match = o.match(/\+Rs(\d+)/i);
            const price = match ? parseInt(match[1], 10) : 0;
            const name = o.replace(/\s*\+Rs\d+\s*$/i, "").trim();
            if (!name) return null;
            return { name, price };
          })
          .filter(Boolean) as { name: string; price: number }[];

        if (choices.length === 0) return null;

        const legacyDefault =
          typeof opt.default === "string"
            ? opt.default.replace(/\s*\+Rs\d+\s*$/i, "").trim()
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
    ? (result as MenuItem["customizationOptions"])
    : undefined;
}

/** Convert "empty / null / non-finite" to undefined; keep real positives. */
function positiveNum(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Same as above but allows 0 as a valid value. */
function nonNegativeNum(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function safeArray<T = any>(v: any): T[] | undefined {
  return Array.isArray(v) ? (v as T[]) : undefined;
}

function safeObject<T = any>(v: any): T | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as T) : undefined;
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

  async getUsers(tenantSlug: string): Promise<User[]> {
    const client = this.getClient();
    if (!client) return [];
    const { data, error } = await client.rpc("list_users", {
      tenant_slug_in: tenantSlug,
    });
    if (error) {
      console.error("list_users error:", error);
      return [];
    }
    return (data || []).map((row: any) => this.mapUser(row));
  }

  async getUserByPhone(
    tenantSlug: string,
    phone: string,
  ): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc("get_user_by_phone", {
      tenant_slug_in: tenantSlug,
      phone_in: phone,
    });
    if (error) {
      console.error("get_user_by_phone error:", error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? this.mapUser(row) : null;
  }

  async createUser(
    tenantSlug: string,
    userData: Omit<User, "id" | "createdAt">,
  ): Promise<User> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase not configured");

    const { error } = await client.rpc("create_user", {
      tenant_slug_in: tenantSlug,
      phone_in: userData.phone,
      name_in: userData.name,
      pw_in: userData.password,
      role_in: userData.role || "user",
    });
    if (error) throw error;

    const user = await this.getUserByPhone(tenantSlug, userData.phone);
    if (!user) throw new Error("User created but not found");
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc("get_user_by_id", {
      user_id: id,
    });
    if (error) {
      console.error("get_user_by_id error:", error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? this.mapUser(row) : null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;

    if (updates.password) {
      await client.rpc("change_user_password", {
        user_id: id,
        new_pw: updates.password,
      });
    }
    if (updates.isActive !== undefined) {
      const current = await this.getUserById(id);
      if (current && current.isActive !== updates.isActive) {
        await client.rpc("toggle_user_active", { user_id: id });
      }
    }
    return await this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc("delete_user", { user_id: id });
    return !error;
  }

  async toggleUserStatus(id: string): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;
    const { error } = await client.rpc("toggle_user_active", { user_id: id });
    if (error) return null;
    return await this.getUserById(id);
  }

  async changeUserPassword(id: string, newPassword: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc("change_user_password", {
      user_id: id,
      new_pw: newPassword,
    });
    return !error;
  }

  // ============ TENANTS ============

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from("star_veg_tenants")
      .select("id, slug, display_name, is_active")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      slug: data.slug,
      displayName: data.display_name,
    };
  }

  /**
   * Returns true if no tenant currently uses this slug.
   * Safe to call from unauthenticated clients - the tenants table has
   * public read access, so this doesn't leak anything beyond what
   * signup already reveals (which slugs exist).
   */
  async isTenantSlugAvailable(slug: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    const normalized = slug.trim().toLowerCase();
    if (!normalized) return false;

    const { data, error } = await client
      .from("star_veg_tenants")
      .select("slug")
      .eq("slug", normalized)
      .maybeSingle();

    if (error) {
      console.error("isTenantSlugAvailable error:", error);
      // Fail closed - treat the slug as taken if we can't confirm availability
      return false;
    }

    return !data;
  }

  async createTenant(displayName: string, ownerPhone: string): Promise<Tenant> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase not configured");

    const slug = displayName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data, error } = await client
      .from("star_veg_tenants")
      .insert({
        slug,
        display_name: displayName,
        owner_phone: ownerPhone,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;

    invalidateTenantsCache();

    return {
      id: data.id,
      slug: data.slug,
      displayName: data.display_name,
    };
  }

  // ============ AUTH ============

  async signIn(
    phone: string,
    password: string,
  ): Promise<{ user: User | null; error?: string }> {
    const client = this.getClient();
    if (!client) return { user: null, error: "Supabase not configured" };

    const { data, error } = await client.rpc("verify_password", {
      phone_in: phone,
      pw: password,
    });
    if (error) {
      console.error("verify_password error:", error);
      return { user: null, error: "Invalid phone number or password" };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { user: null, error: "Invalid phone number or password" };
    if (!row.is_active) {
      return { user: null, error: "Account is deactivated." };
    }

    await client.rpc("touch_last_login", { user_id: row.id });
    return { user: this.mapUser(row) };
  }

  async signOut(): Promise<void> {
    // no-op
  }

  // ============ MENU - READ ============

  async getMenuItems(tenantSlug: string): Promise<MenuItem[] | null> {
    const client = this.getClient();
    if (!client) return null;

    // Resolve slug > id in one trip
    const { data: tenantRow, error: tErr } = await client
      .from("star_veg_tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (tErr || !tenantRow) {
      console.error("getMenuItems: unknown tenant", tenantSlug);
      return null;
    }

    const { data, error } = await client
      .from(TABLES.MENU)
      .select("*")
      .eq("tenant_id", tenantRow.id)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("getMenuItems error:", error);
      return null;
    }
    return (data || []).map((row: any) => this.mapMenuItem(row));
  }

  async getVisibleMenuItems(): Promise<MenuItem[] | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from(TABLES.MENU)
      .select("*")
      .eq("in_stock", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false });
    if (error) {
      console.error("getVisibleMenuItems error:", error);
      return null;
    }
    return (data || []).map((row: any) => this.mapMenuItem(row));
  }

  // ============ MENU - WRITE ============

  async addMenuItem(
    tenantSlug: string,
    item: MenuItem,
  ): Promise<MenuItem | null> {
    const client = this.getClient();
    if (!client) return null;

    const payload: Record<string, unknown> = {
      sort_order: 0,
      in_stock: item.inStock ?? true,
      name: item.name,
      description: item.desc ?? "",
      price: item.price,
      image_url: item.img,
      is_veg: item.isVeg ?? false,
      is_spicy: item.isSpicy ?? false,
      is_gluten_free: item.isGlutenFree ?? false,
      review_count: item.reviewCount ?? 0,
    };
    if (Array.isArray(item.gallery) && item.gallery.length > 0) {
      payload.gallery = item.gallery;
    }

    if (typeof item.costPrice === "number" && item.costPrice > 0)
      payload.cost_price = item.costPrice;
    if (typeof item.discount === "number" && item.discount > 0)
      payload.discount = item.discount;
    if (typeof item.calories === "number" && item.calories > 0)
      payload.calories = item.calories;
    if (typeof item.rating === "number" && item.rating > 0)
      payload.rating = item.rating;
    if (typeof item.reviewCount === "number" && item.reviewCount > 0)
      payload.review_count = item.reviewCount;
    if (item.category?.trim()) payload.category = item.category;
    if (item.preparationTime?.trim())
      payload.preparation_time = item.preparationTime;
    if (Array.isArray(item.ingredients) && item.ingredients.length > 0)
      payload.ingredients = item.ingredients;
    if (item.nutritionalInfo && Object.keys(item.nutritionalInfo).length > 0)
      payload.nutritional_info = item.nutritionalInfo;
    if (item.attributes && Object.values(item.attributes).some(Boolean))
      payload.attributes = item.attributes;
    if (
      Array.isArray(item.customizationOptions) &&
      item.customizationOptions.length > 0
    )
      payload.customization_options = item.customizationOptions;

    const { data, error } = await client.rpc("add_menu_item", {
      tenant_slug_in: tenantSlug,
      payload,
    });
    if (error) {
      console.error("add_menu_item error:", error);
      return null;
    }
    return data ? this.mapMenuItem(data) : null;
  }

  async deleteMenuItem(tenantSlug: string, id: number): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc("delete_menu_item", {
      tenant_slug_in: tenantSlug,
      item_id: id,
    });
    if (error) {
      console.error("delete_menu_item error:", error);
      return false;
    }
    return true;
  }

  async updateMenuItem(
    tenantSlug: string,
    id: number,
    updates: Partial<MenuItem>,
  ): Promise<MenuItem | null> {
    const client = this.getClient();
    if (!client) return null;

    const payload: Record<string, unknown> = {};
    if ("inStock" in updates) payload.in_stock = updates.inStock;
    if ("name" in updates) payload.name = updates.name;
    if ("desc" in updates) payload.description = updates.desc;
    if ("costPrice" in updates) payload.cost_price = updates.costPrice ?? null;
    if ("discount" in updates) payload.discount = updates.discount ?? 0;
    if ("price" in updates) payload.price = updates.price;
    if ("img" in updates) payload.image_url = updates.img ?? null;
    if ("gallery" in updates) payload.gallery = updates.gallery ?? null;
    if ("category" in updates) payload.category = updates.category ?? null;
    if ("isVeg" in updates) payload.is_veg = updates.isVeg;
    if ("isSpicy" in updates) payload.is_spicy = updates.isSpicy;
    if ("isGlutenFree" in updates)
      payload.is_gluten_free = updates.isGlutenFree;
    if ("preparationTime" in updates)
      payload.preparation_time = updates.preparationTime ?? null;
    if ("calories" in updates) payload.calories = updates.calories ?? null;
    if ("rating" in updates) payload.rating = updates.rating ?? null;
    if ("reviewCount" in updates)
      payload.review_count = updates.reviewCount ?? null;
    if ("ingredients" in updates)
      payload.ingredients = updates.ingredients ?? null;
    if ("nutritionalInfo" in updates)
      payload.nutritional_info = updates.nutritionalInfo ?? null;
    if ("attributes" in updates)
      payload.attributes = updates.attributes ?? null;
    if ("customizationOptions" in updates)
      payload.customization_options = updates.customizationOptions ?? null;

    const { data, error } = await client.rpc("update_menu_item", {
      tenant_slug_in: tenantSlug,
      item_id: id,
      payload,
    });
    if (error) {
      console.error("update_menu_item error:", error);
      return null;
    }
    return data ? this.mapMenuItem(data) : null;
  }

  /**
   * Cheap liveness check. Does a HEAD + limit(1) on the tenants table,
   * returning only a tiny response. Used by DatabaseService to decide
   * whether the app should enter maintenance mode.
   */
  async ping(): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      const { error } = await client
        .from("star_veg_tenants")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  async toggleMenuItemStock(
    tenantSlug: string,
    id: number,
  ): Promise<MenuItem | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc("toggle_menu_item_stock", {
      tenant_slug_in: tenantSlug,
      item_id: id,
    });
    if (error) {
      console.error("toggle_menu_item_stock error:", error);
      return null;
    }
    return data ? this.mapMenuItem(data) : null;
  }

  async bulkUpdateMenuItems(
    tenantSlug: string,
    updates: { id: number; inStock: boolean }[],
  ): Promise<MenuItem[]> {
    const results: MenuItem[] = [];
    const errors: string[] = [];
    for (const update of updates) {
      const r = await this.updateMenuItem(tenantSlug, update.id, {
        inStock: update.inStock,
      });
      if (r) results.push(r);
      else errors.push(`id=${update.id}`);
    }
    if (errors.length) {
      console.error("bulkUpdateMenuItems failed for:", errors.join(", "));
    }
    return results;
  }

  async reorderMenuItems(
    tenantSlug: string,
    orderedIds: number[],
  ): Promise<MenuItem[] | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc("reorder_menu_items", {
      tenant_slug_in: tenantSlug,
      ordered_ids: orderedIds,
    });
    if (error) {
      console.error("reorder_menu_items error:", error);
      return null;
    }
    return (data || []).map((row: any) => this.mapMenuItem(row));
  }

  async initializeMenuItems(
    tenantSlug: string,
    defaultItems: MenuItem[],
  ): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    // Resolve tenant id
    const { data: tenantRow, error: tErr } = await client
      .from("star_veg_tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (tErr || !tenantRow) return;

    const { count, error } = await client
      .from(TABLES.MENU)
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantRow.id);
    if (error) throw error;
    if ((count ?? 0) > 0) return;

    console.log(
      `Seeding ${defaultItems.length} items for tenant ${tenantSlug}...`,
    );

    for (const item of defaultItems) {
      await this.addMenuItem(tenantSlug, item);
    }
  }

  // ============ STORE SETTINGS ============

  async getStoreSettings(tenantSlug: string): Promise<StoreSettings | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data: tenantRow, error: tErr } = await client
      .from("star_veg_tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (tErr || !tenantRow) return null;

    const { data, error } = await client
      .from(TABLES.STORE_SETTINGS)
      .select("*")
      .eq("tenant_id", tenantRow.id)
      .maybeSingle();

    if (error) {
      console.error("getStoreSettings error:", error);
      return null;
    }
    if (!data) return null;

    return {
      isOpen: data.is_open ?? true,
      closedMessage: data.closed_message || "",
      expectedOpenDate: data.expected_open_date || "",
      expectedOpenTime: data.expected_open_time || "",
      acceptingOrders: data.accepting_orders !== false,
      lastUpdated: data.last_updated || new Date().toISOString(),
    };
  }

  async updateStoreSettings(
    tenantSlug: string,
    settings: StoreSettings,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc("upsert_store_settings", {
      tenant_slug_in: tenantSlug,
      is_open_in: settings.isOpen,
      closed_message_in: settings.closedMessage || "",
      expected_open_date_in: settings.expectedOpenDate || null,
      expected_open_time_in: settings.expectedOpenTime || null,
      accepting_orders_in: settings.acceptingOrders ?? true,
    });
    if (error) {
      console.error("upsert_store_settings error:", error);
      return false;
    }
    return true;
  }

  // =========== CREATE TENANT ===========

  async createTenantWithOwner(params: {
    displayName: string;
    slug: string;
    ownerPhone: string;
    ownerName: string;
    ownerPassword: string;
    whatsappPhone?: string;
    storeCategory?: string;
  }): Promise<Tenant> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase not configured");

    const { data, error } = await client.rpc("create_tenant_with_owner", {
      display_name_in: params.displayName,
      slug_in: params.slug,
      owner_phone_in: params.ownerPhone,
      owner_name_in: params.ownerName,
      owner_pw_in: params.ownerPassword,
      whatsapp_phone_in: params.whatsappPhone ?? params.ownerPhone,
      store_category_in: params.storeCategory ?? "restaurant",
    });
    if (error) {
      console.error("create_tenant_with_owner error:", error);
      throw new Error(error.message || "Failed to create tenant");
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Tenant created but no row returned");

    invalidateTenantsCache();

    return {
      id: row.id,
      slug: row.slug,
      displayName: row.display_name,
      whatsappPhone: row.whatsapp_phone || undefined,
      storeCategory: row.store_category ?? "restaurant",
    };
  }

  async getAllTenants(): Promise<Tenant[]> {
  const client = this.getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('star_veg_tenants')
    .select(
      'id, slug, display_name, is_active, whatsapp_phone, reviews_enabled, plan_id, subscription_status, subscription_started_at, subscription_expires_at, created_at, store_category',
    )
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getAllTenants error:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    whatsappPhone: row.whatsapp_phone || undefined,
    isActive: row.is_active,
    reviewsEnabled: row.reviews_enabled !== false,
    planId: row.plan_id ?? 'professional',
    subscriptionStatus: row.subscription_status ?? 'active',
    subscriptionStartedAt: row.subscription_started_at ?? undefined,
    subscriptionExpiresAt: row.subscription_expires_at ?? undefined,
    createdAt: row.created_at,
    storeCategory: (row.store_category ?? 'food-beverage') as any,
  }));
}

  /**
   * Returns the tenants whose plan allows reviews (currently
   * 'professional'). Used by the platform-admin reviews surfaces so
   * basic/dynamic stores never appear there.
   *
   * Excludes the platform's own 'main' tenant.
   */
  async getReviewsEligibleTenants(): Promise<Tenant[]> {
    const list = await this.getAllTenants();
    return list.filter(
      (t) => t.slug !== "main" && (t.planId ?? "") === "professional",
    );
  }

  async setTenantActive(slug: string, isActive: boolean): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc("set_tenant_active", {
      tenant_slug_in: slug,
      is_active_in: isActive,
    });
    if (error) {
      console.error("set_tenant_active error:", error);
      return false;
    }
    invalidateTenantsCache();
    return !!data;
  }

  async updateTenant(
    slug: string,
    displayName: string,
    ownerPhone: string,
    whatsappPhone?: string,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc("update_tenant", {
      tenant_slug_in: slug,
      display_name_in: displayName,
      owner_phone_in: ownerPhone,
      whatsapp_phone_in: whatsappPhone ?? ownerPhone,
    });
    if (error) {
      console.error("update_tenant error:", error);
      throw new Error(error.message || "Failed to update tenant");
    }
    invalidateTenantsCache();
    return true;
  }

  async updateTenantInfo(
    slug: string,
    field: string,
    value: string,
  ): Promise<Tenant | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data, error } = await client.rpc("update_tenant_info", {
      tenant_slug_in: slug,
      field_in: field,
      value_in: value,
    });

    if (error) {
      console.error("update_tenant_info error:", error);
      throw new Error(error.message || "Failed to update store info");
    }

    // The cached list may hold a stale display_name or phone.
    invalidateTenantsCache();

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      displayName: row.display_name,
      whatsappPhone: row.whatsapp_phone || undefined,
      isActive: row.is_active,
      bannerUrl: row.banner_url || undefined,
      storeTagline: row.store_tagline || undefined,
      deliveryCharge: row.delivery_charge ?? 0,
      storewideDiscount: row.storewide_discount ?? 0,
      ownerPhone: row.owner_phone || undefined,
    };
  }

  async resetTenantOwnerPassword(
    slug: string,
    ownerPhone: string,
    newPassword: string,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc("reset_tenant_owner_password", {
      tenant_slug_in: slug,
      owner_phone_in: ownerPhone,
      new_password_in: newPassword,
    });
    if (error) {
      console.error("reset_tenant_owner_password error:", error);
      throw new Error(error.message || "Failed to reset password");
    }
    invalidateTenantsCache();
    return !!data;
  }

  async getTenantOwner(slug: string): Promise<{
    phone: string;
    name: string;
  } | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data, error } = await client.rpc("get_tenant_owner", {
      tenant_slug_in: slug,
    });
    if (error) {
      console.error("get_tenant_owner error:", error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? { phone: row.phone, name: row.name } : null;
  }

  async deleteTenant(slug: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    const { data, error } = await client.rpc("delete_tenant", {
      tenant_slug_in: slug,
    });
    if (error) {
      console.error("delete_tenant error:", error);
      throw new Error(error.message || "Failed to delete store");
    }
    invalidateTenantsCache();
    return !!data;
  }

  async updateTenantMessageTemplate(
    slug: string,
    template: MessageTemplate,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc("update_tenant_message_template", {
      tenant_slug_in: slug,
      template_in: template,
    });
    if (error) {
      console.error("update_tenant_message_template error:", error);
      throw new Error(error.message || "Failed to save template");
    }
    return true;
  }

  /** Platform-wide tax rate in percent (0-100). */
  async getPlatformTaxPercent(): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;
    const { data, error } = await client.rpc("get_platform_tax_percent");
    if (error) {
      console.error("get_platform_tax_percent error:", error);
      return 0;
    }
    const n = Number(data);
    return Number.isFinite(n) ? Math.max(0, Math.min(n, 100)) : 0;
  }

  async setPlatformTaxPercent(percent: number): Promise<number> {
    const client = this.getClient();
    if (!client) throw new Error("Supabase not configured");
    const normalised = Math.max(0, Math.min(Number(percent) || 0, 100));
    const { data, error } = await client.rpc("set_platform_tax_percent", {
      tax_in: normalised,
    });
    if (error) {
      console.error("set_platform_tax_percent error:", error);
      throw new Error(error.message || "Failed to save tax percent");
    }
    return Number(data) || 0;
  }

  // ============ MAPPERS ============

  private mapUser(row: any): User {
    return {
      id: row.id,
      phone: row.phone,
      name: row.name,
      password: "",
      role: row.role,
      isActive: row.is_active,
      tenantId: row.tenant_id,
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
      desc: item.description ?? "",
      costPrice: positiveNum(item.cost_price),
      price: item.price,
      discount: nonNegativeNum(item.discount) ?? 0,
      img: item.image_url,
      gallery:
        Array.isArray(item.gallery) && item.gallery.length > 0
          ? (item.gallery as string[]).filter((s) => typeof s === "string")
          : undefined,
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
          (s) => typeof s === "string" && s.trim() !== "",
        ) ?? undefined,
      nutritionalInfo: safeObject<MenuItem["nutritionalInfo"]>(
        item.nutritional_info,
      ),
      attributes: safeObject<MenuItem["attributes"]>(item.attributes),
      customizationOptions: normalizeCustomizationOptions(
        item.customization_options,
      ),
    };
  }

  async updateFormSchema(
    tenantSlug: string,
    schema: FormSchema,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc("update_tenant_form_schema", {
      tenant_slug_in: tenantSlug,
      schema_in: schema,
    });
    if (error) {
      console.error("update_tenant_form_schema error:", error);
      throw new Error(error.message || "Failed to save form schema");
    }
    return !!data;
  }

  // ============ REVIEWS ============

  /**
   * Rich dispute list for the platform-admin dashboard.
   */
  async getDisputesWithReviews(opts: {
  status?: 'pending' | 'resolved' | 'rejected' | 'all';
  tenantSlug?: string;
} = {}): Promise<
  Array<{
    disputeId: string;
    reviewId: string;
    tenantSlug: string;
    tenantName: string;
    raisedBy: string;
    reason: string;
    status: string;
    createdAt: string;
    resolvedAt?: string;
    resolvedBy?: string;
    platformSeenAt?: string;
    review: {
      itemId: number;
      itemName: string;
      itemCategory: string;
      rating: number;
      comment: string;
      customerName: string;
      createdAt: string;
    } | null;
  }>
> {
  const client = this.getClient();
  if (!client) return [];

  const status = opts.status ?? 'pending';

  // Read the platform-wide cleared-before cursor from the 'main'
  // tenant row. Anything older than this is hidden from the bell.
  let clearedBefore: string | null = null;
  try {
    const { data } = await client
      .from('star_veg_tenants')
      .select('platform_disputes_cleared_before')
      .eq('slug', 'main')
      .maybeSingle();
    clearedBefore = data?.platform_disputes_cleared_before ?? null;
  } catch {
    /* ignore — treat as no cursor */
  }

  let q = client
    .from('star_veg_review_disputes')
    .select(
      'id, review_id, tenant_slug, raised_by, reason, status, created_at, resolved_at, resolved_by, platform_seen_at',
    )
    .order('created_at', { ascending: false });

  if (clearedBefore) q = q.gt('created_at', clearedBefore);
  if (status !== 'all') q = q.eq('status', status);
  if (opts.tenantSlug) q = q.eq('tenant_slug', opts.tenantSlug);

  const { data: disputeRows, error } = await q;
  if (error) {
    console.error('getDisputesWithReviews error:', error);
    return [];
  }
  if (!disputeRows || disputeRows.length === 0) return [];

  const tenantSlugs = Array.from(
    new Set(disputeRows.map((d: any) => d.tenant_slug)),
  );

  const reviewIds = Array.from(
    new Set(
      disputeRows
        .map((d: any) => d.review_id)
        .filter(
          (id: unknown): id is string =>
            typeof id === 'string' && id.length > 0,
        ),
    ),
  );

  let reviewRows: any[] | null = null;
  if (reviewIds.length > 0) {
    const { data, error: rErr } = await client
      .from('star_veg_reviews')
      .select('id, item_id, rating, comment, customer_name, created_at')
      .in('id', reviewIds);
    if (rErr) {
      console.warn('getDisputesWithReviews review join failed:', rErr);
    } else {
      reviewRows = data ?? null;
    }
  }

  // Fetch item names/categories.
  const itemIds = Array.from(
    new Set((reviewRows || []).map((r: any) => r.item_id)),
  );
  const itemMap: Record<number, { name: string; category: string }> = {};
  if (itemIds.length > 0) {
    const { data: items } = await client
      .from('star_veg_menu_items')
      .select('id, name, category')
      .in('id', itemIds);
    (items || []).forEach((it: any) => {
      itemMap[it.id] = { name: it.name, category: it.category ?? '' };
    });
  }

  // Fetch tenant display names.
  const tenantNameMap: Record<string, string> = {};
  if (tenantSlugs.length > 0) {
    const { data: tenants } = await client
      .from('star_veg_tenants')
      .select('slug, display_name')
      .in('slug', tenantSlugs);
    (tenants || []).forEach((t: any) => {
      tenantNameMap[t.slug] = t.display_name ?? t.slug;
    });
  }

  const reviewMap: Record<string, any> = {};
  (reviewRows || []).forEach((r: any) => {
    reviewMap[r.id] = r;
  });

  return disputeRows.map((d: any) => {
    const r = reviewMap[d.review_id];
    const item = r ? itemMap[r.item_id] : undefined;
    return {
      disputeId: d.id,
      reviewId: d.review_id,
      tenantSlug: d.tenant_slug,
      tenantName: tenantNameMap[d.tenant_slug] ?? d.tenant_slug,
      raisedBy: d.raised_by ?? '',
      reason: d.reason ?? '',
      status: d.status,
      createdAt: d.created_at,
      resolvedAt: d.resolved_at ?? undefined,
      resolvedBy: d.resolved_by ?? undefined,
      platformSeenAt: d.platform_seen_at ?? undefined,
      review: r
        ? {
            itemId: r.item_id,
            itemName: item?.name ?? `Item #${r.item_id}`,
            itemCategory: item?.category ?? '',
            rating: Number(r.rating) || 0,
            comment: r.comment ?? '',
            customerName: r.customer_name ?? '',
            createdAt: r.created_at,
          }
        : null,
    };
  });
}

 /**
 * Returns resolved + rejected disputes for one tenant. Used by the
 * tenant-admin notifications bell.
 *
 * `outcome` is derived here so the UI can render a single label:
 *   - 'deleted'  → the review was removed by the platform admin
 *   - 'rejected' → the dispute was rejected but the review survives
 *
 * Respects the tenant's cleared-before cursor: rows whose resolution
 * predates the last Clear-all on that tenant's bell are hidden.
 */
async getResolvedDisputesForTenant(tenantSlug: string): Promise<
  Array<{
    disputeId: string;
    reviewId: string;
    status: 'resolved' | 'rejected';
    outcome: 'deleted' | 'rejected';
    reason: string;
    createdAt: string;
    resolvedAt?: string;
    resolvedBy?: string;
    tenantSeenAt?: string;
    review: {
      itemName: string;
      rating: number;
      comment: string;
    } | null;
  }>
> {
  const client = this.getClient();
  if (!client) return [];

  // Read the tenant's cleared-before cursor.
  let clearedBefore: string | null = null;
  try {
    const { data } = await client
      .from('star_veg_tenants')
      .select('tenant_disputes_cleared_before')
      .eq('slug', tenantSlug)
      .maybeSingle();
    clearedBefore = data?.tenant_disputes_cleared_before ?? null;
  } catch {
    /* ignore */
  }

  let q = client
    .from('star_veg_review_disputes')
    .select(
      'id, review_id, status, reason, created_at, resolved_at, resolved_by, item_id, item_name, item_rating, review_comment, review_created_at, tenant_seen_at',
    )
    .eq('tenant_slug', tenantSlug)
    .in('status', ['resolved', 'rejected'])
    .order('resolved_at', { ascending: false, nullsFirst: false });

  if (clearedBefore) {
    // Use resolved_at when present; fall back to created_at for
    // legacy rows that were resolved before the column was added.
    q = q.or(
      `resolved_at.gt.${clearedBefore},and(resolved_at.is.null,created_at.gt.${clearedBefore})`,
    );
  }

  const { data: rows, error } = await q;
  if (error) {
    console.error('getResolvedDisputesForTenant error:', error);
    return [];
  }
  if (!rows || rows.length === 0) return [];

  // Skip nulls — FK is ON DELETE SET NULL, and PostgREST rejects
  // `id=in.(null,...)` with a 400.
  const reviewIds = Array.from(
    new Set(
      rows
        .map((r: any) => r.review_id)
        .filter(
          (id: unknown): id is string =>
            typeof id === 'string' && id.length > 0,
        ),
    ),
  );

  let reviews: any[] | null = null;
  if (reviewIds.length > 0) {
    const { data } = await client
      .from('star_veg_reviews')
      .select('id, item_id, rating, comment')
      .in('id', reviewIds);
    reviews = data ?? null;
  }

  const itemIds = Array.from(
    new Set(
      (reviews || [])
        .map((r: any) => r.item_id)
        .filter((id: unknown): id is number => typeof id === 'number'),
    ),
  );
  const itemMap: Record<number, string> = {};
  if (itemIds.length > 0) {
    const { data: items } = await client
      .from('star_veg_menu_items')
      .select('id, name')
      .in('id', itemIds);
    (items || []).forEach((it: any) => {
      itemMap[it.id] = it.name;
    });
  }

  const reviewMap: Record<string, any> = {};
  (reviews || []).forEach((r: any) => {
    reviewMap[r.id] = r;
  });

  return rows.map((d: any) => {
    const r = reviewMap[d.review_id];
    const status: 'resolved' | 'rejected' =
      d.status === 'rejected' ? 'rejected' : 'resolved';

    const outcome: 'deleted' | 'rejected' =
      status === 'rejected' || r ? 'rejected' : 'deleted';

    // Prefer the live review; fall back to the snapshot for deleted ones.
    const review = r
      ? {
          itemName: itemMap[r.item_id] ?? `Item #${r.item_id}`,
          rating: Number(r.rating) || 0,
          comment: r.comment ?? '',
        }
      : d.item_name
      ? {
          itemName: d.item_name,
          rating: Number(d.item_rating) || 0,
          comment: d.review_comment ?? '',
        }
      : null;

    return {
      disputeId: d.id,
      reviewId: d.review_id,
      status,
      outcome,
      reason: d.reason ?? '',
      createdAt: d.created_at,
      resolvedAt: d.resolved_at ?? undefined,
      resolvedBy: d.resolved_by ?? undefined,
      tenantSeenAt: d.tenant_seen_at ?? undefined,
      review,
    };
  });
}

/** Platform admin marks a pending dispute notification as seen. */
async markDisputePlatformSeen(disputeId: string): Promise<boolean> {
  const client = this.getClient();
  if (!client) return false;
  const { error } = await client.rpc('mark_dispute_platform_seen', {
    dispute_id_in: disputeId,
  });
  if (error) {
    console.warn('mark_dispute_platform_seen error:', error);
    return false;
  }
  return true;
}

/** Tenant admin marks a resolved/rejected dispute notification as seen. */
async markDisputeTenantSeen(disputeId: string): Promise<boolean> {
  const client = this.getClient();
  if (!client) return false;
  const { error } = await client.rpc('mark_dispute_tenant_seen', {
    dispute_id_in: disputeId,
  });
  if (error) {
    console.warn('mark_dispute_tenant_seen error:', error);
    return false;
  }
  return true;
}

/** Platform admin clears their dispute notification list. */
async clearPlatformDisputes(): Promise<string | null> {
  const client = this.getClient();
  if (!client) return null;
  const { data, error } = await client.rpc('clear_platform_disputes');
  if (error) {
    console.warn('clear_platform_disputes error:', error);
    return null;
  }
  return typeof data === 'string' ? data : null;
}

/** Tenant admin clears their dispute notification list. */
async clearTenantDisputes(tenantSlug: string): Promise<string | null> {
  const client = this.getClient();
  if (!client) return null;
  const { data, error } = await client.rpc('clear_tenant_disputes', {
    tenant_slug_in: tenantSlug,
  });
  if (error) {
    console.warn('clear_tenant_disputes error:', error);
    return null;
  }
  return typeof data === 'string' ? data : null;
}

  /** Returns true if the given phone+password pair authenticates. */
  async verifyPassword(phone: string, password: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc("verify_password", {
      phone_in: phone,
      pw: password,
    });
    if (error) return false;
    const row = Array.isArray(data) ? data[0] : data;
    return !!row;
  }

  /** Resolve a dispute (status='resolved'). Used by the admin dashboard. */
  async resolveDispute(
    disputeId: string,
    resolvedBy: string,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client
      .from("star_veg_review_disputes")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
      })
      .eq("id", disputeId);
    if (error) {
      console.error("resolveDispute error:", error);
      return false;
    }
    return true;
  }

  async submitReview(
    tenantSlug: string,
    itemId: number,
    deviceId: string,
    deviceFingerprint: string,
    name: string,
    rating: number,
    comment: string,
  ): Promise<Review | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data, error } = await client.rpc("submit_review", {
      tenant_slug_in: tenantSlug,
      item_id_in: itemId,
      device_id_in: deviceId,
      device_fp_in: deviceFingerprint,
      name_in: name,
      rating_in: rating,
      comment_in: comment,
    });

    if (error) {
      console.error("submit_review error:", error);
      throw new Error(error.message || "Failed to submit review");
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? this.mapReviewRow(row, "", "") : null;
  }

  // ============ REVIEW DISPUTES ============

  async raiseReviewDispute(params: {
    reviewId: string;
    tenantSlug: string;
    raisedBy?: string;
    reason?: string;
  }): Promise<{ id: string } | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data: reviewRow } = await client
      .from("star_veg_reviews")
      .select("id, item_id, rating, comment, created_at")
      .eq("id", params.reviewId)
      .maybeSingle();

    let itemName: string | null = null;
    if (reviewRow?.item_id) {
      const { data: itemRow } = await client
        .from("star_veg_menu_items")
        .select("name")
        .eq("id", reviewRow.item_id)
        .maybeSingle();
      itemName = itemRow?.name ?? null;
    }

    const { data: tenantRow } = await client
      .from("star_veg_tenants")
      .select("id")
      .eq("slug", params.tenantSlug)
      .maybeSingle();
    if (!tenantRow) return null;

    const { data: existing } = await client
      .from("star_veg_review_disputes")
      .select("id")
      .eq("review_id", params.reviewId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) return { id: existing.id };

    const { data, error } = await client
      .from("star_veg_review_disputes")
      .insert({
        review_id: params.reviewId,
        tenant_id: tenantRow.id,
        tenant_slug: params.tenantSlug,
        raised_by: params.raisedBy ?? "",
        reason: params.reason ?? "",
        status: "pending",
        item_id: reviewRow?.item_id ?? null,
        item_name: itemName,
        item_rating: reviewRow?.rating ?? null,
        review_comment: reviewRow?.comment ?? null,
        review_created_at: reviewRow?.created_at ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("raiseReviewDispute error:", error);
      return null;
    }
    return { id: data.id };
  }

  /** Returns review IDs that have a pending dispute for this tenant. */
  async getPendingDisputeReviewIds(tenantSlug: string): Promise<Set<string>> {
    const client = this.getClient();
    if (!client) return new Set();

    const { data, error } = await client
      .from("star_veg_review_disputes")
      .select("review_id")
      .eq("tenant_slug", tenantSlug)
      .eq("status", "pending");

    if (error) {
      console.error("getPendingDisputeReviewIds error:", error);
      return new Set();
    }
    return new Set((data || []).map((r: any) => r.review_id));
  }

  /**
   * Platform-admin side: returns a map of reviewId → disputeId for every
   * pending dispute on a tenant (or every tenant when slug is omitted).
   */
  async getPendingDisputesByReview(
    tenantSlug?: string,
  ): Promise<Record<string, string>> {
    const client = this.getClient();
    if (!client) return {};

    let q = client
      .from("star_veg_review_disputes")
      .select("id, review_id")
      .eq("status", "pending");

    if (tenantSlug) q = q.eq("tenant_slug", tenantSlug);

    const { data, error } = await q;
    if (error) {
      console.error("getPendingDisputesByReview error:", error);
      return {};
    }

    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => {
      map[r.review_id] = r.id;
    });
    return map;
  }

  async deleteOwnReview(
    tenantSlug: string,
    itemId: number,
    deviceId: string,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc("delete_own_review", {
      tenant_slug_in: tenantSlug,
      item_id_in: itemId,
      device_id_in: deviceId,
    });
    if (error) {
      console.error("delete_own_review error:", error);
      return false;
    }
    menuService.refresh().catch(() => {});
    return !!data;
  }

  async getItemReviews(itemId: number): Promise<Review[]> {
    const client = this.getClient();
    if (!client) return [];
    const { data, error } = await client.rpc("get_item_reviews", {
      item_id_in: itemId,
    });
    if (error) {
      console.error("get_item_reviews error:", error);
      return [];
    }
    return (data || []).map((r: any) => this.mapReviewRow(r, "", ""));
  }

  async getTenantReviewsPaged(
    tenantSlug: string,
    filter: ReviewFilter,
    limit = 16,
    offset = 0,
  ): Promise<Review[]> {
    const client = this.getClient();
    if (!client) return [];
    const { data, error } = await client.rpc("get_tenant_reviews_paged", {
      tenant_slug_in: tenantSlug,
      filter_in: filter,
      limit_in: limit,
      offset_in: offset,
    });
    if (error) {
      console.error("get_tenant_reviews_paged error:", error);
      return [];
    }
    return (data || []).map((r: any) =>
      this.mapReviewRow(r, r.item_name, r.item_category),
    );
  }

  async adminDeleteReview(reviewId: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc("admin_delete_review", {
      review_id_in: reviewId,
    });
    if (error) {
      console.error("admin_delete_review error:", error);
      return false;
    }
    return !!data;
  }

  // ============ REVIEWS TOGGLE ============

  async setGlobalReviewsEnabled(enabled: boolean): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc("set_global_reviews_enabled", {
      enabled_in: enabled,
    });
    if (error) {
      console.error("set_global_reviews_enabled error:", error);
      throw new Error(error.message || "Failed to update global setting");
    }
    return !!data;
  }

  async setTenantReviewsEnabled(
    slug: string,
    enabled: boolean,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc("set_tenant_reviews_enabled", {
      tenant_slug_in: slug,
      enabled_in: enabled,
    });
    if (error) {
      console.error("set_tenant_reviews_enabled error:", error);
      throw new Error(error.message || "Failed to update setting");
    }
    invalidateTenantsCache();
    return !!data;
  }

  async isGlobalReviewsEnabled(): Promise<boolean> {
    const client = this.getClient();
    if (!client) return true;
    const { data, error } = await client
      .from("star_veg_tenants")
      .select("reviews_enabled")
      .eq("slug", "main")
      .maybeSingle();
    if (error || !data) return true;
    return data.reviews_enabled !== false;
  }

  private mapReviewRow(
    row: any,
    itemName: string,
    itemCategory: string,
  ): Review {
    return {
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name ?? itemName,
      itemCategory: row.item_category ?? itemCategory,
      rating: Number(row.rating) || 0,
      comment: row.comment ?? "",
      customerName: row.customer_name ?? "",
      deviceId: row.device_id ?? "",
      deviceFingerprint: row.device_fingerprint ?? "",
      createdAt: row.created_at ?? new Date().toISOString(),
    };
  }

  // ============ DINE-IN ============

  /** Find or create a table by label. Returns the table row. */
  async findOrCreateDineinTable(
    tenantSlug: string,
    label: string,
    labelKind: "number" | "name",
    deviceId?: string,
  ): Promise<DineinTable | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data: tenantRow } = await client
      .from("star_veg_tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();
    if (!tenantRow) return null;

    const normalized = label.trim();
    if (!normalized) return null;

    const { data: existing } = await client
      .from("star_veg_dinein_tables")
      .select("*")
      .eq("tenant_id", tenantRow.id)
      .eq("label", normalized)
      .maybeSingle();

    if (existing) {
      if (deviceId && !(existing.device_ids || []).includes(deviceId)) {
        const merged = [...(existing.device_ids || []), deviceId];
        await client
          .from("star_veg_dinein_tables")
          .update({ device_ids: merged, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      return this.mapDineinTable(existing);
    }

    const { data, error } = await client
      .from("star_veg_dinein_tables")
      .insert({
        tenant_id: tenantRow.id,
        tenant_slug: tenantSlug,
        label: normalized,
        label_kind: labelKind,
        device_ids: deviceId ? [deviceId] : [],
      })
      .select()
      .single();

    if (error) {
      console.error("findOrCreateDineinTable error:", error);
      return null;
    }
    return this.mapDineinTable(data);
  }

  /** Create a new order for a table. Packing is always 0 for dine-in. */
  async createDineinOrder(params: {
    tenantSlug: string;
    tableId: string;
    tableLabel: string;
    tableLabelKind: "number" | "name";
    customerName: string;
    deviceId?: string;
    items: DineinOrderItem[];
    subtotal: number;
    gstPercent: number;
    gstAmount: number;
    storewideDiscount: number;
    totalAmount: number;
  }): Promise<DineinOrder | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data: tenantRow } = await client
      .from("star_veg_tenants")
      .select("id")
      .eq("slug", params.tenantSlug)
      .maybeSingle();
    if (!tenantRow) return null;

    // Recompute totals using packing = 0 (dine-in never carries packing).
    const PACKING = 0;
    const recomputedTotal =
      params.subtotal + params.gstAmount + PACKING - params.storewideDiscount;

    const { data, error } = await client
      .from("star_veg_dinein_orders")
      .insert({
        tenant_id: tenantRow.id,
        tenant_slug: params.tenantSlug,
        table_id: params.tableId,
        table_label: params.tableLabel,
        table_label_kind: params.tableLabelKind,
        customer_name: params.customerName,
        device_id: params.deviceId ?? null,
        items: params.items,
        subtotal: params.subtotal,
        gst_percent: params.gstPercent,
        gst_amount: params.gstAmount,
        packing_charge: PACKING,
        storewide_discount: params.storewideDiscount,
        total_amount: recomputedTotal,
        status: "placed",
      })
      .select()
      .single();

    if (error) {
      console.error("createDineinOrder error:", error);
      return null;
    }

    // Log the event for the tenant feed.
    await client.from("star_veg_dinein_events").insert({
      tenant_id: tenantRow.id,
      tenant_slug: params.tenantSlug,
      order_id: data.id,
      table_label: params.tableLabel,
      kind: "order",
      payload: {
        customerName: params.customerName,
        itemCount: params.items.length,
        total: recomputedTotal,
      },
    });

    return this.mapDineinOrder(data);
  }

  /** Append items to an existing open order for the same table. */
  async appendDineinOrderItems(
    orderId: string,
    newItems: DineinOrderItem[],
  ): Promise<DineinOrder | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data: order, error: getErr } = await client
      .from("star_veg_dinein_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (getErr || !order) return null;
    if (order.status === "paid" || order.status === "cancelled") return null;

    const merged = [...(order.items as DineinOrderItem[]), ...newItems];

    // Recompute totals. Packing is always 0 for dine-in.
    const PACKING = 0;
    const subtotal = merged.reduce((s, i) => s + i.lineTotal, 0);
    const gstAmount = Math.round(subtotal * (Number(order.gst_percent) / 100));
    const totalAmount =
      subtotal + gstAmount + PACKING - Number(order.storewide_discount);

    const { data, error } = await client
      .from("star_veg_dinein_orders")
      .update({
        items: merged,
        subtotal,
        gst_amount: gstAmount,
        packing_charge: PACKING,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) return null;
    return this.mapDineinOrder(data);
  }

  async getDineinOrders(
    tenantSlug: string,
    statuses: DineinOrder["status"][] = [
      "placed",
      "accepted",
      "preparing",
      "served",
      "bill_requested",
    ],
  ): Promise<DineinOrder[]> {
    const client = this.getClient();
    if (!client) return [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await client
      .from("star_veg_dinein_orders")
      .select("*")
      .eq("tenant_slug", tenantSlug)
      .gte("created_at", startOfToday.toISOString())
      .in("status", statuses)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("getDineinOrders error:", error);
      return [];
    }
    return (data || []).map((row) => this.mapDineinOrder(row));
  }

  async getDineinEventsSince(
  tenantSlug: string,
  sinceIso: string | null,
  limit = 20,
): Promise<DineinEvent[]> {
  const client = this.getClient();
  if (!client) return [];

  // 1. Read the tenant's cleared-before cursor. Cheap single-row read.
  let clearedBefore: string | null = null;
  try {
    const { data } = await client
      .from('star_veg_tenants')
      .select('dinein_events_cleared_before')
      .eq('slug', tenantSlug)
      .maybeSingle();
    clearedBefore = data?.dinein_events_cleared_before ?? null;
  } catch {
    /* ignore — treat as no cursor */
  }

  // 2. Fetch the events.
  let q = client
    .from('star_veg_dinein_events')
    .select('id, order_id, table_label, kind, payload, created_at, read_at')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (sinceIso) q = q.gt('created_at', sinceIso);
  if (clearedBefore) q = q.gt('created_at', clearedBefore);

  const { data, error } = await q;
  if (error) return [];

  return (data || []).map((row: any) => ({
    id: row.id,
    orderId: row.order_id,
    tableLabel: row.table_label,
    kind: row.kind,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    readAt: row.read_at ?? null,
  }));
}

  /**
   * Lightweight query for fields that affect the customer-side layout
   * during a live session. Called by the tenant runtime poll every ~10s.
   * Returns null on error or when the tenant doesn't exist.
   */
  async getTenantRuntimeFlags(slug: string): Promise<{
    isActive: boolean;
    dineinEnabled: boolean;
    subscriptionStatus: string;
    planId: string;
    reviewsEnabled: boolean;
  } | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data, error } = await client
      .from("star_veg_tenants")
      .select(
        "is_active, dinein_enabled, subscription_status, plan_id, reviews_enabled",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;

    return {
      isActive: data.is_active !== false,
      dineinEnabled: data.dinein_enabled === true,
      subscriptionStatus: data.subscription_status ?? "active",
      planId: data.plan_id ?? "professional",
      reviewsEnabled: data.reviews_enabled !== false,
    };
  }

  /**
   * Minimal read for the customer banner. Only two columns, served
   * from the primary-key index — cheap on the wire and cheap in the
   * Postgres log. The caller compares `updatedAt` against the last
   * value it saw and only fetches the full row when it changed.
   */
  async getDineinOrderSummary(
    orderId: string,
  ): Promise<{ status: string; updatedAt: string } | null> {
    const client = this.getClient();
    if (!client) return null;

    const { data, error } = await client
      .from("star_veg_dinein_orders")
      .select("status, updated_at")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      status: data.status,
      updatedAt: data.updated_at,
    };
  }

  async getDineinOrdersForDevice(
    tenantSlug: string,
    deviceId: string,
    statuses: DineinOrder["status"][] = [
      "placed",
      "accepted",
      "preparing",
      "served",
      "bill_requested",
    ],
  ): Promise<DineinOrder[]> {
    const client = this.getClient();
    if (!client) return [];
    const { data, error } = await client
      .from("star_veg_dinein_orders")
      .select("*")
      .eq("tenant_slug", tenantSlug)
      .eq("device_id", deviceId)
      .in("status", statuses)
      .order("updated_at", { ascending: false });
    if (error) {
      console.warn("getDineinOrdersForDevice error:", error);
      return [];
    }
    return (data || []).map((row) => this.mapDineinOrder(row));
  }

  /** Set per-item served flags for one dine-in order. Returns the updated order. */
  async setDineinOrderItemsServed(
    orderId: string,
    itemIndexes: number[],
    served: boolean,
  ): Promise<DineinOrder | null> {
    const client = this.getClient();
    if (!client) return null;
    if (!Array.isArray(itemIndexes) || itemIndexes.length === 0) {
      return this.getDineinOrderById(orderId);
    }

    const { data, error } = await client.rpc("set_dinein_order_items_served", {
      order_id_in: orderId,
      item_indexes_in: itemIndexes,
      served_in: served,
    });

    if (error) {
      console.error("set_dinein_order_items_served error:", error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? this.mapDineinOrder(row) : null;
  }

  /** Move an order through its lifecycle. */
  async setDineinOrderStatus(
    orderId: string,
    status: "accepted" | "preparing" | "served",
  ): Promise<DineinOrder | null> {
    const client = this.getClient();
    if (!client) return null;

    const nowIso = new Date().toISOString();
    const patch: Record<string, any> = {
      status,
      updated_at: nowIso,
    };
    if (status === "accepted") patch.accepted_at = nowIso;
    if (status === "preparing") patch.preparing_at = nowIso;
    if (status === "served") patch.served_at = nowIso;

    const { error: updateErr } = await client
      .from("star_veg_dinein_orders")
      .update(patch)
      .eq("id", orderId);

    if (updateErr) {
      console.error("setDineinOrderStatus update error:", updateErr);
      return null;
    }

    const { data, error: fetchErr } = await client
      .from("star_veg_dinein_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr || !data) {
      console.error("setDineinOrderStatus fetch error:", fetchErr);
      return null;
    }

    return this.mapDineinOrder(data);
  }

  /** Cancel (reject) an order. */
  async cancelDineinOrder(
    orderId: string,
    reason = "",
  ): Promise<DineinOrder | null> {
    const client = this.getClient();
    if (!client) return null;

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await client
      .from("star_veg_dinein_orders")
      .update({
        status: "cancelled",
        updated_at: nowIso,
      })
      .eq("id", orderId);

    if (updateErr) {
      console.error("cancelDineinOrder update error:", updateErr);
      return null;
    }

    const { data, error: fetchErr } = await client
      .from("star_veg_dinein_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr || !data) {
      console.error("cancelDineinOrder fetch error:", fetchErr);
      return null;
    }

    return this.mapDineinOrder(data);
  }

  /** Fetch one order by id. Used by the customer status watcher. */
  async getDineinOrderById(orderId: string): Promise<DineinOrder | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from("star_veg_dinein_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !data) return null;
    return this.mapDineinOrder(data);
  }

  /**
   * Fetch the most recent open order this device placed at this tenant.
   *
   * The select is deliberately trimmed — the caller only needs the
   * id / table identity / status, not the full items JSONB. Cuts
   * egress significantly versus `select('*')`.
   */
  async getLatestDineinOrderForDevice(
    tenantSlug: string,
    deviceId: string,
  ): Promise<DineinOrder | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from("star_veg_dinein_orders")
      .select(
        "id, order_no, tenant_slug, table_id, table_label, table_label_kind, status, device_id, created_at, updated_at",
      )
      .eq("tenant_slug", tenantSlug)
      .eq("device_id", deviceId)
      .not("status", "eq", "paid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return this.mapDineinOrder(data);
  }

  /**
   * Return paid dine-in orders for a tenant between two ISO timestamps.
   * Ordered newest first.
   *
   * The select is trimmed to what the history UI actually renders —
   * no `items`, no unused columns. For a busy tenant this is the
   * single largest egress win in the service.
   */
  async getDineinOrderHistory(
    tenantSlug: string,
    fromIso: string | null,
    toIso?: string | null,
  ): Promise<DineinOrder[]> {
    const client = this.getClient();
    if (!client) return [];

    let q = client
      .from("star_veg_dinein_orders")
      .select(
        "id, order_no, tenant_slug, table_id, table_label, table_label_kind, status, device_id, subtotal, gst_percent, gst_amount, packing_charge, storewide_discount, total_amount, payment_ref, paid_at, created_at, updated_at, closed_at, session_closed",
      )
      .eq("tenant_slug", tenantSlug)
      .eq("status", "paid")
      .order("created_at", { ascending: false });

    if (fromIso) q = q.gte("created_at", fromIso);
    if (toIso) q = q.lte("created_at", toIso);

    const { data, error } = await q;
    if (error) {
      console.error("getDineinOrderHistory error:", error);
      return [];
    }
    return (data || []).map((row) => this.mapDineinOrder(row));
  }

  /**
   * Customer requests the bill for a single order. Records the
   * customer's intent (`pay_online_requested`) but does NOT enable
   * online payment — the admin must approve via `setDineinPayOnline`.
   */
  async requestDineinBill(
    orderId: string,
    payOnlineRequested: boolean,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc("request_dinein_bill", {
      order_id_in: orderId,
      pay_online_requested_in: payOnlineRequested,
    });
    if (error) {
      console.error("request_dinein_bill error:", error);
      return false;
    }
    return true;
  }

  async markDineinOrderPaid(
    orderId: string,
    paymentRef: string,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;

    const { error } = await client
      .from("star_veg_dinein_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_ref: paymentRef,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return !error;
  }

  /**
 * Customer says "I've paid". Records the claim but does NOT change
 * the order status — the admin verifies and calls `confirmDineinPayment`.
 */
async claimDineinPayment(orderId: string): Promise<DineinOrder | null> {
  const client = this.getClient();
  if (!client) return null;
  const { data, error } = await client.rpc('claim_dinein_payment', {
    order_id_in: orderId,
  });
  if (error) {
    console.error('claim_dinein_payment error:', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ? this.mapDineinOrder(row) : null;
}

/**
 * Admin confirms the customer's payment. Flips the order to `paid`
 * and clears the claim flag.
 */
async confirmDineinPayment(
  orderId: string,
  paymentRef: string,
): Promise<DineinOrder | null> {
  const client = this.getClient();
  if (!client) return null;
  const { data, error } = await client.rpc('confirm_dinein_payment', {
    order_id_in: orderId,
    payment_ref_in: paymentRef,
  });
  if (error) {
    console.error('confirm_dinein_payment error:', error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row ? this.mapDineinOrder(row) : null;
}

  /**
   * Customer ends their session. Order stays in the DB but drops out
   * of the tenant's Served tab.
   */
  async endDineinOrder(orderId: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc("end_dinein_order", {
      order_id_in: orderId,
    });
    if (error) {
      console.error("end_dinein_order error:", error);
      return false;
    }
    return true;
  }

  /** Admin toggles the pay link on a bill-requested order. */
  async setDineinPayOnline(
    orderId: string,
    payOnline: boolean,
  ): Promise<DineinOrder | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc("set_dinein_pay_online", {
      order_id_in: orderId,
      pay_online_in: payOnline,
    });
    if (error) {
      console.error("set_dinein_pay_online error:", error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? this.mapDineinOrder(row) : null;
  }

  /** Customer backs out of online payment — keeps the bill requested. */
  async setDineinSettleOffline(orderId: string): Promise<DineinOrder | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc("set_dinein_settle_offline", {
      order_id_in: orderId,
    });
    if (error) {
      console.error("set_dinein_settle_offline error:", error);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? this.mapDineinOrder(row) : null;
  }

  /** Recent dine-in events for the header notification icon. */
  async getDineinEvents(tenantSlug: string, limit = 30): Promise<DineinEvent[]> {
  const client = this.getClient();
  if (!client) return [];

  let clearedBefore: string | null = null;
  try {
    const { data } = await client
      .from('star_veg_tenants')
      .select('dinein_events_cleared_before')
      .eq('slug', tenantSlug)
      .maybeSingle();
    clearedBefore = data?.dinein_events_cleared_before ?? null;
  } catch {
    /* ignore */
  }

  let q = client
    .from('star_veg_dinein_events')
    .select('id, order_id, table_label, kind, payload, created_at, read_at')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (clearedBefore) q = q.gt('created_at', clearedBefore);

  const { data, error } = await q;
  if (error) return [];
  return (data || []).map((row: any) => ({
    id: row.id,
    orderId: row.order_id,
    tableLabel: row.table_label,
    kind: row.kind,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    readAt: row.read_at ?? null,
  }));
}

  /** Mark a single dine-in event as read. Non-blocking. */
  async markDineinEventRead(eventId: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc("mark_dinein_event_read", {
      event_id_in: eventId,
    });
    if (error) {
      console.warn("mark_dinein_event_read error:", error);
      return false;
    }
    return true;
  }

  /** Mark every unread event for a tenant as read. */
  async markAllDineinEventsRead(tenantSlug: string): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;
    const { data, error } = await client.rpc("mark_all_dinein_events_read", {
      tenant_slug_in: tenantSlug,
    });
    if (error) {
      console.warn("mark_all_dinein_events_read error:", error);
      return 0;
    }
    return Number(data) || 0;
  }

  /**
 * Advance the tenant's "cleared before" cursor to NOW. Hides every
 * event up to this moment from the drawer, on every device. Does
 * NOT change individual `read_at` values.
 */
async clearDineinEvents(tenantSlug: string): Promise<string | null> {
  const client = this.getClient();
  if (!client) return null;
  const { data, error } = await client.rpc('clear_dinein_events', {
    tenant_slug_in: tenantSlug,
  });
  if (error) {
    console.warn('clear_dinein_events error:', error);
    return null;
  }
  return typeof data === 'string' ? data : null;
}

  private mapDineinTable(row: any): DineinTable {
    return {
      id: row.id,
      tenantSlug: row.tenant_slug,
      label: row.label,
      labelKind: row.label_kind,
      deviceIds: row.device_ids ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapDineinOrder(row: any): DineinOrder {
    return {
      id: row.id,
      orderNo: row.order_no ?? "",
      tenantSlug: row.tenant_slug,
      tableId: row.table_id,
      tableLabel: row.table_label,
      tableLabelKind: row.table_label_kind,
      customerName: row.customer_name ?? "",
      deviceId: row.device_id,
      items: Array.isArray(row.items)
        ? row.items.map((it: any) => ({
            ...it,
            served: it?.served === true,
          }))
        : [],
      subtotal: Number(row.subtotal) || 0,
      gstPercent: Number(row.gst_percent) || 0,
      gstAmount: Number(row.gst_amount) || 0,
      packingCharge: Number(row.packing_charge) || 0,
      storewideDiscount: Number(row.storewide_discount) || 0,
      totalAmount: Number(row.total_amount) || 0,
      status: row.status,
      billRequested: !!row.bill_requested,
      billRequestedAt: row.bill_requested_at ?? undefined,
      payOnline: !!row.pay_online,
      payOnlineRequested: row.pay_online_requested === true,
      sessionClosed: row.session_closed === true,
      closedAt: row.closed_at ?? undefined,
      paidAt: row.paid_at ?? undefined,
      paymentRef: row.payment_ref ?? undefined,
      acceptedAt: row.accepted_at ?? undefined,
      preparingAt: row.preparing_at ?? undefined,
      servedAt: row.served_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      settledOfflineAfterFailure: row.settled_offline_after_failure === true,
      customerPaidClaimed: row.customer_paid_claimed === true,
customerPaidClaimedAt: row.customer_paid_claimed_at ?? undefined,
    };
  }
}

export const supabaseService = SupabaseService.getInstance();
