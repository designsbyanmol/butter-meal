// components/Admin/PauseRequestIcon.tsx
import React, { useState } from 'react';
import { planService } from '../../services/plan.service';
import { Modal, Button } from '../ui';
import local from './PauseRequestIcon.module.scss';

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
  const [error, setError] = useState('');

  const handle = async (accept: boolean) => {
    setIsSaving(true);
    setError('');
    const ok = await planService.resolvePauseRequest(requestId, accept);
    setIsSaving(false);
    if (ok) {
      setIsOpen(false);
      onResolved();
    } else {
      setError('Failed to resolve pause request');
    }
  };

  return (
    <>
      <button
        type="button"
        className={local.bell}
        onClick={() => setIsOpen(true)}
        title="Pause request pending"
        aria-label="Pause request pending"
      >
        🔔
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Pause Request"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              disabled={isSaving}
              onClick={() => handle(false)}
            >
              Reject
            </Button>
            <Button
              variant="danger"
              loading={isSaving}
              onClick={() => handle(true)}
            >
              Accept Pause
            </Button>
          </>
        }
      >
        <p className={local.body}>
          <strong>{tenantName}</strong> has requested to pause their store. If
          you accept, their plan will stop counting down and the store will be
          deactivated.
        </p>
        {error && <p className={local.error}>{error}</p>}
      </Modal>
    </>
  );
};

export default PauseRequestIcon;