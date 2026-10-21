// src/components/Dashboard/MobileDashboardShell.tsx
import React, { useEffect, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownDivider,
  DropdownItem,
  IconButton,
} from '../ui';
import local from './MobileDashboardShell.module.scss';
import { KebabIcon } from '../../assets/svgs';

export interface MobileNavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  render: () => React.ReactNode;
  visible?: boolean;
}

export type KebabItem =
  | {
      kind: 'action';
      key: string;
      label: string;
      icon?: React.ReactNode;
      onClick: () => void;
      tone?: 'default' | 'danger';
    }
  | { kind: 'divider' };

interface MobileDashboardShellProps {
  logoUrl: string;
  roleLabel: string;
  navItems: MobileNavItem[];
  activeKey: string | null;
  onActiveKeyChange: (key: string) => void;
  onLogoClick?: () => void;
  greeting: React.ReactNode;
  kebabItems: KebabItem[];
  notifications?: React.ReactNode;
}

const MobileDashboardShell: React.FC<MobileDashboardShellProps> = ({
  logoUrl,
  roleLabel,
  navItems,
  activeKey,
  onActiveKeyChange,
  onLogoClick,
  greeting,
  kebabItems,
  notifications,
}) => {
  const visibleItems = useMemo(
    () => navItems.filter((i) => i.visible !== false),
    [navItems],
  );

  const activeItem = useMemo(
    () => navItems.find((i) => i.key === activeKey) ?? null,
    [navItems, activeKey],
  );

  useEffect(() => {
    if (!activeKey) return;
    const stillVisible = visibleItems.some((i) => i.key === activeKey);
    const wasListed =
      navItems.find((i) => i.key === activeKey)?.visible !== false;
    if (wasListed && !stillVisible) onActiveKeyChange('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, visibleItems, navItems]);

  const renderableKebab = useMemo(
    () => kebabItems.filter((k) => k.kind === 'action' || k.kind === 'divider'),
    [kebabItems],
  );

  return (
    <div className={local.page}>
      <header className={local.header}>
        <button
          type="button"
          className={local.brandBtn}
          onClick={onLogoClick}
          aria-label="Go to home"
        >
          <img
            src={logoUrl}
            alt=""
            className={local.brandImg}
            draggable={false}
          />
          <span className={local.roleLabel}>{roleLabel}</span>
        </button>

        <div className={local.headerActions}>
          {notifications}

          <DropdownMenu
            align="right"
            minWidth={220}
            className={local.kebabMenu}
            trigger={({ toggle }) => (
              <IconButton
                variant="ghost"
                size="md"
                aria-label="More options"
                onClick={toggle}
              >
                <KebabIcon width={24} height={24} fill='#0f172a'/>
              </IconButton>
            )}
          >
            {({ close }) =>
              renderableKebab.map((item, idx) =>
                item.kind === 'divider' ? (
                  <DropdownDivider key={`div-${idx}`} />
                ) : (
                  <DropdownItem
                    key={item.key}
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
                ),
              )
            }
          </DropdownMenu>
        </div>
      </header>

      <main className={local.main}>
        {activeItem ? (
          <div className={local.section}>{activeItem.render()}</div>
        ) : (
          <div className={local.greeting}>{greeting}</div>
        )}
      </main>

      <nav className={local.bottomNav}>
        {visibleItems.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              className={`${local.navBtn} ${
                isActive ? local.navBtnActive : ''
              }`}
              onClick={() =>
                onActiveKeyChange(isActive ? '' : item.key)
              }
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={local.navIcon}>{item.icon}</span>
              <span className={local.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileDashboardShell;