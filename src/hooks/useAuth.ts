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

  const login = async (phone: string, password: string) => {
    return await authService.login(phone, password);
  };

  const logout = () => {
    authService.logout();
  };

  const updateProfile = async (updates: Partial<User>) => {
    return await authService.updateUserProfile(updates);
  };

  // Admin methods
  const createUser = async (phone: string, password: string, name: string, role: 'admin' | 'user' = 'user') => {
    return await authService.createUser(phone, password, name, role);
  };

  const getAllUsers = async () => {
    return await authService.getAllUsers();
  };

  const toggleUserStatus = async (userId: string) => {
    return await authService.toggleUserStatus(userId);
  };

  const resetUserPassword = async (userId: string, newPassword: string) => {
    return await authService.resetUserPassword(userId, newPassword);
  };

  const deleteUser = async (userId: string) => {
    return await authService.deleteUser(userId);
  };

  // Check if current user is admin
  const isAdmin = state.user?.role === 'admin';

  return {
    ...state,
    login,
    logout,
    updateProfile,
    createUser,
    getAllUsers,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,
    isAdmin,
    getCurrentUser: authService.getCurrentUser,
  };
};