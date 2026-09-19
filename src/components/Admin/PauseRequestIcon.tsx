// components/Admin/PauseRequestIcon.tsx
import React, { useState } from 'react';
import { planService } from '../../services/plan.service';
import { CloseIcon } from '../../assets/svgs';
import styles from './TenantManager.module.scss';

interface PauseRequestIconProps {
  requestId: string;
  tenantName: string;
  onResolved: () => void;
}

const PauseRequestIcon: React.FC<PauseRequestIconProps> = ({
  requestId,
  tenantName,
  onResolved,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handle = async (accept: boolean) => {
    setIsSaving(true);
    const ok = await planService.resolvePauseRequest(requestId, accept);
    setIsSaving(false);
    if (ok) {
      setIsOpen(false);
      onResolved();
    } else {
      alert('Failed to resolve pause request');
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.pauseBell}
        onClick={() => setIsOpen(true)}
        title="Pause request pending"
        aria-label="Pause request pending"
      >
        🔔
      </button>

      {isOpen && (
        <div
          className={styles.planDialogOverlay}
          onClick={() => setIsOpen(false)}
        >
          <div
            className={styles.planDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.planDialogHeader}>
              <h4>Pause Request</h4>
              <button
                type="button"
                className={styles.confirmCloseBtn}
                onClick={() => setIsOpen(false)}
              >
                <CloseIcon width={16} height={16} fill="#4d4d4d" />
              </button>
            </div>

            <div className={styles.planDialogBody}>
              <p style={{ margin: 0, fontSize: 14, color: '#4d4d4d' }}>
                <strong>{tenantName}</strong> has requested to pause their
                store. If you accept, their plan will stop counting down and
                the store will be deactivated.
              </p>
            </div>

            <div className={styles.planDialogFooter}>
              <button
                type="button"
                className={styles.ghostBtn}
                disabled={isSaving}
                onClick={() => handle(false)}
              >
                Reject
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                disabled={isSaving}
                onClick={() => handle(true)}
              >
                {isSaving ? 'Saving...' : 'Accept Pause'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PauseRequestIcon;