// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { authService } from '../services/auth.service';
import { AuthState, User } from '../types';

/**
 * Reactive auth hook.
 *
 * Subscribes to authService.getState() changes so any consumer
 * re-renders after a login, logout, or bindTenant.
 *
 * Does NOT call bindTenant itself - that responsibility lives in
 * the entry apps (module-load bindFromUrlOnce) and in TenantContext
 * (enforceTenantScope). Calling bindTenant from here has been
 * racing with those paths and resetting auth scope mid-login.
 */
export const useAuth = () => {
  const [state, setState] = useState<AuthState>(() =>
    authService.getState(),
  );

  useEffect(() => {
    const unsubscribe = authService.subscribe((next) => {
      setState(next);
    });
    return unsubscribe;
  }, []);

  const platformAdminFallback =
    !state.isAuthenticated ? authService.getPlatformAdminIfPresent() : null;

  const effectiveState: AuthState = platformAdminFallback
    ? {
        user: platformAdminFallback,
        isAuthenticated: true,
        isLoading: false,
      }
    : state;

  const login = async (phone: string, password: string) => {
    let slugFromUrl: string | null = null;
    let isAdminFromUrl = false;
    let isSmartAdminFromUrl = false;

    try {
      const url = new URL(window.location.href);
      const qp = url.searchParams.get('t');
      if (qp) {
        isAdminFromUrl = qp.endsWith('_admin');
        slugFromUrl = isAdminFromUrl ? qp.slice(0, -6) : qp;
      }
      isSmartAdminFromUrl = url.searchParams.has('_smart-admin');
    } catch {
      /* ignore */
    }

    return authService.login(
      phone,
      password,
      slugFromUrl,
      isAdminFromUrl,
      isSmartAdminFromUrl,
    );
  };

  const logout = () => {
    authService.logout();
  };

  const updateProfile = async (updates: Partial<User>) => {
    return authService.updateUserProfile(updates);
  };

  const isAdmin = effectiveState.user?.role === 'admin';

  return {
    ...effectiveState,
    login,
    logout,
    updateProfile,
    isAdmin,
    getCurrentUser: authService.getCurrentUser,
  };
};