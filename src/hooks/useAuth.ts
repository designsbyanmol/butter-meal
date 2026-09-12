// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { AuthState, User } from '../types';

export const useAuth = () => {
  const [state, setState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    const unsubscribe = authService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const login = async (
    phone: string,
    password: string,
    tenantSlug: string | null,
  ) => {
    return await authService.login(phone, password, tenantSlug);
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