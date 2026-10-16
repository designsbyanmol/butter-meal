// components/MainDashboard/Modals/ReviewsModal.tsx
import React from 'react';
import { Modal } from '../../ui';
import ReviewsModalBody from './ReviewsModalBody';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDisputeId?: string | null;
}

const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  initialDisputeId = null,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Reviews"
    size="xl"
    mobileFullScreen
  >
    <ReviewsModalBody initialDisputeId={initialDisputeId} />
  </Modal>
);

export default ReviewsModal;