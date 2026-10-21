// components/Home/sections/Hero.tsx
import React from 'react';
import { Button, Badge } from '../../ui';
import { RightArrow, CheckIcon, UpArrowIcon } from '../../../assets/svgs';
import local from './Hero.module.scss';

interface HeroProps {
  onSignup: () => void;
  onTrySample?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onSignup, onTrySample }) => (
  <section className={local.hero}>
    <div className={local.heroInner}>
      <div className={local.eyebrowRow}>
        <Badge tone="primary" size="md">Direct Launch</Badge>
        <span className={local.eyebrowText}>
          No app downloads . Works on any phone
        </span>
      </div>

      <h1 className={local.title}>
        Launch your <span className={local.accent}>online store</span>,
        <br />
        menu &amp; dine-in billing - in minutes.
      </h1>

      <p className={local.lead}>
        Create a beautiful digital catalogue, share it via a QR code, and
        take orders directly on WhatsApp. Perfect for restaurants, cafes,
        bakeries, grocery shops, boutiques and more.
      </p>

      <div className={local.ctas}>
        <Button
          size="lg"
          shape="pill"
          onClick={onSignup}
        >
          Create Your Free Store
        </Button>
        {onTrySample && (
          <Button
            size="lg"
            shape="pill"
            variant="ghost"
            onClick={onTrySample}
          >
            Try a Sample Store
          </Button>
        )}
      </div>

      <div className={local.promise}>
        {[
          'Free to start',
          'No credit card',
          'Instant QR menu',
        ].map((p) => (
          <span key={p} className={local.promiseItem}>
            <CheckIcon width={14} height={14} fill="#1e7e34" />
            {p}
          </span>
        ))}
      </div>

      {/* Product preview */}
      <div className={local.preview}>
        <div className={local.previewBar}>
          <span className={local.trafficDots}>
            <i className={local.dotRed} />
            <i className={local.dotYellow} />
            <i className={local.dotGreen} />
          </span>
          <span className={local.previewUrl}>
            yourstore.Dozzelo.app - Live
          </span>
          <span className={local.previewLive}>
            <i className={local.liveDot} />
            Orders flowing in
          </span>
        </div>

        <div className={local.previewGrid}>
          <div className={local.previewCard}>
            <span className={local.previewLabel}>Today</span>
            <span className={local.previewBig}>68</span>
            <span className={local.previewSub}>Orders received</span>
            <div className={local.barRow}>
              <span>Via Dine-in</span>
            </div>
            <div className={local.barTrack}>
              <div className={local.barFill} style={{ width: '66%' }} />
            </div>
          </div>

          <div className={local.previewCard}>
            <span className={local.previewLabel}>Live Menu QR Scans</span>
            <span className={local.previewLiveSmall}>Peak hour traffic</span>
            <div className={local.sparkRow}>
              {[42, 68, 55, 90, 78, 62, 88].map((h, i) => (
                <span
                  key={i}
                  className={local.sparkBar}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <span className={local.previewFoot}>
              280 scaned and open . 24% add-to-cart
            </span>
          </div>

          <div className={local.previewCard}>
            <span className={local.previewLabel}>Today's Sales</span>
            <span className={local.previewBigAlt}>Rs24,860</span>
            <span className={local.previewSub}>
              Online + cash combined
            </span>
            <Badge tone="success" size="md">
              <UpArrowIcon width={14} height={14}/> +18% vs yesterday
            </Badge>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;