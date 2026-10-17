// components/Home/shared/SiteFooter.tsx
import React from 'react';
import local from '../HomePage.module.scss';

const SiteFooter: React.FC = () => (
  <footer className={local.footer}>
    <div className={local.footerInner}>
      <div className={local.footerGrid}>
        <div className={local.footerBrandCol}>
          <img
            src="https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp"
            alt="Dozzelo - Powered by Teckut"
            className={local.brandLogo}
            draggable={false}
            height={60}
            width={60}
          />
          <p className={local.footerBlurb}>
            Dozzelo helps cafes, restaurants, and shops launch a beautiful
            online catalogue, take orders on WhatsApp, and run their
            dine-in billing - all in one place.
          </p>
        </div>

        <div className={local.footerCol}>
          <h4>Product</h4>
          <a href="#features">Features</a>
          <a href="#workflow">How it Works</a>
          <a href="#plans">Plans</a>
          <a href="#vertical">Store Types</a>
        </div>

        <div className={local.footerCol}>
          <h4>Solutions</h4>
          <a href="#audience">Restaurants</a>
          <a href="#audience">Cafes & Bakeries</a>
          <a href="#audience">Grocery Shops</a>
          <a href="#audience">Boutiques</a>
        </div>

        <div className={local.footerCol}>
          <h4>Company</h4>
          <a href="#top">About</a>
          <a href="#top">Contact</a>
          <a href="#top">Partners</a>
          <a href="#top">Careers</a>
        </div>

        <div className={local.footerCol}>
          <h4>Legal</h4>
          <a href="#top">Privacy Policy</a>
          <a href="#top">Terms of Use</a>
          <a href="#top">Cookie Policy</a>
          <a href="#top">Security</a>
        </div>
      </div>

      <div className={local.footerBottom}>
        <span>© 2026 Dozzelo. All rights reserved.</span>
        <div className={local.footerLegal}>
          <a href="#top">Cookie Preferences</a>
          <a href="#top">Terms & Conditions</a>
          <a href="#top">Help & Support</a>
        </div>
      </div>
    </div>
  </footer>
);

export default SiteFooter;