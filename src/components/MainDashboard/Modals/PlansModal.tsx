// components/MainDashboard/Modals/PlansModal.tsx
import React from 'react';
import { Modal } from '../../ui';
import PlansModalBody from './PlansModalBody';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Subscription Plans"
    mobileFullScreen
    size="lg"
  >
    <PlansModalBody />
  </Modal>
);

export default PlansModal;