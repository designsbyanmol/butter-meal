// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { AuthState, User } from '../types';
import { useTenant } from '../contexts/TenantContext';

export const useAuth = () => {
  const { tenant } = useTenant();
  const [state, setState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    const unsubscribe = authService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  // Re-bind auth to the current URL's tenant whenever the tenant resolves
  useEffect(() => {
    authService.bindTenant(tenant?.slug ?? null);
  }, [tenant?.slug]);

  const login = async (phone: string, password: string) => {
    // Automatically inject the tenant slug from context — callers stay simple
    return await authService.login(phone, password, tenant?.slug ?? null);
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