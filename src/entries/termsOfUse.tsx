// src/entries/termsOfUse.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import LegalPage, { LegalSection } from '../components/Legal/LegalPage';
import PageLoader from '../components/Preloader/PageLoader';
import '../index.css';

const sections: LegalSection[] = [
  {
    heading: 'Acceptance of Terms',
    body: (
      <p>
        By creating a store on Dozzelo, you agree to these terms. If you do not
        agree, do not use the platform.
      </p>
    ),
  },
  {
    heading: 'Your Account',
    body: (
      <ul>
        <li>
          You are responsible for keeping your login credentials safe. Do not
          share your admin password.
        </li>
        <li>
          You may create staff accounts, but you remain responsible for all
          activity under your store.
        </li>
        <li>
          You must be at least 18 years old and legally allowed to run a
          business in your region.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Acceptable Use',
    body: (
      <>
      <p>You agree not to use Dozzelo to:</p>
      <ul>
        <li>Break any applicable law or regulation.</li>
        <li>Process illegal, prohibited, or counterfeit goods.</li>
        <li>Abuse, threaten, or harass any other user.</li>
        <li>Attempt to gain unauthorised access to other stores' data.</li>
      </ul>
      </>
    ),
  },
  {
    heading: 'Payments and Subscriptions',
    body: (
      <ul>
        <li>
          Plans are billed monthly (or per the duration you select) in advance.
        </li>
        <li>
          The promotional first-month price is available once per store. Renewal
          and upgrades are charged at the regular price.
        </li>
        <li>
          Subscription fees are non-refundable. Remaining days are forfeited on
          pause, unless a renewal reactivates the store.
        </li>
      </ul>
    ),
  },
  {
    heading: 'Store Content',
    body: (
      <p>
        You own the content (menu items, images, descriptions) you upload. You
        are responsible for ensuring you have the right to use any images you
        upload. We may remove content that violates these terms.
      </p>
    ),
  },
  {
    heading: 'Termination',
    body: (
      <p>
        You can delete your store at any time. We may suspend or terminate
        accounts that violate these terms or are used for fraud.
      </p>
    ),
  },
  {
    heading: 'Limitation of Liability',
    body: (
      <p>
        Dozzelo is provided "as is". We are not liable for any indirect,
        incidental, or consequential damages arising from your use of the
        platform, to the maximum extent permitted by law.
      </p>
    ),
  },
  {
    heading: 'Changes to These Terms',
    body: (
      <p>
        We may update these terms from time to time. Continued use of the
        platform after a change constitutes acceptance of the updated terms.
      </p>
    ),
  },
  {
    heading: 'Contact',
    body: (
      <p>
        Questions? Reach us at{' '}
        <a href="mailto:ContactDozzelo@gmail.com">ContactDozzelo@gmail.com</a>.
      </p>
    ),
  },
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Terms of Use">
      <LegalPage
        eyebrow="Terms"
        title="Terms of Use"
        lastUpdated="1 January 2026"
        sections={sections}
      />
    </PageLoader>
  </React.StrictMode>,
);