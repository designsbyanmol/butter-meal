// pages/Signup/Steps/PlanStep.tsx
import React from 'react';
import { Plan } from '../../../../types';
import { formatRupees } from '../../../../utils/subscription';
import styles from '../Signup.module.scss';
import { CheckIcon } from '../../../../assets/svgs';

interface PlanStepProps {
  plans: Plan[];
  plansLoading?: boolean;
  plansError?: string;
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const PlanStep: React.FC<PlanStepProps> = ({
  plans,
  plansLoading = false,
  plansError = '',
  selectedPlanId,
  onSelect,
  onContinue,
  onBack,
}) => {
  // ---------- Loading state ----------
  if (plansLoading) {
    return (
      <div className={styles.stepWrap}>
        <div className={styles.stepHeader}>
          <h2>Loading plans...</h2>
          <p>Fetching the latest subscription options for you.</p>
        </div>
        <div className={styles.planGrid}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`${styles.planCard} ${styles.planCardSkeleton}`}
            >
              <div className={styles.skelLine} style={{ width: '40%' }} />
              <div className={styles.skelLine} style={{ width: '60%' }} />
              <div className={styles.skelLine} style={{ width: '80%' }} />
              <div className={styles.skelLine} style={{ width: '70%' }} />
              <div className={styles.skelLine} style={{ width: '55%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Error state ----------
  if (plansError) {
    return (
      <div className={styles.stepWrap}>
        <div className={styles.stepHeader}>
          <h2>Could not load plans</h2>
          <p>{plansError}</p>
        </div>
        <div className={styles.errorBanner}>
          Please refresh the page or contact support if this persists.
        </div>
        <div className={styles.stepActions}>
          <button type="button" className={styles.ghostBtn} onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ---------- Empty state ----------
  if (plans.length === 0) {
    return (
      <div className={styles.stepWrap}>
        <div className={styles.stepHeader}>
          <h2>No plans available</h2>
          <p>
            Subscription plans haven't been configured yet. Please contact
            support.
          </p>
        </div>
        <div className={styles.stepActions}>
          <button type="button" className={styles.ghostBtn} onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ---------- Normal state ----------
  return (
    <div className={styles.stepWrap}>
      <div className={styles.stepHeader}>
        <h2>Choose your plan</h2>
        <p>You can change it anytime later.</p>
      </div>

      <div className={styles.planGrid}>
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          const isProfessional = plan.id === 'professional';
          return (
            <div
              key={plan.id}
              className={[
                styles.planCard,
                isSelected ? styles.planCardSelected : '',
                isProfessional ? styles.planCardFeatured : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(plan.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(plan.id);
                }
              }}
            >
              {isProfessional && (
                <div className={styles.featuredTag}>Most Popular</div>
              )}

              <h3>{plan.name}</h3>
              <div className={styles.planPrice}>
                {formatRupees(plan.monthlyPrice)}
                <span>/month</span>
              </div>
              <p className={styles.planDesc}>{plan.description}</p>

              <ul className={styles.planFeatures}>
                {plan.id === 'basic' && (
                  <>
                    <li>✅ Menu display only</li>
                    <li>✅ Editable menu items</li>
                    <li>❌ No ordering</li>
                    <li>❌ No reviews</li>
                    <li>❌ No wishlist</li>
                  </>
                )}
                {plan.id === 'dynamic' && (
                  <>
                    <li>✅ Everything in Basic</li>
                    <li>✅ WhatsApp ordering</li>
                    <li>✅ Add-to-cart &amp; message field</li>
                    <li>✅ Edit Fields &amp; Store Manager</li>
                    <li>❌ No reviews</li>
                  </>
                )}
                {plan.id === 'professional' && (
                  <>
                    <li>✅ Everything in Dynamic</li>
                    <li>✅ Reviews &amp; ratings</li>
                    <li>✅ Wishlist</li>
                    <li>✅ User management</li>
                    <li>✅ Premium support</li>
                  </>
                )}

                {/* Fallback for any custom plan IDs the platform may add */}
                {plan.id !== 'basic' &&
                  plan.id !== 'dynamic' &&
                  plan.id !== 'professional' && (
                    <>
                      {plan.features?.canOrder && (
                        <li>✅ WhatsApp ordering</li>
                      )}
                      {plan.features?.canReview && <li>✅ Reviews</li>}
                      {plan.features?.canWishlist && <li>✅ Wishlist</li>}
                    </>
                  )}
              </ul>

              {isSelected && (
                <div className={styles.selectedIndicator}><CheckIcon width={16} height={16} fill="#1e7e34" /> Selected</div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.stepActions}>
        <button type="button" className={styles.ghostBtn} onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={onContinue}
          disabled={!selectedPlanId}
        >
          Continue to payment RightArrowHoga
        </button>
      </div>
    </div>
  );
};

export default PlanStep;