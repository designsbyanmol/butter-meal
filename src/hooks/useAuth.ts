// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { AuthState, User } from '../types';
import { useTenant } from '../contexts/TenantContext';

export const useAuth = () => {
  const { tenant, isAdminView, isSmartAdminHost } = useTenant();
  const [state, setState] = useState<AuthState>(authService.getState());

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  // Re-bind the auth service whenever the URL context changes
  useEffect(() => {
    authService.bindTenant(
      tenant?.slug ?? null,
      isAdminView,
      isSmartAdminHost,
    );
  }, [tenant?.slug, isAdminView, isSmartAdminHost]);

  const login = async (phone: string, password: string) => {
    return await authService.login(
      phone,
      password,
      tenant?.slug ?? null,
      isAdminView,
      isSmartAdminHost,
    );
  };

  const logout = () => {
    authService.logout();
  };

  const updateProfile = async (updates: Partial<User>) => {
    return await authService.updateUserProfile(updates);
  };

  const isAdmin = state.user?.role === 'admin';

  return {
    ...state,
    login,
    logout,
    updateProfile,
    isAdmin,
    getCurrentUser: authService.getCurrentUser,
  };
};