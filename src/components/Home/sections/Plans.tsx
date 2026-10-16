// components/Home/sections/Plans.tsx
import React, { useState } from 'react';
import { Button, Badge } from '../../ui';
import { RightArrow, CheckIcon } from '../../../assets/svgs';
import {
  PLAN_DISPLAY_PRICES,
  getPlanDefinition,
} from '../../../data/plans';
import PlanDetailModal from '../../Payments/PlanDetailModal';
import local from './Plans.module.scss';
import shell from '../HomePage.module.scss';

interface PlansProps {
  onSignup: () => void;
}

const PLAN_ORDER = ['basic', 'dynamic', 'professional'];

const PLAN_NAMES: Record<string, string> = {
  basic: 'Basic',
  dynamic: 'Dynamic',
  professional: 'Professional',
};

const Plans: React.FC<PlansProps> = ({ onSignup }) => {
  const [detailId, setDetailId] = useState<string | null>(null);

  return (
    <section className={`${shell.section} ${local.section}`} id="plans">
      <div className={shell.sectionInner}>
        <div className={shell.sectionHead}>
          <span className={shell.eyebrow}>Simple pricing</span>
          <h2 className={shell.title}>Plans that grow with your shop</h2>
          <p className={shell.lead}>
            Start your first month for just ₹1. Pay full price only when
            you renew. Cancel anytime.
          </p>
        </div>

        <div className={local.grid}>
          {PLAN_ORDER.map((id) => {
            const def = getPlanDefinition(id);
            const price = PLAN_DISPLAY_PRICES[id];
            const name = PLAN_NAMES[id] ?? id;
            const isHighlight = def.featured === true;

            return (
              <div
                key={id}
                className={`${local.card} ${
                  isHighlight ? local.cardHighlight : ''
                }`}
              >
                {isHighlight && (
                  <span className={local.popularRibbon}>Most popular</span>
                )}

                <div className={local.cardHead}>
                  <h3 className={local.planName}>{name}</h3>
                  {isHighlight && (
                    <Badge tone="success" size="sm">Best value</Badge>
                  )}
                </div>

                <p className={local.planTagline}>{def.tagline}</p>

                <div className={local.promoPrice}>
                  <span className={local.promoStrike}>
                    ₹{price}
                  </span>
                  <span className={local.promoBig}>₹1</span>
                  <span className={local.promoUnit}>
                    first month
                  </span>
                </div>
                <p className={local.promoNote}>
                  Then ₹{price}/month from month 2
                </p>

                <ul className={local.features}>
                  {def.included.slice(0, 5).map((f) => (
                    <li key={f}>
                      <CheckIcon
                        width={14}
                        height={14}
                        fill={isHighlight ? '#1e7e34' : '#3caa46'}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={local.detailLink}
                  onClick={() => setDetailId(id)}
                >
                  See everything included
                </button>

                <Button
                  block
                  variant={isHighlight ? 'primary' : 'secondary'}
                  onClick={onSignup}
                  rightIcon={
                    <RightArrow
                      width={16}
                      height={16}
                      fill={isHighlight ? '#fff' : '#1e7e34'}
                    />
                  }
                >
                  Start for ₹1
                </Button>
              </div>
            );
          })}
        </div>

        <p className={local.footnote}>
          ₹1 for your first month on any plan. Renew at the regular price.
          No lock-in.
        </p>
      </div>

      <PlanDetailModal
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        planId={detailId ?? ''}
        planName={detailId ? PLAN_NAMES[detailId] ?? detailId : ''}
        monthlyPrice={detailId ? PLAN_DISPLAY_PRICES[detailId] : undefined}
        firstMonthPromo
        onPrimaryAction={
          detailId
            ? {
                label: `Start ${PLAN_NAMES[detailId] ?? detailId} for ₹1`,
                onClick: () => {
                  setDetailId(null);
                  onSignup();
                },
              }
            : undefined
        }
      />
    </section>
  );
};

export default Plans;