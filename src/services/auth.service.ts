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
    this.loadSessionFromCache();
  }

  private loadSessionFromCache(): void {
    try {
      const session = localStorage.getItem('auth_session');
      if (session) {
        try {
          const user = JSON.parse(session);
          this.authState = {
            user: user,
            isAuthenticated: true,
            isLoading: false,
          };
        } catch (e) {
          this.clearSession();
        }
      } else {
        this.authState.isLoading = false;
      }
    } catch (error) {
      this.authState.isLoading = false;
    }
    this.notifyListeners();
  }

  private saveSession(user: User): void {
    try {
      localStorage.setItem('auth_session', JSON.stringify(user));
    } catch (error) {
      // Silently handle error
    }
  }

  private clearSession(): void {
    try {
      localStorage.removeItem('auth_session');
    } catch (error) {
      // Silently handle error
    }
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

  // ============ AUTH METHODS ============

  async login(phone: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!phone || !password) {
        return { success: false, error: 'Phone number and password are required' };
      }

      if (isSupabaseConfigured) {
        try {
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
        } catch (supabaseError) {
          // Fall through to local login
        }
      }

      try {
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

        try {
          await db.updateUser(user.id, { lastLogin: new Date().toISOString() });
        } catch (updateError) {
          // Silently handle update error
        }

        this.authState = {
          user,
          isAuthenticated: true,
          isLoading: false,
        };
        this.saveSession(user);
        this.notifyListeners();

        return { success: true };
      } catch (dbError) {
        return { success: false, error: 'Service temporarily unavailable. Please try again.' };
      }
    } catch (error) {
      return { success: false, error: 'An error occurred during login' };
    }
  }

  logout(): void {
    this.clearSession();
  }

  // ============ USER PROFILE METHODS ============

  async updateUserProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.authState.user) {
        return { success: false, error: 'Not authenticated' };
      }

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
          return { success: true };
        }
      } catch (dbError) {
        return { success: true, error: 'Updated locally but may not be synced with server' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An error occurred during update' };
    }
  }

  // ============ USER STATUS METHODS ============

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  getCurrentUser(): User | null {
    return this.authState.user;
  }

  isAdmin(): boolean {
    return this.authState.user?.role === 'admin';
  }

  // ============ ADMIN METHODS ============

  async createUser(phone: string, password: string, name: string, role: 'admin' | 'user' = 'user'): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAdmin()) {
        return { success: false, error: 'Only admins can create users' };
      }

      try {
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
      } catch (dbError) {
        return { success: false, error: 'Service temporarily unavailable' };
      }
    } catch (error) {
      return { success: false, error: 'An error occurred during user creation' };
    }
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.isAdmin()) {
      return [];
    }
    try {
      return await db.getUsers();
    } catch (error) {
      const cachedUsers = localStorage.getItem('restaurant_users_data');
      if (cachedUsers) {
        try {
          return JSON.parse(cachedUsers);
        } catch (e) {
          return [];
        }
      }
      return [];
    }
  }

  async toggleUserStatus(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAdmin()) {
        return { success: false, error: 'Only admins can toggle user status' };
      }

      try {
        const updated = await db.toggleUserStatus(userId);
        if (!updated) {
          return { success: false, error: 'User not found' };
        }

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
      } catch (dbError) {
        return { success: false, error: 'Service temporarily unavailable' };
      }
    } catch (error) {
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

      try {
        const success = await db.changeUserPassword(userId, newPassword);
        if (!success) {
          return { success: false, error: 'User not found' };
        }
        return { success: true };
      } catch (dbError) {
        return { success: false, error: 'Service temporarily unavailable' };
      }
    } catch (error) {
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

      try {
        const success = await db.deleteUser(userId);
        if (!success) {
          return { success: false, error: 'User not found' };
        }
        return { success: true };
      } catch (dbError) {
        return { success: false, error: 'Service temporarily unavailable' };
      }
    } catch (error) {
      return { success: false, error: 'An error occurred' };
    }
  }
}

export const authService = new AuthService();