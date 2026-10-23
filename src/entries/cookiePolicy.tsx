// src/entries/cookiePolicy.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import LegalPage, { LegalSection } from '../components/Legal/LegalPage';
import PageLoader from '../components/Preloader/PageLoader';
import '../index.css';

const sections: LegalSection[] = [
  {
    heading: 'What Are Cookies',
    body: (
      <p>
        Cookies are small text files that are placed on your device when you
        visit a website. They are widely used to make websites work more
        efficiently, remember your preferences, and provide information to the
        site owners.
      </p>
    ),
  },
  {
    heading: 'How We Use Cookies',
    body: (
      <>
        <p>Dozzelo uses cookies for the following purposes:</p>
        <ul>
          <li>
            <strong>Essential cookies:</strong> Required for the platform to
            function - login sessions, cart persistence, store selection.
          </li>
          <li>
            <strong>Preference cookies:</strong> Remember your language, theme,
            and last-visited store.
          </li>
          <li>
            <strong>Analytics cookies:</strong> Help us understand how the
            platform is used so we can improve it.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: 'Managing Cookies',
    body: (
      <p>
        You can control and delete cookies through your browser settings. Note
        that disabling essential cookies may prevent you from logging in or
        using certain features of Dozzelo.
      </p>
    ),
  },
  {
    heading: 'Third-Party Cookies',
    body: (
      <p>
        We use a limited set of trusted third-party services (payment
        processors, analytics) that may set their own cookies. We do not sell
        your data to advertisers.
      </p>
    ),
  },
  {
    heading: 'Contact',
    body: (
      <p>
        Questions about our cookie policy? Reach us at{' '}
        <a href="mailto:ContactDozzelo@gmail.com">ContactDozzelo@gmail.com</a>.
      </p>
    ),
  },
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Cookies and Policies">
      <LegalPage
        eyebrow="Legal"
        title="Cookies and Policies"
        lastUpdated="1 January 2026"
        sections={sections}
      />
    </PageLoader>
  </React.StrictMode>,
);