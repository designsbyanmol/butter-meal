// src/entries/privacyPolicy.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import LegalPage, { LegalSection } from '../components/Legal/LegalPage';
import PageLoader from '../components/Preloader/PageLoader';
import '../index.css';

const sections: LegalSection[] = [
  {
    heading: 'Information We Collect',
    body: (
      <>
        <p>When you use Dozzelo, we may collect:</p>
        <ul>
          <li>
            <strong>Account information:</strong> Store name, owner name, phone
            number, and password (hashed).
          </li>
          <li>
            <strong>Order information:</strong> Items ordered, totals, delivery
            type, and WhatsApp customer name.
          </li>
          <li>
            <strong>Device information:</strong> Browser, device type, and a
            hashed fingerprint used to prevent duplicate reviews.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: 'How We Use Your Information',
    body: (
      <ul>
        <li>To operate your store and process orders.</li>
        <li>To provide customer support and respond to enquiries.</li>
        <li>To improve the platform and prevent abuse.</li>
        <li>To comply with legal obligations.</li>
      </ul>
    ),
  },
  {
    heading: 'What We Do Not Do',
    body: (
      <ul>
        <li>We do not sell your personal data.</li>
        <li>We do not share customer data with advertisers.</li>
        <li>
          We do not read WhatsApp messages - they go directly from the customer
          to the store.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Data Retention',
    body: (
      <p>
        Order and invoice records are retained for as long as required by
        applicable tax laws. Account data is retained until you delete your
        store. You may request deletion of your account at any time.
      </p>
    ),
  },
  {
    heading: 'Your Rights',
    body: (
      <p>
        You have the right to access, correct, or delete your personal data.
        Contact us at{' '}
        <a href="mailto:ContactDozzelo@gmail.com">ContactDozzelo@gmail.com</a>{' '}
        to exercise these rights.
      </p>
    ),
  },
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Privacy Policy">
      <LegalPage
        eyebrow="Privacy"
        title="Privacy Policy"
        lastUpdated="1 January 2026"
        sections={sections}
      />
    </PageLoader>
  </React.StrictMode>,
);