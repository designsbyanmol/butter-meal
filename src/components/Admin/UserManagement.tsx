// components/Admin/UserManagement.tsx
import React from 'react';
import { Modal } from '../ui';
import UserManagementBody from './UserManagementBody';

interface UserManagementProps {
  onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => (
  <Modal
    isOpen={true}
    onClose={onClose}
    title="User Management"
    mobileFullScreen
    size="md"
  >
    <UserManagementBody onClose={onClose} />
  </Modal>
);

export default UserManagement;