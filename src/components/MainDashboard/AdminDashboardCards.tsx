// src/components/MainDashboard/AdminDashboardCards.tsx
import React, { useState } from 'react';
import { StoreIcon, UsersIcon, Special, StarIcon } from '../../assets/svgs';
import local from './AdminDashboardCards.module.scss';
import StoresModal from './Modals/StoresModal';
import ReviewsModal from './Modals/ReviewsModal';
import PlansModal from './Modals/PlansModal';
import SettingsModal from './Modals/SettingsModal';

type CardKey = 'stores' | 'reviews' | 'plans' | 'settings';

interface CardDef {
  key: CardKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: 'green' | 'blue' | 'amber' | 'purple';
}

const CARDS: CardDef[] = [
  {
    key: 'stores',
    label: 'Stores',
    description: 'Manage tenants, plans & access',
    icon: <StoreIcon width={22} height={22} fill="#ffffff" />,
    accent: 'green',
  },
  {
    key: 'reviews',
    label: 'Reviews',
    description: 'Moderate & view feedback',
    icon: <StarIcon width={22} height={22} fill="#ffffff" />,
    accent: 'amber',
  },
  {
    key: 'plans',
    label: 'Plans',
    description: 'Enable or disable globally',
    icon: <Special width={22} height={22} />,
    accent: 'purple',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Global feature toggles',
    icon: <UsersIcon width={22} height={22} color="#ffffff" />,
    accent: 'blue',
  },
];

const AdminDashboardCards: React.FC = () => {
  const [openKey, setOpenKey] = useState<CardKey | null>(null);

  const close = () => setOpenKey(null);

  return (
    <>
      <div className={local.grid}>
        {CARDS.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${local.card} ${local[c.accent]}`}
            onClick={() => setOpenKey(c.key)}
          >
            <span className={local.icon}>{c.icon}</span>
            <span className={local.label}>{c.label}</span>
            <span className={local.desc}>{c.description}</span>
          </button>
        ))}
      </div>

      <StoresModal isOpen={openKey === 'stores'} onClose={close} />
      <ReviewsModal isOpen={openKey === 'reviews'} onClose={close} />
      <PlansModal isOpen={openKey === 'plans'} onClose={close} />
      <SettingsModal isOpen={openKey === 'settings'} onClose={close} />
    </>
  );
};

export default AdminDashboardCards;