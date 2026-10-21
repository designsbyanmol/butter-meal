// src/components/MainDashboard/SuperAdminShell.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useIsMobile } from '../../hooks/useIsMobile';
import DashboardShell, { NavItem } from '../Dashboard/DashboardShell';
import MobileDashboardShell, {
  MobileNavItem,
  KebabItem,
} from '../Dashboard/MobileDashboardShell';
import AdminNotificationsDrawer from '../Header/AdminNotificationsDrawer';
import ContactAdminModal from '../Auth/ContactAdminModal';
import LoginModal from '../Auth/LoginModal';
import DashboardSkeleton from '../DashboardSkeleton/DashboardSkeleton';
import { authService } from '../../services/auth.service';
import {
  StoreIcon,
  StarIcon,
  Special,
  UsersIcon,
  PowerIcon,
  InfoIcon as SupportIcon,
  InfoIcon,
} from '../../assets/svgs';
import shell from '../Dashboard/DashboardShell.module.scss';

const ADMIN_EMAIL = 'ContactDozzelo@gmail.com';
const LOGO_URL =
  'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/logo-icon.png';

const SECTION_PAGE: Record<string, string> = {
  stores: 'superadmin-store.html',
  reviews: 'superadmin-reviews.html',
  plans: 'superadmin-plans.html',
  revenue: 'superadmin-revenue.html',
  settings: 'superadmin-settings.html',
};

const navigateTo = (page: string) => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
  window.location.href = `${window.location.origin}${dir}${page}`;
};

const handleLogout = () => {
  if (!window.confirm('Log out?')) return;
  authService.logout();
  navigateTo('');
  window.location.href = `${window.location.origin}/`;
};

type Accent = 'green' | 'blue' | 'amber' | 'purple' | 'rose' | 'teal';

interface CardDef {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: Accent;
  visible: boolean;
  target?: string;
  onClick?: () => void;
}

const SuperAdminShell: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isMobile = useIsMobile(900);
  const [supportOpen, setSupportOpen] = React.useState(false);

  if (isLoading) {
    return <DashboardSkeleton count={6} hideHeader hideBrand hidePill />;
  }
  if (!isAuthenticated) {
    return (
      <>
        <div style={{ minHeight: '100vh', background: '#f8fafc' }} />
        <LoginModal isOpen={true} onClose={() => {}} forceOpen={true} />
      </>
    );
  }
  if (!user?.isPlatformAdmin) {
    return (
      <div
        style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2>Not authorized</h2>
          <p style={{ color: '#666' }}>Platform administrators only.</p>
        </div>
      </div>
    );
  }

  const navItems: NavItem[] = [
    {
      key: 'stores',
      label: 'Stores',
      icon: <StoreIcon width={22} height={22} fill="currentColor" />,
      render: () => null,
    },
    {
      key: 'reviews',
      label: 'Reviews',
      icon: <StarIcon width={22} height={22} fill="currentColor" />,
      render: () => null,
    },
    {
      key: 'plans',
      label: 'Plans',
      icon: <Special width={22} height={22} />,
      render: () => null,
    },
    {
      key: 'revenue',
      label: 'Revenue',
      icon: <InfoIcon width={22} height={22} fill="currentColor" />,
      render: () => null,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <UsersIcon width={22} height={22} fill="currentColor" />,
      render: () => null,
    },
  ];

  const handleActiveKeyChange = (key: string) => {
    if (!key) return;
    const page = SECTION_PAGE[key];
    if (page) navigateTo(page);
  };

  const cardDefs: CardDef[] = [
    {
      key: 'stores',
      label: 'Stores',
      description: 'Manage tenants & access',
      icon: <StoreIcon width={20} height={20} fill="#ffffff" />,
      accent: 'green',
      visible: true,
      target: 'stores',
    },
    {
      key: 'reviews',
      label: 'Reviews',
      description: 'Moderate & view feedback',
      icon: <StarIcon width={20} height={20} fill="#ffffff" />,
      accent: 'rose',
      visible: true,
      target: 'reviews',
    },
    {
      key: 'plans',
      label: 'Plans',
      description: 'Enable or disable globally',
      icon: <Special width={20} height={20} />,
      accent: 'purple',
      visible: true,
      target: 'plans',
    },
    {
      key: 'revenue',
      label: 'Revenue & Billing',
      description: 'Platform earnings & history',
      icon: <InfoIcon width={20} height={20} fill="#ffffff" />,
      accent: 'teal',
      visible: true,
      target: 'revenue',
    },
    {
      key: 'settings',
      label: 'Settings',
      description: 'Global feature toggles',
      icon: <UsersIcon width={20} height={20} fill="#ffffff" />,
      accent: 'blue',
      visible: true,
      target: 'settings',
    },
    {
      key: 'support',
      label: 'Contact Support',
      description: 'Reach out to our team',
      icon: <SupportIcon width={20} height={20} fill="#ffffff" />,
      accent: 'amber',
      visible: true,
      onClick: () => setSupportOpen(true),
    },
  ];

  const visibleCards = cardDefs.filter((c) => c.visible);

  const greetingContent = (
    <div className={shell.welcome}>
      <div className={shell.welcomeHead}>
        <h1>Welcome back, <span>{user?.name}</span></h1>
        <p>Pick a section to get started.</p>
      </div>

      <div className={shell.cardGrid}>
        {visibleCards.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${shell.card} ${shell[c.accent]}`}
            onClick={() => {
              if (c.target) handleActiveKeyChange(c.target);
              else c.onClick?.();
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

  const notificationsSlot = (
    <AdminNotificationsDrawer
      onOpenDispute={() => navigateTo('superadmin-reviews.html')}
    />
  );

  const kebabItems: KebabItem[] = [
    {
      kind: 'action',
      key: 'settings',
      label: 'Global Settings',
      icon: <UsersIcon width={18} height={18} fill="#1e7e34" />,
      onClick: () => navigateTo('superadmin-settings.html'),
    },
    { kind: 'divider' },
    {
      kind: 'action',
      key: 'logout',
      label: 'Logout',
      icon: <PowerIcon width={18} height={18} fill="#a62d2d" />,
      onClick: handleLogout,
    },
  ];

  if (isMobile) {
    const mobileNavItems: MobileNavItem[] = navItems.map((i) => ({
      key: i.key,
      label: i.label,
      icon: i.icon,
      render: () => null,
      visible: true,
    }));

    return (
      <>
        <MobileDashboardShell
          logoUrl={LOGO_URL}
          roleLabel="Super Admin"
          navItems={mobileNavItems}
          activeKey=""
          onActiveKeyChange={handleActiveKeyChange}
          onLogoClick={() => {
            /* already on landing */
          }}
          greeting={greetingContent}
          kebabItems={kebabItems}
          notifications={notificationsSlot}
        />
        {supportOpen && (
          <ContactAdminModal
            isOpen={true}
            onClose={() => setSupportOpen(false)}
            email={ADMIN_EMAIL}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DashboardShell
        logoUrl={LOGO_URL}
        items={navItems}
        activeKey=""
        onActiveKeyChange={handleActiveKeyChange}
        greeting={greetingContent}
        onLogoClick={() => {
          /* already on landing */
        }}
        onAdd={null}
        footer={{
          notifications: notificationsSlot,
          logout: (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              style={{
                width: 40,
                height: 40,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              <PowerIcon width={20} height={20} fill="#a62d2d" />
            </button>
          ),
        }}
      />
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

export default SuperAdminShell;