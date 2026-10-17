// components/ui/DropdownMenu/DropdownMenu.tsx
import React, { useEffect, useRef, useState } from 'react';
import local from './DropdownMenu.module.scss';

export interface DropdownMenuProps {
  trigger: (args: { isOpen: boolean; toggle: () => void }) => React.ReactNode;
  children:
    | React.ReactNode
    | ((args: { close: () => void }) => React.ReactNode);
  align?: 'left' | 'right';
  minWidth?: number;
  className?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'right',
  minWidth = 200,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((v) => !v);

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

  const content =
    typeof children === 'function' ? children({ close }) : children;

  return (
    <div className={local.wrap} ref={wrapRef}>
      {trigger({ isOpen, toggle })}

      {isOpen && (
        <div
          className={[local.menu, local[align], className ?? '']
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

/* ---------- Helpers ---------- */

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