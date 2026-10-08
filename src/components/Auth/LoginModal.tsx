// components/Auth/LoginModal.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Modal, Button, Input, FormField, Banner } from '../ui';
import local from './Auth.module.scss';

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

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (error) setError('');
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      hideCloseButton={false}
      title={
        <span className={local.modalTitle}>
          <img
            src="https://cdn.jsdelivr.net/gh/designsbyanmol/butter-meal@main/src/assets/images/teckut-logo.webp"
            alt="teckut logo for management of restaurants"
            width="22"
          />
          Welcome!
        </span>
      }
    >
      <p className={local.subtitle}>Sign in to your restaurant account</p>

      <form onSubmit={handleSubmit} className={local.form}>
        <FormField label="Phone Number" required>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="Enter phone number"
            maxLength={10}
            disabled={isLoading}
            required
            leftIcon={<span className={local.countryCode}>+91</span>}
          />
        </FormField>

        <FormField label="Password" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            placeholder="Enter your password"
            disabled={isLoading}
            required
          />
        </FormField>

        {error && (
          <Banner
            variant="error"
            inline
            onDismiss={() => setError('')}
          >
            {error}
          </Banner>
        )}

        <Button
          type="submit"
          block
          loading={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <p className={local.helpText}>
        Only administrators can create new accounts
      </p>
    </Modal>
  );
};

export default LoginModal;