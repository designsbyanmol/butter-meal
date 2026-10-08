// components/Header/Header.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { useWishlist } from '../../hooks/useWishlist';
import { useCustomerName } from '../../hooks/useCustomerName';
import { usePlan } from '../../hooks/usePlan';
import { MenuItem } from '../../types';
import LoginModal from '../Auth/LoginModal';
import UserManagement from '../Admin/UserManagement';
import AdminPanel from '../Admin/AdminPanel';
import StoreModal from '../Store/StoreModal';
import TenantManager from '../Admin/TenantManager';
import WishlistPanel from '../Menu/WishlistPanel';
import InfoPopup from '../Store/InfoPopup';
import PlanBadgeInline from '../Store/PlanBadgeInline';
import WishlistIcon from '../../assets/svgs/WishlistIcon';
import WishlistFilledIcon from '../../assets/svgs/WishlistFilledIcon';
import { Avatar, Badge, IconButton, Button } from '../ui';
import { MenuIcon, UsersIcon, StoreIcon } from '../../assets/svgs';
import {
  subscribeAdminAction,
  AdminAction,
} from '../../utils/adminEvents';
import local from './Header.module.scss';

interface HeaderProps {
  companyName: string;
  year: number;
  onWishlistItemClick?: (item: MenuItem) => void;
}

const Header: React.FC<HeaderProps> = ({
  companyName,
  year,
  onWishlistItemClick,
}) => {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const { tenant, isDeactivated, isAdminView, isSmartAdminHost } = useTenant();
  const { count: wishlistCount } = useWishlist();
  const customerName = useCustomerName();
  const plan = usePlan();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isMenuPanelOpen, setIsMenuPanelOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isTenantManagerOpen, setIsTenantManagerOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAdminAction((action: AdminAction) => {
      switch (action) {
        case 'open-menu-panel':
          setIsMenuPanelOpen(true);
          break;
        case 'open-store-settings':
          setIsStoreModalOpen(true);
          break;
        case 'open-user-management':
          // Guard: only admins may open user management via the event bus.
          if (isAdmin) setIsUserManagementOpen(true);
          break;
        case 'open-info-popup':
          // Guard: only admins may open the info popup via the event bus.
          if (isAdmin) setIsInfoOpen(true);
          break;
        case 'open-tenant-manager':
          setIsTenantManagerOpen(true);
          break;
      }
    });
    return unsubscribe;
  }, [isAdmin]);

  // ---------------------------------------------------------
  // Visibility rules
  // ---------------------------------------------------------
  const shouldHideHeader = !tenant && !isSmartAdminHost;

  const isPlatformAdmin = isAdmin && !tenant;
  const canManageTenant = isAuthenticated && !!tenant && !isDeactivated;
  const showWishlist = !!tenant && !isDeactivated && !isAdminView;
  const showAdminAvatar = isAuthenticated && !!tenant && !isDeactivated;

  const isAdminContext = isSmartAdminHost || isAdminView;
  const hasCustomerName = !isAuthenticated && customerName.trim().length > 0;

  const handleLogin = () => setIsLoginOpen(true);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleWishlistItemClick = (item: MenuItem) => {
    onWishlistItemClick?.(item);
  };

  const avatarInitial =
    user?.name && user.name.trim().length > 0
      ? user.name.trim().charAt(0).toUpperCase()
      : '?';

  // ---------------------------------------------------------
  // Brand text
  // ---------------------------------------------------------
  const renderBrandText = () => {
    if (isAuthenticated && user?.name) {
      return (
        <>
          <span className={local.tagline}>{user.name}</span>
          {/*
           * The plan badge is clickable for admins only. For staff we
           * render a non-interactive version so they can still see
           * their plan/status but cannot open the info popup.
           */}
          {tenant && !isPlatformAdmin && (
            isAdmin ? (
              <PlanBadgeInline onClick={() => setIsInfoOpen(true)} />
            ) : (
              <PlanBadgeInline />
            )
          )}
        </>
      );
    }

    if (isAdminContext) {
      if (isSmartAdminHost && !tenant) {
        return (
          <span className={local.companyName}>
            {companyName} {year}
          </span>
        );
      }
      return (
        <span className={local.companyName}>
          {tenant ? tenant.displayName : `${companyName} ${year}`}
        </span>
      );
    }

    if (hasCustomerName) {
      return (
        <span className={local.customerGreeting}>
          Hey! <strong>{customerName}</strong>
        </span>
      );
    }

    return (
      <span className={local.companyName}>
        {tenant ? tenant.displayName : `${companyName} ${year}`}
      </span>
    );
  };

  if (shouldHideHeader) return null;

  return (
    <>
      <div className={local.bm_header}>
        <div className={local.container}>
          <div className={local.brand}>
            {showAdminAvatar && (
              <Avatar
                name={avatarInitial}
                size="md"
                /* Only admins can click to open the info popup.
                   Staff see the same avatar as a static element. */
                onClick={isAdmin ? () => setIsInfoOpen(true) : undefined}
              />
            )}
            {!isAuthenticated && (
              <span className={local.brandText}>{renderBrandText()}</span>
            )}

            {isSmartAdminHost && !tenant && (
              <Badge tone="info" size="sm">
                Smart Admin
              </Badge>
            )}

            {isAdminView && tenant && !isAuthenticated && (
              <Badge tone="warning" size="sm">
                Admin
              </Badge>
            )}
            
          </div>

          <div className={local.actions}>
            {showWishlist && !isAuthenticated && plan.canWishlist && (
              <div className={local.wishlistWrap}>
                <IconButton
                  variant="ghost"
                  size="md"
                  aria-label="Open wishlist"
                  tooltip="Wishlist"
                  onClick={() => setIsWishlistOpen(true)}
                >
                  {wishlistCount > 0 ? (
                    <WishlistFilledIcon
                      width={20}
                      height={20}
                      fill="#e23744"
                    />
                  ) : (
                    <WishlistIcon width={20} height={20} fill="#1e1e1e" />
                  )}
                </IconButton>
                {wishlistCount > 0 && (
                  <span className={local.wishlistBadge}>
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </div>
            )}

            {isAuthenticated ? (
              <>
                {canManageTenant && (
                  <>
                    {/* ---------- Store Management: admins AND staff ---------- */}
                    {plan.canManageStore && (
                      <IconButton
                        variant="soft"
                        size="md"
                        aria-label="Store Settings"
                        tooltip="Store Settings"
                        onClick={() => setIsStoreModalOpen(true)}
                      >
                        <StoreIcon width={20} height={20} fill="#1e1e1e" />
                      </IconButton>
                    )}

                    {/* ---------- Menu Management: admins AND staff ---------- */}
                    <IconButton
                      variant="soft"
                      size="md"
                      aria-label="Manage Menu"
                      tooltip="Manage Menu"
                      onClick={() => setIsMenuPanelOpen(true)}
                    >
                      <MenuIcon width={20} height={20} color="#1e1e1e" />
                    </IconButton>

                    {/* ---------- User Management: admins ONLY ---------- */}
                    {plan.canManageUsers && isAdmin && (
                      <IconButton
                        variant="soft"
                        size="md"
                        aria-label="User Management"
                        tooltip="User Management"
                        onClick={() => setIsUserManagementOpen(true)}
                      >
                        <UsersIcon width={20} height={20} color="#1e1e1e" />
                      </IconButton>
                    )}
                  </>
                )}

                {isPlatformAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsTenantManagerOpen(true)}
                    leftIcon={
                      <StoreIcon width={16} height={16} fill="#1e1e1e" />
                    }
                  >
                    Stores
                  </Button>
                )}

                <Button size="sm" variant="danger" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                {(!tenant || isAdminView || isSmartAdminHost) && (
                  <Button size="xs" onClick={handleLogin}>
                    Sign In
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      {isUserManagementOpen && tenant && isAdmin && (
        <UserManagement
          tenantSlug={tenant.slug}
          onClose={() => setIsUserManagementOpen(false)}
        />
      )}

      {isMenuPanelOpen && (
        <AdminPanel onClose={() => setIsMenuPanelOpen(false)} />
      )}

      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
      />

      {isTenantManagerOpen && (
        <TenantManager onClose={() => setIsTenantManagerOpen(false)} />
      )}

      {plan.canWishlist && (
        <WishlistPanel
          isOpen={isWishlistOpen}
          onClose={() => setIsWishlistOpen(false)}
          onItemClick={handleWishlistItemClick}
        />
      )}

      {/* InfoPopup: mount only for admins so staff can never reach it. */}
      {showAdminAvatar && isAdmin && (
        <InfoPopup isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
      )}
    </>
  );
};

export default Header;