// src/components/ui/Modal/Modal.tsx
import React, { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, LeftArrowIcon } from "../../../assets/svgs";
import { pushEsc, popEsc, isTopEsc } from "../_escStack";
import { lockBodyScroll, unlockBodyScroll } from "../_scrollLock";
import styles from "./Modal.module.scss";

export type ModalSize = "sm" | "md" | "lg" | "xl";

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
  /**
   * Override the overlay's z-index. By default the overlay uses the
   * `$z-modal` layer (1100).
   */
  overlayZIndex?: number;
  /**
   * When true, the modal renders as a full-screen sheet on mobile
   * (<= $bp-sm) with a back arrow in the top-left corner and the
   * `headerRight` slot in the top-right. Desktop rendering is
   * unchanged.
   */
  mobileFullScreen?: boolean;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  headerRight,
  size = "md",
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

  // Esc to close - topmost only.
  useEffect(() => {
    if (!isOpen || disableBackdropClose) return;

    pushEsc(instanceId);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!isTopEsc(instanceId)) return;
      e.stopPropagation();
      onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
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

  const dialogClasses = [
    styles.dialog,
    styles[size],
    mobileFullScreen ? styles.mobileFullScreen : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const showHeader = !!title || !!headerRight || !hideCloseButton;

  const content = (
    <div
      className={styles.overlay}
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
              mobileFullScreen ? styles.headerMobile : ""
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

            <div className={styles.headerRight}>
              {title && <h3 className={styles.title}>{title}</h3>}
              {headerRight && (
                <div className={styles.headerActions}>{headerRight}</div>
              )}
            </div>

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

        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
};

export default Modal;
