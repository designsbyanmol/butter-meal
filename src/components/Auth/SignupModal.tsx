// components/Auth/SignupModal.tsx (optional - disabled version)
import React from 'react';
import styles from './Auth.module.scss';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🔒</span>
        </div>
        <h2>Account Creation</h2>
        <div className={styles.disabledMessage}>
          <p>New accounts can only be created by the administrator.</p>
          <p>Please contact your admin for access.</p>
        </div>
        <button 
          className={styles.submitBtn}
          onClick={onSwitchToLogin}
          style={{ marginTop: '16px' }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default SignupModal;