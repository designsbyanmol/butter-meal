// src/components/ui/Modal/Modal.tsx
import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../../../assets/svgs';
import { pushEsc, popEsc, isTopEsc } from '../_escStack';
import styles from './Modal.module.scss';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Optional element on the header Right (e.g. a Button). */
  headerRight?: React.ReactNode;
  size?: ModalSize;
  /** Prevent closing via backdrop click or Esc. */
  disableBackdropClose?: boolean;
  /** Disable the built-in close button. */
  hideCloseButton?: boolean;
  /** Lock body scroll while open. Default: true. */
  lockScroll?: boolean;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  headerRight,
  size = 'md',
  disableBackdropClose = false,
  hideCloseButton = false,
  lockScroll = true,
  footer,
  className,
  children,
}) => {
  // Stable per-instance identifier for the Esc stack
  const instanceId = useId();

  // Esc to close - only the topmost open modal reacts
  useEffect(() => {
    if (!isOpen || disableBackdropClose) return;

    pushEsc(instanceId);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!isTopEsc(instanceId)) return;
      e.stopPropagation();
      onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      popEsc(instanceId);
    };
  }, [isOpen, disableBackdropClose, onClose, instanceId]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen, lockScroll]);

  if (!isOpen) return null;

  const handleBackdrop = () => {
    if (!disableBackdropClose) onClose();
  };

  const content = (
    <div className={styles.overlay} onClick={handleBackdrop}>
      <div
        className={[styles.dialog, styles[size], className ?? '']
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || headerRight || !hideCloseButton) && (
          <header className={styles.header}>
            <div className={styles.headerRight}>
              {title && <h3 className={styles.title}>{title}</h3>}
              {headerRight}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close"
              >
                <CloseIcon width={18} height={18} fill="#4d4d4d" />
              </button>
            )}
          </header>
        )}

        <section className={styles.body}>{children}</section>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
};

export default Modal;