// services/auth.service.ts
import { User, AuthState } from '../types';
import { isSupabaseConfigured } from '../config/env';
import { supabase } from './supabase.client';
import { credentialCache } from './credentialCache';

// =========================================================
// Session storage keys
// =========================================================
const SESSION_PREFIX = 'restaurant_auth_session';
const PLATFORM_KEY = `${SESSION_PREFIX}::platform`;
const SMART_ADMIN_KEY = `${SESSION_PREFIX}::smart_admin`;
const ADMIN_SUFFIX = '_admin';

/**
 * Session key resolution:
 *   - No slug + no smart-admin  > ::platform
 *   - No slug + smart-admin     > ::smart_admin
 *   - Slug + customer view      > ::<slug>
 *   - Slug + admin view         > ::<slug>_admin
 */
const keyFor = (
  slug: string | null,
  isAdminView: boolean,
  isSmartAdminHost: boolean,
): string => {
  if (!slug) return isSmartAdminHost ? SMART_ADMIN_KEY : PLATFORM_KEY;
  return `${SESSION_PREFIX}::${slug}${isAdminView ? ADMIN_SUFFIX : ''}`;
};

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

interface UrlContext {
  slug: string | null;
  isAdminView: boolean;
  isSmartAdminHost: boolean;
}

class AuthService {
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };

  private listeners: ((state: AuthState) => void)[] = [];

  private currentSlug: string | null = null;
  private currentIsAdminView = false;
  private currentIsSmartAdminHost = false;

  constructor() {
    const ctx = this.readContextFromUrl();
    this.currentSlug = ctx.slug;
    this.currentIsAdminView = ctx.isAdminView;
    this.currentIsSmartAdminHost = ctx.isSmartAdminHost;
    this.loadSessionFromCache(
      ctx.slug,
      ctx.isAdminView,
      ctx.isSmartAdminHost,
    );
  }

  // =========================================================
  // URL PARSING
  // =========================================================

  private readContextFromUrl(): UrlContext {
    if (typeof window === 'undefined') {
      return { slug: null, isAdminView: false, isSmartAdminHost: false };
    }
    try {
      const url = new URL(window.location.href);
      const isSmartAdminHost = url.searchParams.has('_smart-admin');

      const qp = url.searchParams.get('t');
      if (!qp) {
        return { slug: null, isAdminView: false, isSmartAdminHost };
      }

      const raw = qp.trim();
      const isAdminView = raw.endsWith(ADMIN_SUFFIX);
      const slug = isAdminView ? raw.slice(0, -ADMIN_SUFFIX.length) : raw;

      if (!slug) {
        return { slug: null, isAdminView: false, isSmartAdminHost };
      }
      return { slug, isAdminView, isSmartAdminHost };
    } catch {
      return { slug: null, isAdminView: false, isSmartAdminHost: false };
    }
  }

  bindTenant(
    slug: string | null,
    isAdminView = false,
    isSmartAdminHost = false,
  ): void {
    if (
      this.currentSlug === slug &&
      this.currentIsAdminView === isAdminView &&
      this.currentIsSmartAdminHost === isSmartAdminHost
    ) {
      return;
    }
    this.currentSlug = slug;
    this.currentIsAdminView = isAdminView;
    this.currentIsSmartAdminHost = isSmartAdminHost;
    this.loadSessionFromCache(slug, isAdminView, isSmartAdminHost);
  }

  // =========================================================
  // SESSION LIFECYCLE
  // =========================================================

  private loadSessionFromCache(
    slug: string | null,
    isAdminView: boolean,
    isSmartAdminHost: boolean,
  ): void {
    try {
      const raw = localStorage.getItem(
        keyFor(slug, isAdminView, isSmartAdminHost),
      );
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

  private saveSession(
    slug: string | null,
    isAdminView: boolean,
    user: User,
    isSmartAdminHost: boolean,
  ): void {
    try {
      localStorage.setItem(
        keyFor(slug, isAdminView, isSmartAdminHost),
        JSON.stringify(user),
      );
    } catch {
      /* ignore */
    }
  }

  private clearSession(
    slug: string | null,
    isAdminView: boolean,
    isSmartAdminHost: boolean,
  ): void {
    try {
      localStorage.removeItem(
        keyFor(slug, isAdminView, isSmartAdminHost),
      );
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

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      const targetKey = keyFor(
        this.currentSlug,
        this.currentIsAdminView,
        this.currentIsSmartAdminHost,
      );
      if (e.key === targetKey) {
        this.loadSessionFromCache(
          this.currentSlug,
          this.currentIsAdminView,
          this.currentIsSmartAdminHost,
        );
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
    isAdminView = false,
    isSmartAdminHost = false,
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

    // Tenant scope validation
    if (row.role !== 'admin') {
      if (!currentTenantSlug) {
        return {
          success: false,
          error: 'Staff accounts must log in from their store URL.',
        };
      }
      if (row.tenant_slug !== currentTenantSlug) {
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

    this.saveSession(
      currentTenantSlug,
      isAdminView,
      user,
      isSmartAdminHost,
    );

    this.currentSlug = currentTenantSlug;
    this.currentIsAdminView = isAdminView;
    this.currentIsSmartAdminHost = isSmartAdminHost;
    this.authState = {
      user,
      isAuthenticated: true,
      isLoading: false,
    };
    this.notifyListeners();

    return { success: true };
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  logout(): void {
    const slug = this.currentSlug;
    const isAdminView = this.currentIsAdminView;
    const isSmartAdminHost = this.currentIsSmartAdminHost;

    if (slug) {
      credentialCache.remove(slug);
    }

    this.clearSession(slug, isAdminView, isSmartAdminHost);

    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
    this.notifyListeners();
  }

  logoutAll(): void {
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
    if (user.role === 'admin') return true;
    if (!currentTenantSlug) return false;
    return user.tenantSlug === currentTenantSlug;
  }

  enforceTenantScope(
    currentTenantSlug: string | null,
    isAdminView = false,
    isSmartAdminHost = false,
  ): void {
    this.bindTenant(currentTenantSlug, isAdminView, isSmartAdminHost);

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
  // PROFILE
  // =========================================================

  async updateUserProfile(
    updates: Partial<User>,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.authState.user) {
      return { success: false, error: 'Not authenticated' };
    }
    const updatedUser = { ...this.authState.user, ...updates };
    this.authState.user = updatedUser;
    this.saveSession(
      this.currentSlug,
      this.currentIsAdminView,
      updatedUser,
      this.currentIsSmartAdminHost,
    );
    this.notifyListeners();
    return { success: true };
  }

  // =========================================================
  // GETTERS
  // =========================================================

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