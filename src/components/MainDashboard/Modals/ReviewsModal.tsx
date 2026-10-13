// src/components/MainDashboard/Modals/ReviewsModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Tabs } from '../../ui';
import ReviewSettingsPanel from '../ReviewSettingsPanel';
import StoreWiseReviews from './reviews/StoreWiseReviews';
import DisputedReviews from './reviews/DisputedReviews';
import ResolvedReviews from './reviews/ResolvedReviews';
import local from './Modals.module.scss';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, the modal opens on the Disputed tab and highlights this row. */
  initialDisputeId?: string | null;
}

type TabKey = 'settings' | 'store' | 'disputed' | 'resolved';

const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  initialDisputeId = null,
}) => {
  const [tab, setTab] = useState<TabKey>('store');

  // If a dispute id is passed in, jump to the Disputed tab.
  useEffect(() => {
    if (isOpen && initialDisputeId) {
      setTab('disputed');
    }
  }, [isOpen, initialDisputeId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reviews" size="xl">
      <div className={local.reviewsHeader}>
        <Tabs<TabKey>
          block
          items={[
            { key: 'store', label: 'Store-wise' },
            { key: 'disputed', label: 'Disputed' },
            { key: 'resolved', label: 'Resolved' },
            { key: 'settings', label: 'Settings' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className={local.reviewsBody}>
        {tab === 'settings' && <ReviewSettingsPanel />}
        {tab === 'store' && <StoreWiseReviews />}
        {tab === 'disputed' && (
          <DisputedReviews focusDisputeId={initialDisputeId} />
        )}
        {tab === 'resolved' && <ResolvedReviews />}
      </div>
    </Modal>
  );
};

export default ReviewsModal;