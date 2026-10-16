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
          ordering live in minutes. Upgrade only when you&apos;re ready.
        </p>

        <div className={local.actions}>
          <Button
            size="lg"
            onClick={onSignup}
            rightIcon={<RightArrow width={16} height={16} fill="#fff" />}
          >
            Create Your Free Store
          </Button>
          {onTrySample && (
            <Button
              size="lg"
              variant="ghost"
              onClick={onTrySample}
              rightIcon={<RightArrow width={16} height={16} fill="#1e7e34" />}
            >
              Explore a Sample Store
            </Button>
          )}
        </div>
      </div>

      <div className={local.right}>
        <h3 className={local.rightTitle}>What you get on signup</h3>
        <ul className={local.list}>
          {[
            'Your own store URL + QR code',
            'Unlimited menu items during the free month',
            'WhatsApp ordering enabled by default',
            'Access to billing, dine-in and reviews whenever you upgrade',
            'No credit card, no setup fee, cancel anytime',
          ].map((line) => (
            <li key={line}>
              <CheckIcon width={14} height={14} fill="#3caa46" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className={local.foot}>
          <span>Setup time · 5 minutes</span>
          <span>Free for 30 days</span>
        </div>
      </div>
    </div>
  </section>
);

export default FinalCTA;