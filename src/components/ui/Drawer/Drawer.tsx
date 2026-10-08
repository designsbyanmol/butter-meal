// src/components/ui/Drawer/Drawer.tsx
import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../../../assets/svgs';
import { pushEsc, popEsc, isTopEsc } from '../_escStack';
import styles from './Drawer.module.scss';

export type DrawerSide = 'left' | 'right';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  side?: DrawerSide;
  /** Actions rendered to the left of the close button. */
  headerActions?: React.ReactNode;
  /** Lock body scroll while open. Default: true. */
  lockScroll?: boolean;
  /** Prevent closing via backdrop click or Esc. */
  disableBackdropClose?: boolean;
  children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  side = 'right',
  headerActions,
  lockScroll = true,
  disableBackdropClose = false,
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
      <aside
        className={[styles.panel, styles[side]].join(' ')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <div className={styles.headerActions}>
            {headerActions}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon width={18} height={18} fill="#4d4d4d" />
            </button>
          </div>
        </div>
        <div className={styles.body}>{children}</div>
      </aside>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
};

export default Drawer;