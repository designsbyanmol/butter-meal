// services/auth.service.ts
import { User, AuthState } from '../types';
import { isSupabaseConfigured } from '../config/env';
import { supabase } from './supabase.client';
import { credentialCache } from './credentialCache';

const AUTH_SESSION_KEY = 'restaurant_auth_session';

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

  constructor() {
    this.loadSessionFromCache();
  }

  // =========================================================
  // SESSION LIFECYCLE
  // =========================================================

  private loadSessionFromCache(): void {
    try {
      const session = localStorage.getItem(AUTH_SESSION_KEY);
      if (session) {
        const user = JSON.parse(session);
        this.authState = {
          user,
          isAuthenticated: true,
          isLoading: false,
        };
      } else {
        this.authState.isLoading = false;
      }
    } catch {
      this.authState.isLoading = false;
    }
    this.notifyListeners();
  }

  private saveSession(user: User): void {
    try {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }

  private clearSession(): void {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch {
      /* ignore */
    }
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l({ ...this.authState }));
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener({ ...this.authState });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
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

    // If we're replacing a different user, wipe any cached credentials
    const previousUser = this.authState.user;
    if (previousUser && previousUser.id !== row.id) {
      credentialCache.clearAll();
    }

    const user: User = {
      id: row.id,
      phone: row.phone,
      name: row.name,
      password: '',
      role: row.role,
      isActive: row.is_active,
      tenantId: row.tenant_id,
      tenantSlug: row.tenant_slug, // ✅ essential for scope enforcement
      createdAt: row.created_at,
      lastLogin: row.last_login ?? undefined,
    };

    try {
      await supabase.rpc('touch_last_login', { user_id: row.id });
    } catch {
      /* ignore */
    }

    this.authState = {
      user,
      isAuthenticated: true,
      isLoading: false,
    };
    this.saveSession(user);
    this.notifyListeners();
    return { success: true };
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  logout(): void {
    // Clear any session-scoped credentials so the next login starts fresh
    credentialCache.clearAll();
    this.clearSession();
  }

  // =========================================================
  // TENANT SCOPE ENFORCEMENT
  // =========================================================

  /**
   * Returns true if the current session's user is allowed to be active
   * on the given tenant slug.
   *
   * Rules:
   *   - Not logged in            → true (nothing to invalidate).
   *   - role='admin'             → true anywhere.
   *   - role='user' at own slug  → true.
   *   - role='user' at main URL  → false.
   *   - role='user' at wrong slug → false.
   */
  isUserValidForTenant(currentTenantSlug: string | null): boolean {
    const user = this.authState.user;
    if (!user) return true;

    // Admins roam freely across every tenant URL
    if (user.role === 'admin') return true;

    // Staff: must be at their own tenant URL
    if (!currentTenantSlug) return false;
    return user.tenantSlug === currentTenantSlug;
  }

  /**
   * Logs out if the current session's user doesn't match the tenant
   * of the URL they're on. Safe to call repeatedly.
   *
   * Called by TenantContext whenever the URL's tenant is resolved.
   */
  enforceTenantScope(currentTenantSlug: string | null): void {
    if (!this.isUserValidForTenant(currentTenantSlug)) {
      // Leave a breadcrumb so the UI can optionally show a notice
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
    this.saveSession(updatedUser);
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