// components/Home/sections/FinalCTA.tsx
import React from 'react';
import { Button } from '../../ui';
import { RightArrow, CheckIcon } from '../../../assets/svgs';
import local from './FinalCTA.module.scss';

interface FinalCTAProps {
  onSignup: () => void;
  onTrySample?: () => void;
}

const FinalCTA: React.FC<FinalCTAProps> = ({ onSignup, onTrySample }) => (
  <section className={local.cta} id="cta">
    <div className={local.ctaInner}>
      <div className={local.left}>
        <h2 className={local.title}>
          Ready to put your shop online?
        </h2>
        <p className={local.lead}>
          Sign up free and have your store, menu, QR and WhatsApp
          ordering live in minutes. Upgrade only when you're ready.
        </p>

        <div className={local.actions}>
          <Button
            size="lg"
            onClick={onSignup}
          >
            Create Free Store
          </Button>
        </div>
      </div>

      <div className={local.right}>
        <h3 className={local.rightTitle}>What you get on signup</h3>
        <ul className={local.list}>
          {[
            'Rs1 for first month Any Plan',
            'Your store URL + QR',
            'No card, cancel anytime',
          ].map((line) => (
            <li key={line}>
              <CheckIcon width={14} height={14} fill="#3caa46" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className={local.foot}>
          <span>Setup time . 5 minutes</span>
          <span>Free for 30 days</span>
        </div>
      </div>
    </div>
  </section>
);

export default FinalCTA;