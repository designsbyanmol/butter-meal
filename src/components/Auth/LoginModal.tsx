// components/Auth/LoginModal.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { Modal, Button, Input, Banner } from '../ui';
import ContactAdminModal from './ContactAdminModal';
import { EyeIcon, EyeOffIcon, RightArrow } from '../../assets/svgs';
import { authService } from '../../services/auth.service';
import local from './Auth.module.scss';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceOpen?: boolean;
  onLoginSuccess?: (info: { userName: string; storeName?: string }) => void;
}

/** Where the "Contact admin" link points. */
const ADMIN_EMAIL = 'admin@dozzelo.com';

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  forceOpen = false,
  onLoginSuccess,
}) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const { login } = useAuth();
  const { tenant } = useTenant();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(phone, password);
    setIsLoading(false);

    if (result.success) {
      const currentUser = authService.getCurrentUser();
    const userName = currentUser?.name?.trim() || 'there';

    onLoginSuccess?.({
      userName,
      storeName: tenant?.displayName || undefined,
    });

    onClose();
    setPhone('');
    setPassword('');
    setShowPassword(false);
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value.slice(0, 120));
    if (error) setError('');
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError('');
  };

  // When forceOpen, ignore any attempt to close from outside — the
  // X is hidden, backdrop is disabled, Esc is disabled.
  const handleClose = forceOpen ? () => {} : onClose;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        mobileFullScreen
        size="sm"
        className={local.loginModal}
        hideCloseButton={forceOpen}
        disableBackdropClose={forceOpen}
      >
        <div className={local.loginWrap}>
          {/* ---------- Store identity ---------- */}
          {tenant?.displayName && (
            <div className={local.storeBlock}>
              <span className={local.storeLabel}>Signing in to</span>
              <span className={local.storeName}>{tenant.displayName}</span>
            </div>
          )}

          {/* ---------- Form ---------- */}
          <form onSubmit={handleSubmit} className={local.form}>
            <Input
              type="text"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="Phone number / email Address"
              disabled={isLoading}
              required
              autoComplete="username"
              inputSize="md"
              className={`${local.fieldInput} ${local.fieldPhone}`}
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Password"
              disabled={isLoading}
              required
              autoComplete="current-password"
              inputSize="md"
              className={`${local.fieldInput} ${local.fieldPass}`}
              rightIcon={
                <button
                  type="button"
                  className={local.eyeBtn}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOffIcon width={20} height={20} fill="#b3b3b3" />
                  ) : (
                    <EyeIcon width={20} height={20} fill="#b3b3b3" />
                  )}
                </button>
              }
            />

            {error && (
              <Banner variant="error" inline onDismiss={() => setError('')}>
                {error}
              </Banner>
            )}

            <div className={local.submitRow}>
              <Button
                type="submit"
                loading={isLoading}
                size="md"
                variant="primary"
                className={local.loginBtn}
                rightIcon={
                  !isLoading ? (
                    <RightArrow width={18} height={18} fill="#fff" />
                  ) : undefined
                }
              >
                {isLoading ? 'Signing in...' : 'Login'}
              </Button>
            </div>

            <p className={local.contactLine}>
              Already have an account?{' '}
              <button
                type="button"
                className={local.contactLink}
                onClick={() => setIsContactOpen(true)}
              >
                Contact admin
              </button>
            </p>
          </form>
          {/* ---------- Brand ---------- */}
          <div className={local.brandBlock}>
            <img
              src="https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp"
              alt="Dozzelo — Powered by Teckut"
              className={local.brandLogo}
              draggable={false}
            />
          </div>
        </div>
      </Modal>

      <ContactAdminModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        email={ADMIN_EMAIL}
      />
    </>
  );
};

export default LoginModal;