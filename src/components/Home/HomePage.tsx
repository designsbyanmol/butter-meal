// components/Home/HomePage.tsx
import React, { useState } from 'react';
import { Button } from '../ui';
import { RightArrow } from '../../assets/svgs';
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
import local from './HomePage.module.scss';

interface HomePageProps {
  /**
   * Called when the user clicks "Create Free Store" or any other
   * signup-related CTA. Parent decides how to route.
   */
  onSignup: () => void;
  /**
   * Called when the user clicks "Try a sample store". Actual behavior
   * is TBD — parent decides.
   */
  onTrySample?: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onSignup, onTrySample }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeNav = () => setMobileNavOpen(false);

  return (
    <div className={local.page} id="top">
      <SiteHeader
        mobileNavOpen={mobileNavOpen}
        onToggleNav={() => setMobileNavOpen((v) => !v)}
        onCloseNav={closeNav}
        onSignup={onSignup}
      />

      <Hero onSignup={onSignup} onTrySample={onTrySample} />
      <Audience />
      <Features />
      <Workflow />
      <Vertical />
      <Plans onSignup={onSignup} />
      <Testimonials />
      <FAQ />
      <FinalCTA onSignup={onSignup} onTrySample={onTrySample} />

      <SiteFooter />
    </div>
  );
};

export default HomePage;