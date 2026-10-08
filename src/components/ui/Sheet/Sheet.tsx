// src/components/ui/Sheet/Sheet.tsx
import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../../../assets/svgs';
import { pushEsc, popEsc, isTopEsc } from '../_escStack';
import styles from './Sheet.module.scss';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  /** Max height in vh. Default 86. */
  maxHeightVh?: number;
  /** Lock body scroll while open. Default: true. */
  lockScroll?: boolean;
  /** Prevent closing via backdrop click or Esc. */
  disableBackdropClose?: boolean;
  /** Hide the built-in close button. */
  hideCloseButton?: boolean;
  className?: string;
  children: React.ReactNode;
}

const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  footer,
  maxHeightVh = 86,
  lockScroll = true,
  disableBackdropClose = false,
  hideCloseButton = false,
  className,
  children,
}) => {
  const instanceId = useId();

  // Esc - topmost only
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
        className={[styles.sheet, className ?? '']
          .filter(Boolean)
          .join(' ')}
        style={{ maxHeight: `${maxHeightVh}vh` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {(title || !hideCloseButton) && (
          <header className={styles.header}>
            {title && <h3 className={styles.title}>{title}</h3>}
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

export default Sheet;