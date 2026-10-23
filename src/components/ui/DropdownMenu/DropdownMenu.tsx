// components/ui/DropdownMenu/DropdownMenu.tsx
import React, {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
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

const VIEWPORT_MARGIN = 8;

/**
 * Filters out children that would render nothing:
 *  - `null`, `undefined`, `false`, `''` (React's standard skip set)
 *  - Fragment components whose own children are all empty
 *
 * Use this for the *contents* of a `DropdownSection` too, so an empty
 * section (all its items hidden) doesn't render its label.
 */
const isEmptyNode = (node: React.ReactNode): boolean => {
  if (node === null || node === undefined || node === false) return true;
  if (typeof node === 'string' && node.trim() === '') return true;
  if (typeof node === 'number') return false;

  if (isValidElement(node)) {
    const type = node.type as any;
    // Fragment - recurse
    if (type === React.Fragment) {
      const kids = (node.props as { children?: React.ReactNode }).children;
      return isEmptyNodeArray(kids);
    }
    // Anything else (a real component) counts as non-empty.
    return false;
  }
  return false;
};

const isEmptyNodeArray = (node: React.ReactNode): boolean =>
  Children.toArray(node).every(isEmptyNode);

/** Return only the children that would actually render something. */
const filterRenderable = (node: React.ReactNode): React.ReactNode[] =>
  Children.toArray(node).filter((c) => !isEmptyNode(c));

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'right',
  minWidth = 200,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedAlign, setResolvedAlign] =
    useState<'left' | 'right'>(align);

  const wrapRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((v) => !v);

  // ---- Viewport-aware alignment ----
  const computeAlign = (): 'left' | 'right' => {
    const wrap = wrapRef.current;
    if (!wrap) return align;

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
    return next;
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    setResolvedAlign(computeAlign());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, align, minWidth]);

  useEffect(() => {
    if (!isOpen) return;

    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onResize = () => setResolvedAlign(computeAlign());

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const rawContent =
    typeof children === 'function' ? children({ close }) : children;

  // Drop every child that would render nothing.
  const renderable = filterRenderable(rawContent);

  // If absolutely everything was filtered out, don't render the menu
  // shell either - an empty white box is worse than no menu.
  if (!isOpen || renderable.length === 0) {
    return (
      <div className={local.wrap} ref={wrapRef}>
        {trigger({ isOpen, toggle })}
      </div>
    );
  }

  return (
    <div className={local.wrap} ref={wrapRef}>
      {trigger({ isOpen, toggle })}

      <div
        className={[
          local.menu,
          local[resolvedAlign],
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="menu"
        style={{ minWidth }}
      >
        {renderable}
      </div>
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
}) => {
  const items = filterRenderable(children);
  if (items.length === 0) return null; // ← key fix: hide empty sections
  return (
    <div className={local.section}>
      {label && !isEmptyNode(label) && (
        <span className={local.sectionLabel}>{label}</span>
      )}
      {items}
    </div>
  );
};

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
}) => {
  // Nothing to render → hide the button entirely.
  // This also lets the parent's divider-pruning strip any
  // dividers that were hugging this item.
  if (isEmptyNodeArray(children)) return null;

  return (
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
};

export const DropdownDivider: React.FC = () => (
  <div className={local.divider} />
);