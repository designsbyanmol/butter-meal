// components/Auth/LoginModal.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import styles from './Auth.module.scss';
import { CloseIcon } from '../../assets/svgs';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(phone, password);
    setIsLoading(false);

    if (result.success) {
      onClose();
      setPhone('');
      setPassword('');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Limit to 10 digits
    const limited = cleaned.slice(0, 10);
    setPhone(limited);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}><CloseIcon width={18} height={18} fill="#4d4d4d"/></button>
        <div className={styles.logo}>
          <span className={styles.logoIcon}><img src="https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/teckut-logo.webp" alt="teckut logo for management of restaurants" width="36"/></span>
        </div>
        <h2>Welcome!</h2>
        <p className={styles.subtitle}>Sign in to your restaurant account</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Phone Number</label>
            <div className={styles.phoneInput}>
              <span className={styles.countryCode}>+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => formatPhoneNumber(e.target.value)}
                required
                placeholder="Enter phone number"
                maxLength={10}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className={styles.helpText}>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              Only administrators can create new accounts
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;