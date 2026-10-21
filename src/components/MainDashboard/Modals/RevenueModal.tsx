// src/components/MainDashboard/Modals/RevenueModal.tsx
import React from 'react';
import { Modal } from '../../ui';
import RevenueBody from '../RevenueBody';

interface RevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RevenueModal: React.FC<RevenueModalProps> = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Revenue & Billing"
    size="xl"
    mobileFullScreen
    disableBackdropClose={true}
  >
    <RevenueBody />
  </Modal>
);

export default RevenueModal;