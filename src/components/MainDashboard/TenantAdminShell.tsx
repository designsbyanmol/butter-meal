// components/MainDashboard/TenantAdminShell.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { usePlan } from '../../hooks/usePlan';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useActiveSection } from '../Dashboard/useActiveSection';
import DashboardShell, { NavItem } from '../Dashboard/DashboardShell';
import TenantNotificationsDrawer from '../Header/TenantNotificationsDrawer';
import DineinNotificationsDrawer from '../Header/DineinNotificationsDrawer';
import ContactAdminModal from '../Auth/ContactAdminModal';
import Avatar from '../ui/Avatar/Avatar';
import { IconButton } from '../ui';
import {
  StoreIcon,
  MenuIcon,
  UsersIcon,
  StarIcon,
  EditIcon,
  UtensilsIcon as OrdersIcon,
  PowerIcon,
  InfoIcon as SupportIcon,
} from '../../assets/svgs';
import InfoPopupBody from '../Store/InfoPopupBody';
import AdminPanelBody from '../Admin/AdminPanelBody';
import StoreModalBody from '../Store/StoreModalBody';
import UserManagementBody from '../Admin/UserManagementBody';
import ReviewsAdminModalBody from './ReviewsAdminModalBody';
import DineinOrdersModalBody from './DineinOrdersModalBody';
import ReviewsAdminModal from './ReviewsAdminModal';
import DineinOrdersModal from './DineinOrdersModal';
import shell from '../Dashboard/DashboardShell.module.scss';

const ADMIN_EMAIL = 'admin@dozzelo.com';

type Accent = 'green' | 'blue' | 'amber' | 'purple' | 'rose' | 'teal';

interface CardDef {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: Accent;
  visible: boolean;
  /** Navigate to a section. */
  target?: string;
  /** Or run a custom action. */
  onClick?: () => void;
}

const TenantAdminShell: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { tenant } = useTenant();
  const plan = usePlan();
  const isMobile = useIsMobile(900);

  // Persisted across reloads (session-scoped).
  const { activeKey, setActiveKey } = useActiveSection(
    tenant?.slug ?? '__tenant',
  );

  const [openReviews, setOpenReviews] = useState(false);
  const [openDispute, setOpenDispute] = useState<string | null>(null);
  const [openOrders, setOpenOrders] = useState(false);
  const [focusOrderId, setFocusOrderId] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  if (isMobile || !tenant) return null;

  const isDinein = tenant.dineinEnabled === true;

  // ---------- Nav items ----------
  const items: NavItem[] = [
    {
      key: 'menu',
      label: 'Menu',
      icon: <MenuIcon width={20} height={20} fill="currentColor" />,
      visible: plan.canEditFields || plan.canManageStore,
      render: () => <AdminPanelBody />,
    },
    {
      key: 'store',
      label: 'Store',
      icon: <StoreIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canManageStore,
      render: () => <StoreModalBody />,
    },
    {
      key: 'users',
      label: 'Users',
      icon: <UsersIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canManageUsers,
      render: () => <UserManagementBody />,
    },
    {
      key: 'reviews',
      label: 'Reviews',
      icon: <StarIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canReview,
      render: () => <ReviewsAdminModalBody />,
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: <OrdersIcon width={20} height={20} fill="currentColor" />,
      visible: plan.canOrder && isDinein,
      render: () => <DineinOrdersModalBody mode={isAdmin ? 'admin' : 'staff'} />,
    },
  ];

  // The "info" section is reachable only via the footer avatar. It's
  // registered as a hidden item so the shell can render it, but it
  // never shows in the sidebar.
  const infoItem: NavItem = {
    key: 'info',
    label: 'Info',
    icon: <></>,
    visible: false,
    render: () => <InfoPopupBody />,
  };

  const allItems: NavItem[] = [infoItem, ...items];

  // ---------- Greeting cards ----------
  const cardDefs: CardDef[] = [
    {
      key: 'info',
      label: 'Store Information',
      description: 'Name, banner, tagline & contact',
      icon: <EditIcon width={20} height={20} fill="#ffffff" />,
      accent: 'green',
      visible: isAdmin,
      target: 'info',
    },
    {
      key: 'menu',
      label: 'Menu Management',
      description: 'Items, prices & availability',
      icon: <MenuIcon width={20} height={20} fill="#ffffff" />,
      accent: 'blue',
      visible: plan.canEditFields || plan.canManageStore,
      target: 'menu',
    },
    {
      key: 'store',
      label: 'Store Management',
      description: 'Open / close & accepting orders',
      icon: <StoreIcon width={20} height={20} fill="#ffffff" />,
      accent: 'amber',
      visible: isAdmin && plan.canManageStore,
      target: 'store',
    },
    {
      key: 'users',
      label: 'User Management',
      description: 'Staff accounts & access',
      icon: <UsersIcon width={20} height={20} fill="#ffffff" />,
      accent: 'purple',
      visible: isAdmin && plan.canManageUsers,
      target: 'users',
    },
    {
      key: 'reviews',
      label: 'Review Management',
      description: 'Customer feedback & ratings',
      icon: <StarIcon width={20} height={20} fill="#ffffff" />,
      accent: 'rose',
      visible: isAdmin && plan.canReview,
      target: 'reviews',
    },
    {
      key: 'orders',
      label: 'Orders',
      description: 'Dine-in orders & bills',
      icon: <OrdersIcon width={20} height={20} fill="#ffffff" />,
      accent: 'teal',
      visible: plan.canOrder && isDinein,
      target: 'orders',
    },
    {
      key: 'support',
      label: 'Contact Support',
      description: 'Reach out to our team',
      icon: <SupportIcon width={20} height={20} fill="#ffffff" />,
      accent: 'green',
      visible: true,
      onClick: () => setSupportOpen(true),
    },
  ];

  const visibleCards = cardDefs.filter((c) => c.visible);

  // ---------- Sidebar footer ----------
  const showTenantBell = isAdmin && plan.canReview;
  const showDineinBell = isAdmin && isDinein;

  const notificationsSlot = (
    <>
      {showTenantBell && (
        <TenantNotificationsDrawer
          onOpenReview={(n) => {
            setOpenDispute(n.disputeId);
            setOpenReviews(true);
          }}
        />
      )}
      {showDineinBell && (
        <DineinNotificationsDrawer
          onOpenOrder={(orderId) => {
            setFocusOrderId(orderId);
            setOpenOrders(true);
          }}
        />
      )}
    </>
  );

  const greetingContent = (
    <div className={shell.welcome}>
      <div className={shell.welcomeHead}>
        <h1>Welcome back, {user?.name}</h1>
        <p>
          You're signed in to <strong>{tenant.displayName}</strong>.
          Pick a section to get started.
        </p>
      </div>

      <div className={shell.cardGrid}>
        {visibleCards.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${shell.card} ${shell[c.accent]}`}
            onClick={() => {
              if (c.target) {
                setActiveKey(c.target);
              } else {
                c.onClick?.();
              }
            }}
          >
            <span className={shell.cardIcon}>{c.icon}</span>
            <span className={shell.cardLabel}>{c.label}</span>
            <span className={shell.cardDesc}>{c.description}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <DashboardShell
        logoUrl="https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/logo-icon.png"
        items={allItems}
        activeKey={activeKey}
        onActiveKeyChange={setActiveKey}
        greeting={greetingContent}
        onAdd={null}
        onLogoClick={() => setActiveKey('')}
        footer={{
          notifications: notificationsSlot,
          avatar: isAdmin ? (
            <button
              type="button"
              className={shell.footerSlot}
              onClick={() => setActiveKey('info')}
              aria-label="Open store information"
              title="Store Information"
              style={{
                width: 40,
                height: 40,
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              <Avatar
                name={user?.name}
                role="admin"
                size="md"
                bgColor="#1e7e34"
              />
            </button>
          ) : undefined,
          logout: (
            <IconButton
              variant="ghost"
              size="md"
              aria-label="Logout"
              tooltip="Logout"
              onClick={() => {
                if (window.confirm('Log out?')) logout();
              }}
            >
              <PowerIcon width={20} height={20} fill="#a62d2d" />
            </IconButton>
          ),
        }}
      />

      {openReviews && isAdmin && (
        <ReviewsAdminModal
          onClose={() => {
            setOpenReviews(false);
            setOpenDispute(null);
          }}
          focusDispute={
            openDispute
              ? {
                  disputeId: openDispute,
                  reviewId: '',
                  outcome: 'rejected',
                  reviewItemName: null,
                }
              : null
          }
        />
      )}

      {openOrders && isAdmin && (
        <DineinOrdersModal
          isOpen={true}
          onClose={() => {
            setOpenOrders(false);
            setFocusOrderId(null);
          }}
          focusOrderId={focusOrderId}
          mode="admin"
        />
      )}

      {supportOpen && (
        <ContactAdminModal
          isOpen={true}
          onClose={() => setSupportOpen(false)}
          email={ADMIN_EMAIL}
        />
      )}
    </>
  );
};

export default TenantAdminShell;