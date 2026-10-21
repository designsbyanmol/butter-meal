// src/components/MainDashboard/Modals/StoresModal.tsx
import React from 'react';
import TenantManager from '../../Admin/TenantManager';

interface StoresModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StoresModal: React.FC<StoresModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <TenantManager onClose={onClose} />;
};

export default StoresModal;