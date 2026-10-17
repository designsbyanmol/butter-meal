// src/components/ui/Sheet/Sheet.tsx
import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, LeftArrowIcon } from '../../../assets/svgs';
import { pushEsc, popEsc, isTopEsc } from '../_escStack';
import { lockBodyScroll, unlockBodyScroll } from '../_scrollLock';
import styles from './Sheet.module.scss';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Optional element rendered on the header's right edge. */
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Max height in vh. Default 86. Ignored when `mobileFullScreen` is on. */
  maxHeightVh?: number;
  /** Lock body scroll while open. Default: true. */
  lockScroll?: boolean;
  /** Prevent closing via backdrop click or Esc. */
  disableBackdropClose?: boolean;
  /** Hide the built-in close button. */
  hideCloseButton?: boolean;
  /**
   * Override the overlay's z-index. By default the overlay uses the
   * `$z-modal` layer (1100).
   */
  overlayZIndex?: number;
  /**
   * When true, on mobile (<= $bp-sm) the sheet fills the viewport
   * with a back arrow top-left, the title next to it, and
   * `headerActions` on the right. Desktop keeps the bottom-anchored
   * card look.
   */
  mobileFullScreen?: boolean;
  className?: string;
  children: React.ReactNode;
}

const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  headerActions,
  footer,
  maxHeightVh = 86,
  lockScroll = true,
  disableBackdropClose = false,
  hideCloseButton = false,
  overlayZIndex,
  mobileFullScreen = false,
  className,
  children,
}) => {
  const instanceId = useId();

  // Esc - topmost only.
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

  // Reference-counted body scroll lock.
  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen, lockScroll]);

  if (!isOpen) return null;

  const handleBackdrop = () => {
    if (!disableBackdropClose) onClose();
  };

  const sheetClasses = [
    styles.sheet,
    mobileFullScreen ? styles.mobileFullScreen : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const showHeader = !!title || !hideCloseButton || !!headerActions;

  const content = (
    <div
      className={styles.overlay}
      onClick={handleBackdrop}
      style={
        overlayZIndex !== undefined
          ? { zIndex: overlayZIndex }
          : undefined
      }
    >
      <div
        className={sheetClasses}
        style={
          mobileFullScreen
            ? undefined
            : { maxHeight: `${maxHeightVh}vh` }
        }
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {showHeader && (
          <div
            className={`${styles.header} ${
              mobileFullScreen ? styles.headerMobile : ''
            }`}
          >
            {/* Mobile-only back arrow, replaces the close icon. */}
            {mobileFullScreen && !hideCloseButton && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={onClose}
                aria-label="Back"
              >
                <LeftArrowIcon width={20} height={20} fill="#1e1e1e" />
              </button>
            )}

            {title && <h3 className={styles.title}>{title}</h3>}

            {/* Right-side CTAs / links. */}
            {headerActions && (
              <div className={styles.headerActions}>{headerActions}</div>
            )}

            {/* Desktop close button; hidden on mobile when full screen. */}
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
          </div>
        )}

        <section className={styles.body}>{children}</section>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
};

export default Sheet;