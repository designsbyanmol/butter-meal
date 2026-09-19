// hooks/usePlan.ts
import { useTenant } from '../contexts/TenantContext';
import { PlanFeatures } from '../types';

interface UsePlanResult {
  planId: string;
  planName: string;
  features: PlanFeatures;
  status: 'active' | 'paused' | 'expired';
  expiresAt?: string;
  daysUntilExpiry: number;
  isExpiringSoon: boolean;   // <= 7 days and still active
  isExpired: boolean;
  isPaused: boolean;

  canOrder: boolean;
  canEditFields: boolean;
  canManageStore: boolean;
  canManageUsers: boolean;
  canWishlist: boolean;
  canReview: boolean;
  canAddCustomMessage: boolean;

  canEditProfileField: (key: string) => boolean;
}

export const usePlan = (): UsePlanResult => {
  const { tenant } = useTenant();

  const features: PlanFeatures = tenant?.planFeatures ?? {};

  const status = (tenant?.subscriptionStatus ?? 'active') as
    | 'active'
    | 'paused'
    | 'expired';

  const daysUntilExpiry =
    typeof tenant?.daysUntilExpiry === 'number'
      ? tenant.daysUntilExpiry
      : Infinity;

  const isExpired = status === 'expired';
  const isPaused = status === 'paused';
  const isExpiringSoon =
    status === 'active' && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;

  // Feature flags default to TRUE when the tenant has no plan loaded yet
  // (e.g., during initial load or on the platform host) - this keeps the
  // customer UI stable until the tenant resolves.
  const truthy = (v: any): boolean => v !== false;

  const canEditProfileField = (key: string): boolean => {
    const allowed = features.canEditProfileFields;
    if (!Array.isArray(allowed)) return true;
    return allowed.includes(key);
  };

  return {
    planId: tenant?.planId ?? 'professional',
    planName: tenant?.planName ?? 'Professional',
    features,
    status,
    expiresAt: tenant?.subscriptionExpiresAt,
    daysUntilExpiry,
    isExpiringSoon,
    isExpired,
    isPaused,

    canOrder: truthy(features.canOrder),
    canEditFields: truthy(features.canEditFields),
    canManageStore: truthy(features.canManageStore),
    canManageUsers: truthy(features.canManageUsers),
    canWishlist: truthy(features.canWishlist),
    canReview: truthy(features.canReview),
    canAddCustomMessage: truthy(features.canAddCustomMessage),

    canEditProfileField,
  };
};