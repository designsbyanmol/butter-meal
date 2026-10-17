// src/components/MainDashboard/TenantDashboardCards.tsx
import React, { useState } from 'react';
import { usePlan } from '../../hooks/usePlan';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../hooks/useAuth';
import {
  dispatchAdminAction,
  AdminAction,
} from '../../utils/adminEvents';
import {
  StoreIcon,
  MenuIcon,
  UsersIcon,
  EditIcon,
  StarIcon,
} from '../../assets/svgs';
import { UtensilsIcon as OrdersIcon } from '../../assets/svgs';
import DineinOrdersModal from './DineinOrdersModal';
import local from './TenantDashboardCards.module.scss';

type Action = AdminAction | 'open-dinein-orders';

interface CardDef {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: 'green' | 'blue' | 'amber' | 'purple' | 'rose' | 'teal';
  action: Action;
  /** Who can see this card. */
  visibleFor: 'admin' | 'both';
}

const TenantDashboardCards: React.FC = () => {
  const { tenant } = useTenant();
  const { isAdmin } = useAuth();
  const plan = usePlan();

  const [isDineinOrdersOpen, setIsDineinOrdersOpen] = useState(false);

  if (!tenant) return null;

  // The full card set - filtered below by role.
  const allCards: CardDef[] = [
    {
      key: 'info',
      label: 'Store Information',
      description: 'Name, banner, tagline & contact',
      icon: <EditIcon width={20} height={20} fill="#ffffff" />,
      accent: 'green',
      action: 'open-info-popup',
      visibleFor: 'admin',
    },
    {
      key: 'menu',
      label: 'Menu Listing',
      description: 'Items, prices & availability',
      icon: <MenuIcon width={20} height={20} fill="#ffffff" />,
      accent: 'blue',
      action: 'open-menu-panel',
      visibleFor: 'both',
    },
    {
      key: 'store',
      label: 'Store Management',
      description: 'Open / close & accepting orders',
      icon: <StoreIcon width={20} height={20} fill="#ffffff" />,
      accent: 'amber',
      action: 'open-store-settings',
      visibleFor: 'admin',
    },
    {
      key: 'users',
      label: 'User Management',
      description: 'Staff accounts & access',
      icon: <UsersIcon width={20} height={20} fill="#ffffff" />,
      accent: 'purple',
      action: 'open-user-management',
      visibleFor: 'admin',
    },
    {
      key: 'reviews',
      label: 'Review Management',
      description: 'Customer feedback & ratings',
      icon: <StarIcon width={20} height={20} fill="#ffffff" />,
      accent: 'rose',
      action: 'open-reviews',
      visibleFor: 'admin',
    },
    {
      key: 'orders',
      label: 'Order Placed',
      description: 'Dine-in orders & bills',
      icon: <OrdersIcon width={20} height={20} fill="#ffffff" />,
      accent: 'teal',
      action: 'open-dinein-orders',
      visibleFor: 'both',
    },
  ];

  const cards = allCards.filter((c) => {
    if (c.visibleFor === 'both') return true;
    return isAdmin;
  });

  // Plan-based visibility for menu + orders (both roles).
  const visibleCards = cards.filter((c) => {
    if (c.key === 'menu') return plan.canEditFields || plan.canManageStore;
    if (c.key === 'orders') {
      return plan.canOrder && tenant.dineinEnabled === true;
    }
    return true;
  });

  if (visibleCards.length === 0) return null;

  const handleClick = (card: CardDef) => {
    if (card.action === 'open-dinein-orders') {
      setIsDineinOrdersOpen(true);
      return;
    }
    dispatchAdminAction(card.action as AdminAction);
  };

  return (
    <>
      <div className={local.wrap}>
        {isAdmin && (
  <div className={local.header}>
    <span className={local.sub}>
      {plan.planName} plan .{' '}
      {plan.isExpiringSoon
        ? `${plan.daysUntilExpiry} day${
            plan.daysUntilExpiry === 1 ? '' : 's'
          } left`
        : 'Active'}
    </span>
  </div>
)}

        <div className={local.grid}>
          {visibleCards.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`${local.card} ${local[c.accent]}`}
              onClick={() => handleClick(c)}
            >
              <span className={local.icon}>{c.icon}</span>
              <span className={local.label}>{c.label}</span>
              <span className={local.desc}>{c.description}</span>
            </button>
          ))}
        </div>
      </div>

      {isDineinOrdersOpen && (
        <DineinOrdersModal
          isOpen={true}
          onClose={() => setIsDineinOrdersOpen(false)}
          focusOrderId={null}
          mode={isAdmin ? 'admin' : 'staff'}
        />
      )}
    </>
  );
};

export default TenantDashboardCards;