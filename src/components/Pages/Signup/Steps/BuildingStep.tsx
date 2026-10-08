// Components/Pages/Signup/Steps/BuildingStep.tsx
import React, { useEffect, useState } from 'react';
import { ProgressBar } from '../../../ui';
import local from '../Signup.module.scss';
import { CheckIcon } from '../../../../assets/svgs';

interface BuildingStepProps {
  storeName: string;
  onComplete: () => void;
  /** Seconds countdown, default 10. */
  seconds?: number;
}

const BuildingStep: React.FC<BuildingStepProps> = ({
  storeName,
  onComplete,
  seconds = 10,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (elapsed >= seconds) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setElapsed((e) => e + 1), 1000);
    return () => clearTimeout(t);
  }, [elapsed, seconds, onComplete]);

  const pct = Math.min(100, Math.round((elapsed / seconds) * 100));

  return (
    <div className={local.buildingWrap}>
      <div className={local.buildingCard}>
        <div className={local.successIcon}><CheckIcon
                              width={14}
                              height={14}
                              fill="#1e7e34"
                            /></div>
        <h2>Congratulations!</h2>
        <p className={local.buildingLead}>
          Your store <strong>{storeName}</strong> is being created.
        </p>
        <p className={local.buildingSub}>
          We're setting up your menu, settings, and dashboard. This will only
          take a few seconds.
        </p>

        <ProgressBar
          value={pct}
          size="lg"
          label={
            <>
              {pct}% . {Math.max(0, seconds - elapsed)}s remaining
            </>
          }
        />
      </div>
    </div>
  );
};

export default BuildingStep;