// src/components/MainDashboard/DineinOrdersModal.tsx
import React from 'react';
import { Modal } from '../ui';
import DineinOrdersModalBody from './DineinOrdersModalBody';

interface DineinOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  focusOrderId?: string | null;
  mode?: 'admin' | 'staff';
}

const DineinOrdersModal: React.FC<DineinOrdersModalProps> = ({
  isOpen,
  onClose,
  focusOrderId = null,
  mode = 'admin',
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={mode === 'staff' ? 'Active Orders' : 'Order Placed'}
    mobileFullScreen
    disableBackdropClose={true}
    size="xl"
  >
    <DineinOrdersModalBody
      focusOrderId={focusOrderId}
      mode={mode}
      onClose={onClose}
    />
  </Modal>
);

export default DineinOrdersModal;