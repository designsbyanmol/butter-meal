// src/components/Dashboard/DashboardShell.tsx
import React, { useEffect, useMemo } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
  IconButton,
} from '../ui';
import { KebabIcon, HomeIcon } from '../../assets/svgs';
import local from './DashboardShell.module.scss';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  render: () => React.ReactNode;
  visible?: boolean;
  badge?: React.ReactNode;
}

export interface KebabMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
  onClick: () => void;
}

export interface SidebarFooterSlot {
  notifications?: React.ReactNode;
  kebabItems?: KebabMenuItem[];
}

interface DashboardShellProps {
  logoUrl: string;
  items: NavItem[];
  footer: SidebarFooterSlot;
  greeting?: React.ReactNode;
  topBar?: React.ReactNode;
  onAdd?: (() => void) | null;
  activeKey: string | null;
  onActiveKeyChange: (key: string) => void;
  /**
   * Called when the Home icon (or logo) is clicked. Should reset the
   * active section so the greeting screen renders.
   */
  onLogoClick?: () => void;
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
  onLogoClick,
}) => {
  const isMobile = useIsMobile(900);

  const visibleItems = useMemo(
    () => items.filter((i) => i.visible !== false),
    [items],
  );

  const activeItem = useMemo(
    () => items.find((i) => i.key === activeKey) ?? null,
    [items, activeKey],
  );

  useEffect(() => {
    if (!activeKey) return;
    const listedItem = items.find((i) => i.key === activeKey);
    const wasListed = listedItem?.visible !== false;
    const stillVisible = visibleItems.some((i) => i.key === activeKey);
    if (wasListed && !stillVisible) {
      onActiveKeyChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, visibleItems, items]);

  if (isMobile) return null;

  const kebabItems = footer.kebabItems ?? [];
  const hasKebab = kebabItems.length > 0;

  // Home is "active" when nothing else is.
  const isHomeActive = !activeKey;

  return (
    <div className={local.shell}>
      <aside className={local.sidebar}>
        {/* Logo — decorative only (clicking does nothing). */}
        <div className={local.logo}>
          <img src={logoUrl} alt="Logo" draggable={false} />
        </div>

        {/* Home — the primary way to return to the greeting screen. */}
        {onLogoClick && (
          <button
            type="button"
            className={`${local.homeBtn} ${
              isHomeActive ? local.homeBtnActive : ''
            }`}
            onClick={onLogoClick}
            aria-label="Home"
            title="Home"
          >
            <HomeIcon width={22} height={22} fill="currentColor" />
          </button>
        )}

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
          {footer.notifications && (
            <div className={local.footerSlot}>{footer.notifications}</div>
          )}

          {hasKebab && (
            <div className={local.footerSlot}>
              <DropdownMenu
                align="left"
                minWidth={200}
                className={local.sidebarKebabMenu}
                trigger={({ toggle }) => (
                  <IconButton
                    variant="ghost"
                    size="md"
                    aria-label="Open menu"
                    tooltip="More options"
                    onClick={toggle}
                  >
                    <KebabIcon width={20} height={20} fill="currentColor" />
                  </IconButton>
                )}
              >
                {({ close }) =>
                  kebabItems.map((item, idx) => (
                    <React.Fragment key={item.key}>
                      {idx > 0 && item.tone === 'danger' && (
                        <DropdownDivider />
                      )}
                      <DropdownItem
                        tone={item.tone}
                        onClick={() => {
                          close();
                          item.onClick();
                        }}
                      >
                        {item.icon ? (
                          <span className={local.kebabItemRow}>
                            <span className={local.kebabItemIcon}>
                              {item.icon}
                            </span>
                            <span className={local.kebabItemLabel}>
                              {item.label}
                            </span>
                          </span>
                        ) : (
                          item.label
                        )}
                      </DropdownItem>
                    </React.Fragment>
                  ))
                }
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

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