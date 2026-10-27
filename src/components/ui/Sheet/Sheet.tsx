// src/components/ui/Sheet/Sheet.tsx
import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, LeftArrowIcon } from '../../../assets/svgs';
import { pushEsc, popEsc, isTopEsc } from '../_escStack';
import { lockBodyScroll, unlockBodyScroll } from '../_scrollLock';
import { useIsMobileViewport } from '../../../hooks/useIsMobileViewport';
import styles from './Sheet.module.scss';

export type SheetPosition = 'top' | 'center' | 'bottom';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightVh?: number;
  lockScroll?: boolean;
  disableBackdropClose?: boolean;
  hideCloseButton?: boolean;
  overlayZIndex?: number;
  mobileFullScreen?: boolean;
  /** Vertical anchor. Default `center`. */
  position?: SheetPosition;
  className?: string;
  children: React.ReactNode;
}

const MOBILE_EXIT_MS = 220;

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
  position = 'center',
  className,
  children,
}) => {
  const instanceId = useId();
  const isMobileViewport = useIsMobileViewport();

  // Full-screen takeover on mobile only. Ignored when position is
  // top/bottom - those anchor modes already work fine on mobile.
  const applyMobileFullScreen =
    mobileFullScreen && isMobileViewport && position === 'center';

  const [visible, setVisible] = useState(isOpen);
  const [exiting, setExiting] = useState(false);
  const exitTimerRef = useRef<number | null>(null);
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
    };
  }, []);

  useEffect(() => {
    if (!isOpen || disableBackdropClose) return;

    pushEsc(instanceId);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!isTopEsc(instanceId)) return;
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

  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen, lockScroll]);

  // Mobile-only: browser back button closes the sheet.
  useEffect(() => {
    if (!isOpen || !applyMobileFullScreen) return;

    const stateId = `sheet-${instanceId}`;
    window.history.pushState({ modalId: stateId }, '');

    const onPopState = () => {
      if (isTopEsc(instanceId)) {
        runExitThenClose();
      }
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (window.history.state?.modalId === stateId) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, applyMobileFullScreen, instanceId]);

  if (!visible) return null;

  const handleBackdrop = () => {
    if (!disableBackdropClose) runExitThenClose();
  };

  const handleCloseClick = () => {
    runExitThenClose();
  };

  const positionClass = styles[
    `position${position.charAt(0).toUpperCase()}${position.slice(1)}`
  ];

  const overlayPositionClass = styles[
    `overlay${position.charAt(0).toUpperCase()}${position.slice(1)}`
  ];

  const sheetClasses = [
    styles.sheet,
    positionClass,
    applyMobileFullScreen ? styles.mobileFullScreen : '',
    applyMobileFullScreen && exiting ? styles.mobileExiting : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const overlayClasses = [
    styles.overlay,
    overlayPositionClass,
    applyMobileFullScreen ? styles.overlayMobileFullScreen : '',
    applyMobileFullScreen && exiting ? styles.overlayExiting : '',
  ]
    .filter(Boolean)
    .join(' ');

  const showHeader = !!title || !hideCloseButton || !!headerActions;

  const content = (
    <div
      className={overlayClasses}
      onClick={handleBackdrop}
      style={overlayZIndex !== undefined ? { zIndex: overlayZIndex } : undefined}
    >
      <div
        className={sheetClasses}
        style={
          applyMobileFullScreen ? undefined : { maxHeight: `${maxHeightVh}vh` }
        }
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

            {title && <h3 className={styles.title}>{title}</h3>}

            {headerActions && (
              <div className={styles.headerActions}>{headerActions}</div>
            )}

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

export default Sheet;