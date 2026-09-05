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
    // Load session from localStorage immediately
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
          console.log('✅ Session loaded from localStorage:', user.name);
        } catch (e) {
          console.error('Failed to parse session:', e);
          this.clearSession();
        }
      } else {
        this.authState.isLoading = false;
      }
    } catch (error) {
      console.error('Error loading session:', error);
      this.authState.isLoading = false;
    }
    this.notifyListeners();
  }

  private saveSession(user: User): void {
    try {
      localStorage.setItem('auth_session', JSON.stringify(user));
      console.log('💾 Session saved to localStorage');
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  private clearSession(): void {
    try {
      localStorage.removeItem('auth_session');
      console.log('🗑️ Session cleared from localStorage');
    } catch (error) {
      console.error('Error clearing session:', error);
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

      // Try Supabase first if configured
      if (isSupabaseConfigured) {
        try {
          const { supabaseService } = await import('./supabase.service');
          const result = await supabaseService.signIn(phone, password);
          if (result.user) {
            // Save to localStorage immediately
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
          console.warn('⚠️ Supabase login failed, falling back to local:', supabaseError);
          // Fall through to local login
        }
      }

      // Fallback to localStorage
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

        // Update last login (try but don't fail if it doesn't work)
        try {
          await db.updateUser(user.id, { lastLogin: new Date().toISOString() });
        } catch (updateError) {
          console.warn('⚠️ Could not update last login:', updateError);
        }

        // Save to localStorage
        this.authState = {
          user,
          isAuthenticated: true,
          isLoading: false,
        };
        this.saveSession(user);
        this.notifyListeners();

        return { success: true };
      } catch (dbError) {
        console.error('Database error during login:', dbError);
        return { success: false, error: 'Service temporarily unavailable. Please try again.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  }

  // ONLY clear session on explicit logout
  logout(): void {
    this.clearSession();
  }

  // ============ USER PROFILE METHODS ============

  async updateUserProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.authState.user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Always update localStorage first
      const updatedUser = { ...this.authState.user, ...updates };
      this.authState.user = updatedUser;
      this.saveSession(updatedUser);
      this.notifyListeners();

      // Try to update in database (if available)
      try {
        const updated = await db.updateUser(this.authState.user.id, updates);
        if (updated) {
          this.authState.user = updated;
          this.saveSession(updated);
          this.notifyListeners();
          return { success: true };
        }
      } catch (dbError) {
        console.warn('⚠️ Database update failed, user updated locally only:', dbError);
        return { success: true, error: 'Updated locally but may not be synced with server' };
      }

      return { success: true };
    } catch (error) {
      console.error('Update error:', error);
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
        console.error('Database error creating user:', dbError);
        return { success: false, error: 'Service temporarily unavailable' };
      }
    } catch (error) {
      console.error('Create user error:', error);
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
      console.error('Error getting users:', error);
      // Return cached users if available
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
      } catch (dbError) {
        console.error('Database error toggling user:', dbError);
        return { success: false, error: 'Service temporarily unavailable' };
      }
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

      try {
        const success = await db.changeUserPassword(userId, newPassword);
        if (!success) {
          return { success: false, error: 'User not found' };
        }
        return { success: true };
      } catch (dbError) {
        console.error('Database error resetting password:', dbError);
        return { success: false, error: 'Service temporarily unavailable' };
      }
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

      try {
        const success = await db.deleteUser(userId);
        if (!success) {
          return { success: false, error: 'User not found' };
        }
        return { success: true };
      } catch (dbError) {
        console.error('Database error deleting user:', dbError);
        return { success: false, error: 'Service temporarily unavailable' };
      }
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, error: 'An error occurred' };
    }
  }
}

export const authService = new AuthService();