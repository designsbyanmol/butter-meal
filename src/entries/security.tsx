// src/entries/security.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import LegalPage, { LegalSection } from '../components/Legal/LegalPage';
import PageLoader from '../components/Preloader/PageLoader';
import '../index.css';

const sections: LegalSection[] = [
  {
    heading: 'Our Commitment',
    body: (
      <p>
        We take the security of your store and customer data seriously.
        Dozzelo is built on infrastructure that is trusted by production
        applications worldwide.
      </p>
    ),
  },
  {
    heading: 'Encryption',
    body: (
      <ul>
        <li>All data in transit is encrypted via HTTPS / TLS 1.2+.</li>
        <li>Passwords are hashed with bcrypt and never stored in plain text.</li>
        <li>
          Payment processing is handled by PCI-DSS-compliant partners (Razorpay
          / UPI). We never see or store card numbers.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Authentication',
    body: (
      <ul>
        <li>Per-store login sessions are isolated from each other.</li>
        <li>
          After 3 failed attempts, logins are locked for 1 hour. Attempts are
          logged per store and per phone.
        </li>
        <li>
          Admin actions on the tenant are always tenant-scoped - one store can
          never access another store's data.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Data Access',
    body: (
      <p>
        Database access is controlled by row-level security policies. Public
        (customer) access is limited to read-only data necessary to display the
        menu. Writes happen through server-side RPCs with strict validation.
      </p>
    ),
  },
  {
    heading: 'Incident Reporting',
    body: (
      <p>
        If you believe your account has been compromised, contact us
        immediately at{' '}
        <a href="mailto:ContactDozzelo@gmail.com">ContactDozzelo@gmail.com</a>.
        We will investigate and respond within 24 hours.
      </p>
    ),
  },
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Security">
      <LegalPage
        eyebrow="Security"
        title="Security at Dozzelo"
        lastUpdated="1 January 2026"
        sections={sections}
      />
    </PageLoader>
  </React.StrictMode>,
);