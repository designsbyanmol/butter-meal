// components/MainDashboard/SuperAdminShell.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useActiveSection } from '../Dashboard/useActiveSection';
import DashboardShell, { NavItem } from '../Dashboard/DashboardShell';
import AdminNotificationsDrawer from '../Header/AdminNotificationsDrawer';
import ContactAdminModal from '../Auth/ContactAdminModal';
import RevenueBody from './RevenueBody';
import { IconButton, EmptyState } from '../ui';
import {
  StoreIcon,
  StarIcon,
  Special,
  UsersIcon,
  PowerIcon,
  InfoIcon as SupportIcon,
  InfoIcon, // NEW: Make sure to add this to your assets/svgs barrel
} from '../../assets/svgs';
import TenantManagerBody from '../Admin/TenantManagerBody';
import ReviewsModalBody from './Modals/ReviewsModalBody';
import PlansModalBody from './Modals/PlansModalBody';
import SettingsModalBody from './Modals/SettingsModalBody';
import ReviewsModal from './Modals/ReviewsModal';
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
  target?: string;
  onClick?: () => void;
}

const SuperAdminShell: React.FC = () => {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile(900);

  const { activeKey, setActiveKey } = useActiveSection('__platform');

  const [openReviews, setOpenReviews] = useState(false);
  const [openDispute, setOpenDispute] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  if (isMobile) return null;

  const items: NavItem[] = [
    {
      key: 'stores',
      label: 'Stores',
      icon: <StoreIcon width={22} height={22} fill="currentColor" />,
      render: () => <TenantManagerBody />,
    },
    {
      key: 'reviews',
      label: 'Reviews',
      icon: <StarIcon width={22} height={22} fill="currentColor" />,
      render: () => <ReviewsModalBody />,
    },
    {
      key: 'plans',
      label: 'Plans',
      icon: <Special width={22} height={22} />,
      render: () => <PlansModalBody />,
    },
    {
      key: 'revenue',
      label: 'Revenue',
      icon: <InfoIcon width={22} height={22} fill="currentColor" />,
      render: () => <RevenueBody />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <UsersIcon width={22} height={22} fill="currentColor" />,
      render: () => <SettingsModalBody />,
    },
  ];

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
      accent: 'teal', // Using teal to differentiate from the others
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
        <h1>Welcome back, {user?.name}</h1>
        <p>Pick a section to get started.</p>
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
        items={items}
        activeKey={activeKey}
        onActiveKeyChange={setActiveKey}
        greeting={greetingContent}
        onLogoClick={() => setActiveKey('')}
        onAdd={null}
        footer={{
          notifications: (
            <AdminNotificationsDrawer
              onOpenDispute={(disputeId) => {
                setOpenDispute(disputeId);
                setOpenReviews(true);
              }}
            />
          ),
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

      {openReviews && (
        <ReviewsModal
          isOpen={true}
          onClose={() => {
            setOpenReviews(false);
            setOpenDispute(null);
          }}
          initialDisputeId={openDispute}
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

export default SuperAdminShell;