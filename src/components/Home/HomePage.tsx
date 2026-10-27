// src/components/Home/HomePage.tsx
import React, { useState } from 'react';
import SiteHeader from './shared/SiteHeader';
import SiteFooter from './shared/SiteFooter';
import Hero from './sections/Hero';
import Audience from './sections/Audience';
import Features from './sections/Features';
import Workflow from './sections/Workflow';
import Vertical from './sections/Vertical';
import Plans from './sections/Plans';
import Testimonials from './sections/Testimonials';
import FAQ from './sections/FAQ';
import FinalCTA from './sections/FinalCTA';
import StoreLoginModal from '../Auth/StoreLoginModal'; // NEW IMPORT
import local from './HomePage.module.scss';

interface HomePageProps {
  onSignup: () => void;
  onTrySample?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSignup, onTrySample }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false); // NEW STATE

  const closeNav = () => setMobileNavOpen(false);

  const handleTrySample = () => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
  window.location.href = `${window.location.origin}${dir}contact.html`;
};

  return (
    <div className={local.page} id="top">
      <SiteHeader
        mobileNavOpen={mobileNavOpen}
        onToggleNav={() => setMobileNavOpen((v) => !v)}
        onCloseNav={closeNav}
        onStoreLogin={() => setIsLoginOpen(true)} // WIRED
      />

      <Hero 
        onSignup={onSignup} 
        onTrySample={handleTrySample} 
      />
      
      <Audience />
      <Features />
      <Workflow />
      <Vertical />
      <Plans onSignup={onSignup} />
      <Testimonials />
      <FAQ />
      <FinalCTA onSignup={onSignup} onTrySample={onTrySample} />

      <SiteFooter />

      {/* NEW MODAL */}
      <StoreLoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
      />
    </div>
  );
};

export default HomePage;