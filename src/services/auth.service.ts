// services/auth.service.ts
import { User, AuthState } from '../types';
import { db } from './database.service';
import { isSupabaseConfigured } from '../config/env';

const AUTH_SESSION_KEY = 'star_veg_auth_session';

class AuthService {
  private authState: AuthState = { user: null, isAuthenticated: false, isLoading: true };
  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.loadSessionFromCache();
  }

  private loadSessionFromCache(): void {
    try {
      const session = localStorage.getItem(AUTH_SESSION_KEY);
      if (session) {
        const user = JSON.parse(session);
        this.authState = { user, isAuthenticated: true, isLoading: false };
      } else {
        this.authState.isLoading = false;
      }
    } catch {
      this.authState.isLoading = false;
    }
    this.notifyListeners();
  }

  private saveSession(user: User): void {
    try { localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user)); } catch {}
  }

  private clearSession(): void {
    try { localStorage.removeItem(AUTH_SESSION_KEY); } catch {}
    this.authState = { user: null, isAuthenticated: false, isLoading: false };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l({ ...this.authState }));
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener({ ...this.authState });
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  getState(): AuthState { return { ...this.authState }; }

  async login(phone: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!phone || !password) return { success: false, error: 'Phone number and password are required' };

    // Try Supabase first (uses SECURITY DEFINER function; hashed comparison)
    if (isSupabaseConfigured) {
      try {
        const { supabaseService } = await import('./supabase.service');
        const result = await supabaseService.signIn(phone, password);
        if (result.user) {
          this.authState = { user: result.user, isAuthenticated: true, isLoading: false };
          this.saveSession(result.user);
          this.notifyListeners();
          return { success: true };
        }
        // Don't hard-fail; fall through to local for offline/dev
        console.warn('Supabase signin failed, trying local:', result.error);
      } catch (e) {
        console.warn('Supabase signin threw, trying local:', e);
      }
    }

    // Local fallback
    try {
      const user = await db.getUserByPhone(phone);
      if (!user) return { success: false, error: 'Phone number not found' };
      if (!user.isActive) return { success: false, error: 'Account is deactivated. Please contact admin.' };

      // Local cache stores plaintext for dev only — see database.service
      if (user.password !== password) return { success: false, error: 'Invalid password' };

      try { await db.updateUser(user.id, { lastLogin: new Date().toISOString() }); } catch {}

      this.authState = { user, isAuthenticated: true, isLoading: false };
      this.saveSession(user);
      this.notifyListeners();
      return { success: true };
    } catch {
      return { success: false, error: 'Service temporarily unavailable. Please try again.' };
    }
  }

  logout(): void { this.clearSession(); }

  async updateUserProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    if (!this.authState.user) return { success: false, error: 'Not authenticated' };
    const updatedUser = { ...this.authState.user, ...updates };
    this.authState.user = updatedUser;
    this.saveSession(updatedUser);
    this.notifyListeners();

    try {
      const updated = await db.updateUser(this.authState.user.id, updates);
      if (updated) {
        this.authState.user = updated;
        this.saveSession(updated);
        this.notifyListeners();
      }
      return { success: true };
    } catch {
      return { success: true, error: 'Updated locally but may not be synced with server' };
    }
  }

  isAuthenticated(): boolean { return this.authState.isAuthenticated; }
  getCurrentUser(): User | null { return this.authState.user; }
  isAdmin(): boolean { return this.authState.user?.role === 'admin'; }

  async createUser(phone: string, password: string, name: string, role: 'admin' | 'user' = 'user') {
    if (!this.isAdmin()) return { success: false, error: 'Only admins can create users' };
    try {
      const existing = await db.getUserByPhone(phone);
      if (existing) return { success: false, error: 'User with this phone already exists' };
      await db.createUser({ phone, password, name, role, isActive: true });
      return { success: true };
    } catch {
      return { success: false, error: 'An error occurred during user creation' };
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.isAdmin()) return [];
    try { return await db.getUsers(); } catch { return []; }
  }

  async toggleUserStatus(userId: string) {
    if (!this.isAdmin()) return { success: false, error: 'Only admins can toggle user status' };
    try {
      const updated = await db.toggleUserStatus(userId);
      if (!updated) return { success: false, error: 'User not found' };

      if (this.authState.user?.id === userId) {
        this.authState.user = updated;
        if (updated.isActive) this.saveSession(updated);
        else this.clearSession();
        this.notifyListeners();
      }
      return { success: true };
    } catch {
      return { success: false, error: 'An error occurred' };
    }
  }

  async resetUserPassword(userId: string, newPassword: string) {
    if (!this.isAdmin()) return { success: false, error: 'Only admins can reset passwords' };
    if (newPassword.length < 6) return { success: false, error: 'Password must be at least 6 characters' };
    try {
      const ok = await db.changeUserPassword(userId, newPassword);
      return ok ? { success: true } : { success: false, error: 'User not found' };
    } catch {
      return { success: false, error: 'An error occurred' };
    }
  }

  async deleteUser(userId: string) {
    if (!this.isAdmin()) return { success: false, error: 'Only admins can delete users' };
    if (this.authState.user?.id === userId) return { success: false, error: 'Cannot delete your own account' };
    try {
      const ok = await db.deleteUser(userId);
      return ok ? { success: true } : { success: false, error: 'User not found' };
    } catch {
      return { success: false, error: 'An error occurred' };
    }
  }
}

export const authService = new AuthService();