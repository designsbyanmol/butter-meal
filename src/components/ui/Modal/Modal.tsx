// src/components/ui/Modal/Modal.tsx
import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, LeftArrowIcon } from '../../../assets/svgs';
import { pushEsc, popEsc, isTopEsc, escDepth } from '../_escStack';
import { lockBodyScroll, unlockBodyScroll } from '../_scrollLock';
import { useIsMobileViewport } from '../../../hooks/useIsMobileViewport';
import styles from './Modal.module.scss';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
export type ModalPosition = 'top' | 'center' | 'bottom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  headerRight?: React.ReactNode;
  size?: ModalSize;
  position?: ModalPosition;
  disableBackdropClose?: boolean;
  hideCloseButton?: boolean;
  lockScroll?: boolean;
  footer?: React.ReactNode;
  className?: string;
  overlayZIndex?: number;
  mobileFullScreen?: boolean;
  children: React.ReactNode;
}

const MOBILE_EXIT_MS = 220;
const HISTORY_CLEANUP_DELAY_MS = MOBILE_EXIT_MS + 60;

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  headerRight,
  size = 'md',
  position = 'center',
  disableBackdropClose = false,
  hideCloseButton = false,
  lockScroll = true,
  footer,
  className,
  overlayZIndex,
  mobileFullScreen = false,
  children,
}) => {
  const instanceId = useId();
  const isMobileViewport = useIsMobileViewport();

  const applyMobileFullScreen =
    mobileFullScreen && position === 'center' && isMobileViewport;

  const [visible, setVisible] = useState(isOpen);
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef<number | null>(null);
  const historyCleanupTimerRef = useRef<number | null>(null);
  const prevIsOpenRef = useRef(isOpen);
  const exitRanRef = useRef(false);

  const runExitThenClose = () => {
    if (!applyMobileFullScreen) {
      onClose();
      return;
    }
    if (exiting) return;

    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
    }

    setExiting(true);
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null;
      exitRanRef.current = true;
      setExiting(false);
      setVisible(false);
      onClose();
    }, MOBILE_EXIT_MS);
  };

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setExiting(false);
      setVisible(true);
      exitRanRef.current = false;
    }

    if (!isOpen && prevIsOpenRef.current) {
      if (applyMobileFullScreen && !exitRanRef.current) {
        setExiting(true);
        exitTimerRef.current = window.setTimeout(() => {
          setVisible(false);
          setExiting(false);
          exitTimerRef.current = null;
        }, MOBILE_EXIT_MS);
      } else {
        setVisible(false);
        setExiting(false);
      }
      exitRanRef.current = false;
    }

    prevIsOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, applyMobileFullScreen]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (historyCleanupTimerRef.current !== null) {
        window.clearTimeout(historyCleanupTimerRef.current);
        historyCleanupTimerRef.current = null;
      }
    };
  }, []);

  // ---------- ESC key ----------
  useEffect(() => {
    if (!isOpen) return;

    pushEsc(instanceId);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!isTopEsc(instanceId)) return;
      if (disableBackdropClose) return;
      e.stopPropagation();
      runExitThenClose();
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      popEsc(instanceId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, disableBackdropClose, instanceId]);

  // ---------- Body scroll lock ----------
  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen, lockScroll]);

  // ---------- History guard ----------
  // Only the *bottom-most* modal owns a history entry. If another
  // modal is already on the ESC stack, we do not push or listen.
  // This means the parent modal remains the sole owner of the back
  // button, and cleanups from exiting children can't accidentally
  // pop our state.
  useEffect(() => {
    if (!isOpen) return;

    // Already at least one modal open? Then we're a stacked modal.
    // Don't push, don't listen.
    const isStacked = escDepth() > 1;
    if (isStacked) return;

    const stateId = `modal-${instanceId}`;

    const pushGuard = () => {
      try {
        const ids: string[] = Array.isArray(
          (window.history.state as any)?.__modalIds,
        )
          ? (window.history.state as any).__modalIds
          : [];
        if (ids.includes(stateId)) return;
        window.history.pushState(
          { ...(window.history.state ?? {}), __modalIds: [...ids, stateId] },
          '',
        );
      } catch {
        /* ignore */
      }
    };

    pushGuard();

    const onPop = () => {
      const ids: string[] = Array.isArray(
        (window.history.state as any)?.__modalIds,
      )
        ? (window.history.state as any).__modalIds
        : [];
      if (ids.includes(stateId)) return;

      if (isTopEsc(instanceId)) {
        runExitThenClose();
      } else {
        pushGuard();
      }
    };

    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);

      // Defer history cleanup until after the exit animation.
      // Running it synchronously here would fire replaceState during
      // the *incoming* modal's mount in mobile stacking scenarios,
      // which is exactly the bug that was closing the top modal.
      if (historyCleanupTimerRef.current !== null) {
        window.clearTimeout(historyCleanupTimerRef.current);
      }
      historyCleanupTimerRef.current = window.setTimeout(() => {
        historyCleanupTimerRef.current = null;
        try {
          const ids: string[] = Array.isArray(
            (window.history.state as any)?.__modalIds,
          )
            ? (window.history.state as any).__modalIds
            : [];
          if (ids.includes(stateId)) {
            const remaining = ids.filter((id) => id !== stateId);
            window.history.replaceState(
              { ...(window.history.state ?? {}), __modalIds: remaining },
              '',
            );
          }
        } catch {
          /* ignore */
        }
      }, HISTORY_CLEANUP_DELAY_MS);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, instanceId]);

  if (!visible) return null;

  const handleBackdrop = () => {
    if (!disableBackdropClose) runExitThenClose();
  };

  const handleCloseClick = () => {
    runExitThenClose();
  };

  const dialogClasses = [
    styles.dialog,
    styles[size],
    styles[`position${position.charAt(0).toUpperCase()}${position.slice(1)}`],
    applyMobileFullScreen ? styles.mobileFullScreen : '',
    applyMobileFullScreen && exiting ? styles.mobileExiting : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const overlayClasses = [
    styles.overlay,
    styles[`overlay${position.charAt(0).toUpperCase()}${position.slice(1)}`],
    applyMobileFullScreen ? styles.overlayMobileFullScreen : '',
    applyMobileFullScreen && exiting ? styles.overlayExiting : '',
  ]
    .filter(Boolean)
    .join(' ');

  const showHeader = !!title || !!headerRight || !hideCloseButton;

  const content = (
    <div
      className={overlayClasses}
      onClick={handleBackdrop}
      style={
        overlayZIndex !== undefined ? { zIndex: overlayZIndex } : undefined
      }
    >
      <div
        className={dialogClasses}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {showHeader && (
          <div
            className={`${styles.header} ${
              applyMobileFullScreen ? styles.headerMobile : ''
            }`}
          >
            {applyMobileFullScreen && !hideCloseButton && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={handleCloseClick}
                aria-label="Back"
              >
                <LeftArrowIcon width={20} height={20} fill="#1e1e1e" />
              </button>
            )}

            <div className={styles.headerRight}>
              {title && <h3 className={styles.title}>{title}</h3>}
              {headerRight && (
                <div className={styles.headerActions}>{headerRight}</div>
              )}
            </div>

            {!hideCloseButton && (
              <button
                type="button"
                className={styles.closeBtn}
                onClick={handleCloseClick}
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

export default Modal;