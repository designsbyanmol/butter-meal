// components/Home/sections/Features.tsx
import React from 'react';
import {
  MenuIcon,
  StoreIcon,
  UtensilsIcon,
  StarIcon,
  UsersIcon,
  CheckIcon,
} from '../../../assets/svgs';
import local from './Features.module.scss';
import shell from '../HomePage.module.scss';

const FEATURES = [
  {
    icon: <MenuIcon width={20} height={20} fill="#fff" />,
    title: 'Online Menu & Catalogue',
    desc: 'Build a beautiful menu with photos, prices, variants and add-ons. Live in minutes, edited anytime.',
  },
  {
    icon: <StoreIcon width={20} height={20} fill="#fff" />,
    title: 'Instant QR Codes',
    desc: 'Print a QR for each table or the storefront. Customers scan, browse, and order - no app required.',
  },
  {
    icon: <UtensilsIcon width={20} height={20} fill="#fff" />,
    title: 'Dine-in Ordering',
    desc: 'Let guests order from their table, track item-by-item prep, and call for the bill when they\'re done.',
  },
  {
    icon: <CheckIcon width={20} height={20} fill="#fff" />,
    title: 'Direct WhatsApp Orders',
    desc: 'Skip commissions. Every order arrives as a formatted WhatsApp message you can act on instantly.',
  },
  {
    icon: <StarIcon width={20} height={20} fill="#fff" />,
    title: 'Instant Billing & Receipts',
    desc: 'Generate and print 80mm thermal bills in one tap. GST, packing charges and tips handled for you.',
  },
  {
    icon: <UsersIcon width={20} height={20} fill="#fff" />,
    title: 'Team & User Management',
    desc: 'Give staff their own logins with scoped access. Owners keep full control of the store.',
  },
];

const Features: React.FC = () => (
  <section className={`${shell.section} ${local.section}`} id="features">
    <div className={shell.sectionInner}>
      <div className={shell.sectionHead}>
        <span className={shell.eyebrow}>Everything included</span>
        <h2 className={shell.title}>Run your whole shop from one place</h2>
        <p className={shell.lead}>
          From the first scan to the final receipt - Dozzelo handles the
          customer journey and the back office.
        </p>
      </div>

      <div className={local.grid}>
        {FEATURES.map((f) => (
          <div key={f.title} className={local.card}>
            <span className={local.icon}>{f.icon}</span>
            <h3 className={local.cardTitle}>{f.title}</h3>
            <p className={local.cardDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;