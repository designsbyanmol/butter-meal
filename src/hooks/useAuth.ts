// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { AuthState, User } from '../types';
import { useTenant } from '../contexts/TenantContext';

export const useAuth = () => {
  const { tenant, isLoading, isAdminView, isSmartAdminHost } = useTenant();
  const [state, setState] = useState<AuthState>(authService.getState());

  // Subscribe to auth state changes.
  useEffect(() => {
    const unsubscribe = authService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  // Re-bind the auth service whenever the URL context changes, BUT
  // only after the tenant has finished resolving. On a fresh page
  // load, `tenant` is null and `isLoading` is true on the first
  // render; calling `bindTenant(null, ...)` at that moment would
  // rebind the service to the platform key and wipe the tenant
  // admin's session in memory — which the header would then render
  // as "logged out".
  useEffect(() => {
    if (isLoading) return;

    authService.bindTenant(
      tenant?.slug ?? null,
      isAdminView,
      isSmartAdminHost,
    );
  }, [tenant?.slug, isAdminView, isSmartAdminHost, isLoading]);

  // Platform-admin pass-through: if we're on a tenant admin URL and
  // there's no tenant-scoped session, but a platform-admin session
  // exists, treat the platform admin as the current user *for this
  // render* without writing anything to storage.
  const platformAdminOnTenant =
    !state.isAuthenticated &&
    !!tenant &&
    isAdminView &&
    authService.getPlatformAdminIfPresent();

  const effectiveState: AuthState = platformAdminOnTenant
    ? {
        user: platformAdminOnTenant,
        isAuthenticated: true,
        isLoading: false,
      }
    : state;

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