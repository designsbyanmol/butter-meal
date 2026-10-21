// components/MainDashboard/ReviewsAdminModal.tsx
import React, { useState} from 'react';
import { Modal } from '../ui';
import ReviewsAdminModalBody from './ReviewsAdminModalBody';

interface FocusDispute {
  disputeId: string;
  reviewId: string;
  outcome: 'deleted' | 'rejected';
  reviewItemName: string | null;
}

interface ReviewsAdminModalProps {
  onClose: () => void;
  focusDispute?: FocusDispute | null;
}

const ReviewsAdminModal: React.FC<ReviewsAdminModalProps> = ({
  onClose,
  focusDispute = null,
}) => {
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Reviews"
      headerRight={headerActions}
      disableBackdropClose={true}
      size="xl"
      mobileFullScreen
    >
      <ReviewsAdminModalBody
        focusDispute={focusDispute}
        embedded
        onHeaderActionsChange={setHeaderActions}
      />
    </Modal>
  );
};

export default ReviewsAdminModal;