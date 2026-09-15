// services/auth.service.ts
import { User, AuthState } from '../types';
import { isSupabaseConfigured } from '../config/env';
import { supabase } from './supabase.client';
import { credentialCache } from './credentialCache';

// ---- Session storage keys ----
const SESSION_PREFIX = 'restaurant_auth_session';
const PLATFORM_KEY = `${SESSION_PREFIX}::platform`;
const SESSION_EVENT = 'auth:changed';

/** Key used for the currently active tab's tenant. */
const keyForTenant = (slug: string | null): string =>
  slug ? `${SESSION_PREFIX}::${slug}` : PLATFORM_KEY;

interface RawAuthRow {
  id: string;
  phone: string;
  name: string;
  role: 'admin' | 'user';
  is_active: boolean;
  tenant_id: string;
  tenant_slug: string;
  created_at: string;
  last_login: string | null;
}

class AuthService {
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };

  private listeners: ((state: AuthState) => void)[] = [];

  /** Which tenant slot this tab is currently bound to. */
  private currentSlug: string | null = null;

  constructor() {
    this.currentSlug = this.readSlugFromUrl();
    this.loadSessionFromCache(this.currentSlug);
  }

  // =========================================================
  // URL / SLUG HELPERS
  // =========================================================

  private readSlugFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const qp = params.get('t');
      return qp ? qp.trim() : null;
    } catch {
      return null;
    }
  }

  /**
   * Re-bind the service to a different tenant.
   * Called by TenantContext when the URL slug resolves.
   * Loads that tenant's session (if any) into the active auth state.
   */
  bindTenant(slug: string | null): void {
    if (this.currentSlug === slug) return;
    this.currentSlug = slug;
    this.loadSessionFromCache(slug);
  }

  // =========================================================
  // SESSION LIFECYCLE
  // =========================================================

  private loadSessionFromCache(slug: string | null): void {
    try {
      const raw = localStorage.getItem(keyForTenant(slug));
      if (raw) {
        const user: User = JSON.parse(raw);
        this.authState = { user, isAuthenticated: true, isLoading: false };
      } else {
        this.authState = {
          user: null,
          isAuthenticated: false,
          isLoading: false,
        };
      }
    } catch {
      this.authState = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    }
    this.notifyListeners();
  }

  private saveSession(slug: string | null, user: User): void {
    try {
      localStorage.setItem(keyForTenant(slug), JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }

  private clearSession(slug: string | null): void {
    try {
      localStorage.removeItem(keyForTenant(slug));
    } catch {
      /* ignore */
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l({ ...this.authState }));
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener({ ...this.authState });

    // Cross-tab sync — react to logout/login in other tabs
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      const targetKey = keyForTenant(this.currentSlug);
      if (e.key === targetKey) {
        this.loadSessionFromCache(this.currentSlug);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  getState(): AuthState {
    return { ...this.authState };
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async login(
    phone: string,
    password: string,
    currentTenantSlug: string | null,
  ): Promise<{ success: boolean; error?: string }> {
    if (!phone || !password) {
      return {
        success: false,
        error: 'Phone number and password are required',
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        error: 'Service temporarily unavailable. Please try again.',
      };
    }

    // Always log into the slot of the URL's tenant
    const targetSlug = currentTenantSlug;

    const { data, error } = await supabase.rpc('verify_password', {
      phone_in: phone,
      pw: password,
    });

    if (error) {
      console.error('verify_password error:', error);
      return { success: false, error: 'Invalid phone number or password' };
    }

    const row: RawAuthRow | undefined = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { success: false, error: 'Invalid phone number or password' };
    }
    if (!row.is_active) {
      return {
        success: false,
        error: 'Account is deactivated. Please contact admin.',
      };
    }

    // ---- Tenant scope validation ----
    //  - Admin (role='admin') can log in anywhere.
    //  - Staff must log in at their own tenant URL.
    if (row.role !== 'admin') {
      if (!targetSlug) {
        return {
          success: false,
          error: 'Staff accounts must log in from their store URL.',
        };
      }
      if (row.tenant_slug !== targetSlug) {
        return {
          success: false,
          error: 'This account belongs to a different store.',
        };
      }
    }

    const user: User = {
      id: row.id,
      phone: row.phone,
      name: row.name,
      password: '',
      role: row.role,
      isActive: row.is_active,
      tenantId: row.tenant_id,
      tenantSlug: row.tenant_slug,
      createdAt: row.created_at,
      lastLogin: row.last_login ?? undefined,
    };

    try {
      await supabase.rpc('touch_last_login', { user_id: row.id });
    } catch {
      /* ignore */
    }

    // Persist into the slot matching the URL's tenant
    this.saveSession(targetSlug, user);

    // If this tab is currently bound to the targetSlug, update live state
    if (this.currentSlug === targetSlug) {
      this.currentSlug = targetSlug;  // keep service in sync
      this.authState = {
        user,
        isAuthenticated: true,
        isLoading: false,
      };
      this.notifyListeners();
    }

    return { success: true };
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  /** Logs out of the CURRENT tenant slot only. */
  logout(): void {
    const slug = this.currentSlug;

    // Clear session-scoped credentials for this tenant only
    if (slug) {
      credentialCache.remove(slug);
    }

    this.clearSession(slug);

    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
    this.notifyListeners();
  }

  /** Explicit "log out everywhere" — used by platform admins if needed. */
  logoutAll(): void {
    // Wipe every tenant slot
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(SESSION_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    credentialCache.clearAll();
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
    this.notifyListeners();
  }

  // =========================================================
  // TENANT SCOPE ENFORCEMENT
  // =========================================================

  isUserValidForTenant(currentTenantSlug: string | null): boolean {
    const user = this.authState.user;
    if (!user) return true;

    // Admins roam freely
    if (user.role === 'admin') return true;

    // Staff: must be at their own tenant URL
    if (!currentTenantSlug) return false;
    return user.tenantSlug === currentTenantSlug;
  }

  enforceTenantScope(currentTenantSlug: string | null): void {
    // First re-bind the service to this URL's tenant
    this.bindTenant(currentTenantSlug);

    // Now check if the loaded session is valid for this URL
    if (!this.isUserValidForTenant(currentTenantSlug)) {
      try {
        sessionStorage.setItem(
          'logged_out_reason',
          'You were signed out because this URL belongs to a different store.',
        );
      } catch {
        /* ignore */
      }
      this.logout();
    }
  }

  // =========================================================
  // PROFILE / GETTERS (unchanged)
  // =========================================================

  async updateUserProfile(
    updates: Partial<User>,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.authState.user) {
      return { success: false, error: 'Not authenticated' };
    }
    const updatedUser = { ...this.authState.user, ...updates };
    this.authState.user = updatedUser;
    this.saveSession(this.currentSlug, updatedUser);
    this.notifyListeners();
    return { success: true };
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  getCurrentUser(): User | null {
    return this.authState.user;
  }

  isAdmin(): boolean {
    return this.authState.user?.role === 'admin';
  }
}

export const authService = new AuthService();