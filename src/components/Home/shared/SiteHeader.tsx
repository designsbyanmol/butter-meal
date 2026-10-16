// components/Home/shared/SiteHeader.tsx
import React from 'react';
import { Button } from '../../ui';
import { RightArrow } from '../../../assets/svgs';
import local from '../HomePage.module.scss';

interface SiteHeaderProps {
  mobileNavOpen: boolean;
  onToggleNav: () => void;
  onCloseNav: () => void;
  onSignup: () => void;
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#workflow' },
  { label: 'Plans', href: '#plans' },
  { label: 'Who It\'s For', href: '#audience' },
  { label: 'FAQ', href: '#faq' },
];

const SiteHeader: React.FC<SiteHeaderProps> = ({
  mobileNavOpen,
  onToggleNav,
  onCloseNav,
  onSignup,
}) => (
  <header className={local.header}>
    <div className={local.headerInner}>
      <a href="#top" className={local.headerBrand} onClick={onCloseNav}>
        <span className={local.brand}>
          <span className={local.brandMark} aria-hidden />
          <span className={local.brandName}>avoca</span>
        </span>
      </a>

      <nav className={`${local.nav}`}>
        {NAV_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className={local.navLink}
            onClick={onCloseNav}
          >
            {l.label}
          </a>
        ))}
      </nav>

      <div className={local.headerActions}>
        <Button
          size="sm"
          onClick={onSignup}
          rightIcon={<RightArrow width={14} height={14} fill="#fff" />}
        >
          Create Free Store
        </Button>
      </div>

      <button
        type="button"
        className={local.burger}
        onClick={onToggleNav}
        aria-label="Toggle navigation"
        aria-expanded={mobileNavOpen}
      >
        <span
          className={`${local.burgerLine} ${
            mobileNavOpen ? local.burgerLineOpenTop : ''
          }`}
        />
        <span
          className={`${local.burgerLine} ${
            mobileNavOpen ? local.burgerLineOpenMid : ''
          }`}
        />
        <span
          className={`${local.burgerLine} ${
            mobileNavOpen ? local.burgerLineOpenBot : ''
          }`}
        />
      </button>
    </div>

    {mobileNavOpen && (
      <div className={local.mobileNav}>
        {NAV_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            className={local.mobileNavLink}
            onClick={onCloseNav}
          >
            {l.label}
          </a>
        ))}
        <Button
          block
          onClick={() => {
            onCloseNav();
            onSignup();
          }}
          rightIcon={<RightArrow width={16} height={16} fill="#fff" />}
        >
          Create Free Store
        </Button>
      </div>
    )}
  </header>
);

export default SiteHeader;