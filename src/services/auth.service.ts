// services/auth.service.ts
import { User, AuthState } from '../types';
import { db } from './database.service';
import { isSupabaseConfigured } from '../config/env';

class AuthService {
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };

  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.loadSession();
  }

  private async loadSession(): Promise<void> {
    const session = localStorage.getItem('auth_session');
    if (session) {
      try {
        const user = JSON.parse(session);
        // Verify user still exists and is active
        const verifiedUser = await db.getUserById(user.id);
        if (verifiedUser && verifiedUser.isActive) {
          this.authState = {
            user: verifiedUser,
            isAuthenticated: true,
            isLoading: false,
          };
        } else {
          this.clearSession();
        }
      } catch (e) {
        console.error('Failed to parse session:', e);
        this.clearSession();
      }
    } else {
      this.authState.isLoading = false;
    }
    this.notifyListeners();
  }

  private saveSession(user: User): void {
    localStorage.setItem('auth_session', JSON.stringify(user));
  }

  private clearSession(): void {
    localStorage.removeItem('auth_session');
    this.authState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.authState }));
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener({ ...this.authState });
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  getState(): AuthState {
    return { ...this.authState };
  }

  async login(phone: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!phone || !password) {
        return { success: false, error: 'Phone number and password are required' };
      }

      // Check if using Supabase
      if (isSupabaseConfigured) {
        const { supabaseService } = await import('./supabase.service');
        const result = await supabaseService.signIn(phone, password);
        if (result.user) {
          this.authState = {
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
          };
          this.saveSession(result.user);
          this.notifyListeners();
          return { success: true };
        }
        return { success: false, error: result.error };
      }

      // Fallback to localStorage
      const user = await db.getUserByPhone(phone);
      if (!user) {
        return { success: false, error: 'Phone number not found' };
      }

      if (!user.isActive) {
        return { success: false, error: 'Account is deactivated. Please contact admin.' };
      }

      if (user.password !== password) {
        return { success: false, error: 'Invalid password' };
      }

      // Update last login
      await db.updateUser(user.id, { lastLogin: new Date().toISOString() });

      this.authState = {
        user,
        isAuthenticated: true,
        isLoading: false,
      };
      this.saveSession(user);
      this.notifyListeners();

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  }

  logout(): void {
    this.clearSession();
  }

  async updateUserProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.authState.user) {
        return { success: false, error: 'Not authenticated' };
      }

      const updated = await db.updateUser(this.authState.user.id, updates);
      if (!updated) {
        return { success: false, error: 'User not found' };
      }

      this.authState.user = updated;
      this.saveSession(updated);
      this.notifyListeners();

      return { success: true };
    } catch (error) {
      console.error('Update error:', error);
      return { success: false, error: 'An error occurred during update' };
    }
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

  // Admin only methods
  async createUser(phone: string, password: string, name: string, role: 'admin' | 'user' = 'user'): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAdmin()) {
        return { success: false, error: 'Only admins can create users' };
      }

      const existing = await db.getUserByPhone(phone);
      if (existing) {
        return { success: false, error: 'User with this phone already exists' };
      }

      await db.createUser({
        phone,
        password,
        name,
        role,
        isActive: true,
      });

      return { success: true };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'An error occurred during user creation' };
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.isAdmin()) {
      return [];
    }
    return db.getUsers();
  }

  async toggleUserStatus(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAdmin()) {
        return { success: false, error: 'Only admins can toggle user status' };
      }

      const updated = await db.toggleUserStatus(userId);
      if (!updated) {
        return { success: false, error: 'User not found' };
      }

      // If toggling current user, update session
      if (this.authState.user && this.authState.user.id === userId) {
        this.authState.user = updated;
        if (updated.isActive) {
          this.saveSession(updated);
        } else {
          this.clearSession();
        }
        this.notifyListeners();
      }

      return { success: true };
    } catch (error) {
      console.error('Toggle user status error:', error);
      return { success: false, error: 'An error occurred' };
    }
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAdmin()) {
        return { success: false, error: 'Only admins can reset passwords' };
      }

      if (newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      const success = await db.changeUserPassword(userId, newPassword);
      if (!success) {
        return { success: false, error: 'User not found' };
      }

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'An error occurred' };
    }
  }

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAdmin()) {
        return { success: false, error: 'Only admins can delete users' };
      }

      if (this.authState.user && this.authState.user.id === userId) {
        return { success: false, error: 'Cannot delete your own account' };
      }

      const success = await db.deleteUser(userId);
      if (!success) {
        return { success: false, error: 'User not found' };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, error: 'An error occurred' };
    }
  }
}

export const authService = new AuthService();