// src/components/Admin/TenantManager.tsx
import React from 'react';
import { Modal } from '../ui';
import TenantManagerBody from './TenantManagerBody';

interface TenantManagerProps {
  onClose: () => void;
}

const TenantManager: React.FC<TenantManagerProps> = ({ onClose }) => (
  <Modal
    isOpen={true}
    onClose={onClose}
    disableBackdropClose={true}
    mobileFullScreen
    size="xl"
    title="Manage Stores"
  >
    <TenantManagerBody />
  </Modal>
);

export default TenantManager;