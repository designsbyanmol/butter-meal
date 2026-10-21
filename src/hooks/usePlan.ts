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
  isExpiringSoon: boolean;
  isExpired: boolean;
  isPaused: boolean;

  /**
   * Whether the tenant's current plan is still enabled globally.
   * Derived from `tenant.planActive`, which `TenantContext` refreshes
   * whenever the platform admin enables/disables a plan.
   */
  isPlanActive: boolean;

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

  const tenantLoaded = !!tenant;
  // Default to true while the tenant hasn't loaded yet.
  const isPlanActive = tenantLoaded ? tenant!.planActive !== false : true;

  const truthy = (v: any): boolean => v !== false;

  const grant = (featureKey: keyof PlanFeatures): boolean => {
    if (!tenantLoaded) return true;
    if (!isPlanActive) return false;
    return truthy(features[featureKey]);
  };

  const canEditProfileField = (key: string): boolean => {
    const allowed = features.canEditProfileFields;
    if (!Array.isArray(allowed)) return tenantLoaded ? isPlanActive : true;
    if (!isPlanActive && tenantLoaded) {
      const safeKeys = new Set([
        'display_name',
        'store_tagline',
        'owner_phone',
        'whatsapp_phone',
      ]);
      return safeKeys.has(key);
    }
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
    isPlanActive,

    canOrder: grant('canOrder'),
    canEditFields: grant('canEditFields'),
    canManageStore: grant('canManageStore'),
    canManageUsers: grant('canManageUsers'),
    canWishlist: grant('canWishlist'),
    canReview: grant('canReview'),
    canAddCustomMessage: grant('canAddCustomMessage'),

    canEditProfileField,
  };
};