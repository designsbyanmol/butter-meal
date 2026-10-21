// src/components/Store/StoreModal.tsx
import React from 'react';
import { Modal } from '../ui';
import { useStore } from '../../contexts/StoreContext';
import StoreModalBody from './StoreModalBody';
import local from './Store.module.scss';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StoreModal: React.FC<StoreModalProps> = ({ isOpen, onClose }) => {
  const { storeSettings } = useStore();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      disableBackdropClose={true}
      title={
        <>
          Store Management
          <span
            className={`${local.statusPill} ${
              storeSettings.isOpen ? local.open : local.closed
            }`}
          >
            {storeSettings.isOpen ? 'Open' : 'Closed'}
          </span>
        </>
      }
      size="sm"
    >
      <StoreModalBody onClose={onClose} />
    </Modal>
  );
};

export default StoreModal;