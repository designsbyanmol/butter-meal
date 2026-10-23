// src/components/Legal/LegalPage.tsx
import React from 'react';
import { LeftArrowIcon } from '../../assets/svgs';
import local from './LegalPage.module.scss';

export interface LegalSection {
  heading?: string;
  body: React.ReactNode;
}

export interface LegalPageProps {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const LOGO_URL =
  'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp';

const LegalPage: React.FC<LegalPageProps> = ({
  eyebrow,
  title,
  lastUpdated,
  sections,
}) => {
  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = '/';
  };

  return (
    <div className={local.page}>
      <header className={local.header}>
        <div className={local.headerInner}>
          <a href="/" className={local.brand} onClick={goHome}>
            <img
              src={LOGO_URL}
              alt="Dozzelo"
              className={local.brandLogo}
              draggable={false}
            />
          </a>

          <div className={local.headerActions}>
            <a href="/" className={local.backLink} onClick={goHome}>
              <LeftArrowIcon width={16} height={16} fill="#1e1e1e" />
              Back to home
            </a>
          </div>
        </div>
      </header>

      <main className={local.main}>
        <div className={local.inner}>
          <span className={local.eyebrow}>{eyebrow}</span>
          <h1 className={local.title}>{title}</h1>
          <span className={local.lastUpdated}>
            Last updated: {lastUpdated}
          </span>

          <div className={local.content}>
            {sections.map((s, i) => (
              <section key={i}>
                {s.heading && <h2>{s.heading}</h2>}
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className={local.footer}>
        <div className={local.footerInner}>
          <span>© 2026 Dozzelo. All rights reserved.</span>
          <div className={local.footerLinks}>
            <a href="/privacy.html">Privacy</a>
            <a href="/terms.html">Terms</a>
            <a href="/cookies.html">Cookies</a>
            <a href="/security.html">Security</a>
            <a href="/contact.html">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalPage;