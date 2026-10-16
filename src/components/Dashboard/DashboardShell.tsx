// components/Dashboard/DashboardShell.tsx
import React, { useEffect, useMemo } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import local from './DashboardShell.module.scss';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** Which pane to render in the right side. */
  render: () => React.ReactNode;
  /**
   * Hidden entirely when false (plan gating).
   *
   * A `visible: false` item is still resolvable by `activeKey` — the
   * right pane will render it — but it does not appear in the sidebar
   * list. Useful for sections reachable only via a footer action
   * (e.g. the "info" section opened by the avatar).
   */
  visible?: boolean;
  /** Optional right-side hint (e.g. count badge). */
  badge?: React.ReactNode;
}

export interface SidebarFooterSlot {
  /** Bell(s) region — an existing drawer component or a bare button. */
  notifications?: React.ReactNode;
  /** Avatar editor trigger. */
  avatar?: React.ReactNode;
  /** Logout button. */
  logout?: React.ReactNode;
}

interface DashboardShellProps {
  logoUrl: string;
  items: NavItem[];
  footer: SidebarFooterSlot;
  /** Optional greeting content for the right pane when nothing is active. */
  greeting?: React.ReactNode;
  /** Optional top-bar slot (search, breadcrumb, etc.). */
  topBar?: React.ReactNode;
  /** Optional primary action rendered as the sidebar's + button. */
  onAdd?: (() => void) | null;

  /**
   * Currently active section key. The caller owns this so it can drive
   * the shell from anywhere — including the sidebar footer (e.g.
   * clicking the avatar can set the active section to "info").
   *
   * Pass `null` to let the shell auto-select the first visible item on
   * mount.
   */
  activeKey: string | null;
  onActiveKeyChange: (key: string) => void;
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  logoUrl,
  items,
  footer,
  greeting,
  topBar,
  onAdd,
  activeKey,
  onActiveKeyChange,
}) => {
  const isMobile = useIsMobile(900);

  const visibleItems = useMemo(
    () => items.filter((i) => i.visible !== false),
    [items],
  );

  // All items, including `visible: false` ones — used to resolve the
  // active section. A hidden item can still be the active key.
  const activeItem = useMemo(
    () => items.find((i) => i.key === activeKey) ?? null,
    [items, activeKey],
  );

  // Auto-select the first visible item when nothing is active, or
  // when the active item has become hidden due to a plan flip.
  useEffect(() => {
  // When nothing is selected we render the greeting — that's the
  // intended "welcome screen" state, not a bug to auto-correct.
  if (!activeKey) return;

  // If the selected item just became hidden (e.g. plan downgrade
  // removed Reviews), reset to the greeting rather than silently
  // jumping to another section.
  const listedItem = items.find((i) => i.key === activeKey);
  const wasListed = listedItem?.visible !== false;
  const stillVisible = visibleItems.some((i) => i.key === activeKey);

  if (wasListed && !stillVisible) {
    onActiveKeyChange('');
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeKey, visibleItems]);

  if (isMobile) return null;

  return (
    <div className={local.shell}>
      {/* ---------- Sidebar ---------- */}
      <aside className={local.sidebar}>
        <div className={local.logo}>
          <img src={logoUrl} alt="Logo" draggable={false} />
        </div>

        <nav className={local.nav}>
          {visibleItems.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                className={`${local.navItem} ${
                  isActive ? local.navItemActive : ''
                }`}
                onClick={() => onActiveKeyChange(item.key)}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <span className={local.navIcon}>{item.icon}</span>
                <span className={local.navLabel}>{item.label}</span>
                {item.badge && (
                  <span className={local.navBadge}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={local.footer}>
          {onAdd && (
            <button
              type="button"
              className={local.addBtn}
              onClick={onAdd}
              aria-label="Add"
            >
              +
            </button>
          )}

          {footer.notifications && (
            <div className={local.footerSlot}>{footer.notifications}</div>
          )}
          {footer.avatar && (
            <div className={local.footerSlot}>{footer.avatar}</div>
          )}
          {footer.logout && (
            <div className={local.footerSlot}>{footer.logout}</div>
          )}
        </div>
      </aside>

      {/* ---------- Right pane ---------- */}
      <main className={local.main}>
        {topBar && <div className={local.topBar}>{topBar}</div>}

        <div className={local.body}>
          {activeItem ? (
            <div className={local.section}>{activeItem.render()}</div>
          ) : (
            <div className={local.greeting}>{greeting}</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardShell;