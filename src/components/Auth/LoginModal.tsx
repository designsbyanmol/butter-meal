// src/components/Auth/LoginModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { authService } from '../../services/auth.service';
import { Modal, Button, Input, Banner } from '../ui';
import ContactAdminModal from './ContactAdminModal';
import { EyeIcon, EyeOffIcon, RightArrow, CheckIcon } from '../../assets/svgs';
import { setLockoutUntil } from '../../utils/lockoutStorage';
import local from './Auth.module.scss';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceOpen?: boolean;
  storeIdentity?: { slug: string; displayName: string } | null;
}

const ADMIN_EMAIL = 'ContactDozzelo@gmail.com';

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  forceOpen = false,
  storeIdentity = null,
}) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('60:00');
  const timerRef = useRef<number | null>(null);

  const { login } = useAuth();
  const { tenant } = useTenant();

  const displayName =
    storeIdentity?.displayName || tenant?.displayName || null;

  useEffect(() => {
    if (isOpen) {
      setError('');
      setIsLocked(false);
      setLockoutEndTime(null);
      setTimeLeft('60:00');
      setPhone('');
      setPassword('');
      setShowPassword(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    if (phone.length !== 10 || isLocked) return;

    const debounceTimer = setTimeout(async () => {
      const minutesLeft = await authService.checkLockout(
        phone,
        tenant?.slug ?? null,
      );

      if (minutesLeft > 0) {
        setIsLocked(true);
        setError('');
        const unlockAt = Date.now() + minutesLeft * 60 * 1000;
        setLockoutEndTime(unlockAt);

        if (tenant?.slug) {
          setLockoutUntil(tenant.slug, unlockAt);
        }
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [phone, tenant?.slug, isLocked]);

  useEffect(() => {
    if (!isLocked || !lockoutEndTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = lockoutEndTime - now;

      if (diff <= 0) {
        setIsLocked(false);
        setError('');
        setTimeLeft('60:00');
        setLockoutEndTime(null);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');

      setTimeLeft(`${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    timerRef.current = window.setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLocked, lockoutEndTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || isLoading) return;

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError('Please enter your phone number.');
      return;
    }

    setError('');
    setIsLoading(true);

    const result = await login(cleanPhone, password);
    setIsLoading(false);

    if (result.success) {
      onClose();
    } else {
      const msg = result.error || 'Login failed';

      if (
        msg.includes('Too many failed attempts') ||
        msg.includes('Account locked')
      ) {
        setIsLocked(true);
        setError('');
        const unlockAt = Date.now() + 60 * 60 * 1000;
        setLockoutEndTime(unlockAt);

        if (tenant?.slug) {
          setLockoutUntil(tenant.slug, unlockAt);
        }
      } else {
        setError(msg);
      }
    }
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    if (error && !isLocked) setError('');
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error && !isLocked) setError('');
  };

  const handleClose = forceOpen ? () => {} : onClose;

  if (isLocked) {
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
            <div className={local.lockoutScreen}>
              <div className={local.lockoutIcon}>
                <CheckIcon width={40} height={40} fill="#a62d2d" />
              </div>

              <h2 className={local.lockoutTitle}>Login Locked</h2>

              <p className={local.lockoutMessage}>
                Your store login is locked for 1 hour because of 3 wrong
                login attempts.
              </p>

              <div className={local.lockoutTimer}>
                <span className={local.lockoutTimerLabel}>Try again in</span>
                <span className={local.lockoutTimerValue}>{timeLeft}</span>
              </div>

              <p className={local.lockoutHelp}>
                If you need urgent help,{' '}
                <button
                  type="button"
                  className={local.contactLink}
                  onClick={() => setIsContactOpen(true)}
                >
                  contact support
                </button>
                .
              </p>
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
  }

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
          <form onSubmit={handleSubmit} className={local.form}>
            {error && (
              <Banner variant="error" inline onDismiss={() => setError('')}>
                {error}
              </Banner>
            )}

            {displayName && (
              <div className={local.storeBlock}>
                <span className={local.storeLabel}>Signing in to</span>
                <span className={local.storeName}>{displayName}</span>
              </div>
            )}

            <Input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="10-digit phone number"
              disabled={isLoading}
              required
              autoComplete="username"
              maxLength={10}
              inputMode="numeric"
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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

            <div className={local.submitRow}>
              <Button
                type="submit"
                loading={isLoading}
                size="md"
                variant="success"
                className={local.loginBtn}
                disabled={isLoading}
                rightIcon={
                  !isLoading ? (
                    <RightArrow width={18} height={18} fill="#fff" />
                  ) : undefined
                }
              >
                {isLoading ? 'Signing in...' : 'Login'}
              </Button>
            </div>

            <p className={local.lockoutNotice}>
              After 3 unsuccessful attempts, login will be locked for 1 hour.
            </p>

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

          <div className={local.brandBlock}>
            <img
              src="https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp"
              alt="Dozzelo - Powered by Teckut"
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