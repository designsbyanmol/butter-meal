// components/ui/DropdownMenu/DropdownMenu.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import local from './DropdownMenu.module.scss';

export interface DropdownMenuProps {
  trigger: (args: { isOpen: boolean; toggle: () => void }) => React.ReactNode;
  children:
    | React.ReactNode
    | ((args: { close: () => void }) => React.ReactNode);
  /** Preferred alignment. Auto-flipped if it would overflow. */
  align?: 'left' | 'right';
  minWidth?: number;
  className?: string;
}

const VIEWPORT_MARGIN = 8; // px of breathing room from the screen edge

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'right',
  minWidth = 200,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedAlign, setResolvedAlign] = useState<'left' | 'right'>(align);

  const wrapRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((v) => !v);

  // Resolve alignment whenever the menu opens.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const wrap = wrapRef.current;
    if (!wrap) {
      setResolvedAlign(align);
      return;
    }

    const rect = wrap.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      0;

    // Space available on each side of the trigger, in viewport px.
    const spaceRight = viewportWidth - rect.right - VIEWPORT_MARGIN;
    const spaceLeft = rect.left - VIEWPORT_MARGIN;

    const fitsRight = minWidth <= spaceRight;
    const fitsLeft = minWidth <= spaceLeft;

    let next: 'left' | 'right' = align;

    if (align === 'right' && !fitsRight) {
      // Requested right-aligned (menu grows leftwards from the trigger's
      // right edge). If that overflows the left side of the viewport,
      // flip to left-aligned.
      //
      // Wait - think again. With `align="right"`, the menu's right edge
      // is anchored to the trigger's right edge, so the menu extends
      // to the LEFT. That means we need space on the LEFT.
      // Conversely `align="left"` extends RIGHT and needs space on
      // the right.
      //
      // So: if align is 'right' and there's not enough space on the
      // left, flip to 'left' (if that fits).
      if (!fitsLeft && fitsRight) next = 'left';
    } else if (align === 'left' && !fitsLeft) {
      // Requested left-aligned (menu extends rightwards from the
      // trigger's left edge). If that overflows the right side of
      // the viewport, flip to right-aligned.
      if (!fitsRight && fitsLeft) next = 'right';
    }

    // If neither side fits (very wide menu, tiny viewport), keep the
    // requested alignment and let the menu clamp to the viewport edge
    // via maxWidth in SCSS.
    setResolvedAlign(next);
  }, [isOpen, align, minWidth]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!isOpen) return;

    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  // Close (and re-evaluate) on resize.
  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => {
      // Force a re-measure by toggling a throwaway state.
      setResolvedAlign((prev) => prev);
      // Actually re-run the layout effect logic by re-opening the
      // menu. Simpler: just recompute here.
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth || 0;
      const spaceRight = viewportWidth - rect.right - VIEWPORT_MARGIN;
      const spaceLeft = rect.left - VIEWPORT_MARGIN;
      const fitsRight = minWidth <= spaceRight;
      const fitsLeft = minWidth <= spaceLeft;

      let next: 'left' | 'right' = align;
      if (align === 'right' && !fitsLeft && fitsRight) next = 'left';
      else if (align === 'left' && !fitsRight && fitsLeft) next = 'right';
      setResolvedAlign(next);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen, align, minWidth]);

  const content =
    typeof children === 'function' ? children({ close }) : children;

  return (
    <div className={local.wrap} ref={wrapRef}>
      {trigger({ isOpen, toggle })}

      {isOpen && (
        <div
          className={[
            local.menu,
            local[resolvedAlign], // ← use the flipped value
            className ?? '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="menu"
          style={{ minWidth }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;

/* ---------- Helpers (unchanged) ---------- */

export interface DropdownSectionProps {
  label?: React.ReactNode;
  children: React.ReactNode;
}

export const DropdownSection: React.FC<DropdownSectionProps> = ({
  label,
  children,
}) => (
  <div className={local.section}>
    {label && <span className={local.sectionLabel}>{label}</span>}
    {children}
  </div>
);

export interface DropdownItemProps {
  active?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  onClick: () => void;
  children: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  active,
  disabled,
  tone = 'default',
  onClick,
  children,
}) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    className={[
      local.item,
      active ? local.itemActive : '',
      tone === 'danger' ? local.itemDanger : '',
    ]
      .filter(Boolean)
      .join(' ')}
    onClick={onClick}
  >
    {children}
  </button>
);

export const DropdownDivider: React.FC = () => (
  <div className={local.divider} />
);