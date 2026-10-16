// components/MainDashboard/ReviewsAdminModal.tsx
import React from 'react';
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
}) => (
  <Modal
    isOpen={true}
    onClose={onClose}
    title="Reviews"
    size="xl"
    mobileFullScreen
  >
    <ReviewsAdminModalBody
      focusDispute={focusDispute}
      onClose={onClose}
    />
  </Modal>
);

export default ReviewsAdminModal;