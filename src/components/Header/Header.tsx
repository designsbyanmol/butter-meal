// components/Header/Header.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { useWishlist } from '../../hooks/useWishlist';
import { useCustomerName } from '../../hooks/useCustomerName';
import { MenuItem } from '../../types';
import LoginModal from '../Auth/LoginModal';
import UserManagement from '../Admin/UserManagement';
import AdminPanel from '../Admin/AdminPanel';
import StoreModal from '../Store/StoreModal';
import TenantManager from '../Admin/TenantManager';
import WishlistPanel from '../Menu/WishlistPanel';
import InfoPopup from '../Store/InfoPopup';
import WishlistIcon from '../../assets/svgs/WishlistIcon';
import WishlistFilledIcon from '../../assets/svgs/WishlistFilledIcon';
import styles from './Header.module.scss';
import { MenuIcon, UsersIcon, StoreIcon } from '../../assets/svgs';
import {
  subscribeAdminAction,
  AdminAction,
} from '../../utils/adminEvents';

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
          setIsUserManagementOpen(true);
          break;
        case 'open-info-popup':
          setIsInfoOpen(true);
          break;
        case 'open-tenant-manager':
          setIsTenantManagerOpen(true);
          break;
      }
    });
    return unsubscribe;
  }, []);

  // ---------------------------------------------------------
  // Hide the entire header on the plain main host.
  // Only shows when:
  //   - a tenant exists (any ?t= URL), OR
  //   - the main host has ?_smart-admin
  // ---------------------------------------------------------
  const shouldHideHeader = !tenant && !isSmartAdminHost;

  // ---------------------------------------------------------
  // Visibility rules
  // ---------------------------------------------------------
  const isPlatformAdmin = isAdmin && !tenant;
  const canManageTenant = isAuthenticated && !!tenant && !isDeactivated;

  // Wishlist only for the customer view
  const showWishlist = !!tenant && !isDeactivated && !isAdminView;

  // Admin avatar — only when logged in and inside a tenant context
  const showAdminAvatar = isAuthenticated && !!tenant && !isDeactivated;

  // Is the current URL an admin context?
  //   - ?_smart-admin           → main host admin view
  //   - ?t=<slug>_admin         → tenant owner view
  const isAdminContext = isSmartAdminHost || isAdminView;

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
  // Decide what to render on the left (brand text area)
  // ---------------------------------------------------------
  const renderBrandText = () => {
    // 1. Logged-in admin or staff → show their name, regardless of view
    if (isAuthenticated && user?.name) {
      return <span className={styles.tagline}>{user.name}</span>;
    }

    // 2. Not logged in, but on an admin URL:
    //    - ?t=<slug>_admin  → show the store's owner name (tenant.displayName)
    //    - ?_smart-admin    → show "Platform Admin" placeholder
    // Never show the customer greeting here.
    if (isAdminContext) {
      if (isSmartAdminHost && !tenant) {
        return (
          <span className={styles.companyName}>
            {companyName} {year}
          </span>
        );
      }
      return (
        <span className={styles.companyName}>
          {tenant ? tenant.displayName : `${companyName} ${year}`}
        </span>
      );
    }

    // 3. Customer view with a saved name → "Hey! {name}"
    const hasCustomerName = customerName.trim().length > 0;
    if (hasCustomerName) {
      return (
        <span className={styles.customerGreeting}>
          Hey! <strong>{customerName}</strong>
        </span>
      );
    }

    // 4. Fallback — store name / company name
    return (
      <span className={styles.companyName}>
        {tenant ? tenant.displayName : `${companyName} ${year}`}
      </span>
    );
  };

  // Early return AFTER all hooks have been called
  if (shouldHideHeader) return null;

  return (
    <>
      <div className={styles.bm_header}>
        <div className={styles.container}>
          {/* ============ LEFT: avatar + brand ============ */}
          <div className={styles.brand}>
            {showAdminAvatar && isAdmin && (
              <button
                type="button"
                className={styles.avatarBtn}
                onClick={() => setIsInfoOpen(true)}
                title="Store informations"
                aria-label="Open store informations"
              >
                {avatarInitial}
              </button>
            )}

            <span className={styles.brandText}>
              {renderBrandText()}
            </span>

            {isSmartAdminHost && !tenant && (
              <span className={styles.smartAdminBadge}>Smart Admin</span>
            )}

            {isAdminView && tenant && !isAuthenticated && (
              <span className={styles.adminViewBadge}>Admin</span>
            )}
          </div>

          {/* ============ RIGHT: actions ============ */}
          <div className={styles.actions}>
            {/* Wishlist (customers only) */}
            {showWishlist && !isAuthenticated && (
              <button
                type="button"
                className={styles.wishlistBtn}
                onClick={() => setIsWishlistOpen(true)}
                aria-label="Open wishlist"
                title="Wishlist"
              >
                {wishlistCount > 0 ? (
                  <WishlistFilledIcon width={20} height={20} fill="#e23744" />
                ) : (
                  <WishlistIcon width={20} height={20} fill="#1e1e1e" />
                )}
                {wishlistCount > 0 && (
                  <span className={styles.wishlistBadge}>
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </button>
            )}

            {isAuthenticated ? (
              <>
                {canManageTenant && (
                  <>
                    <button
                      className={styles.adminBtn}
                      onClick={() => setIsStoreModalOpen(true)}
                      title="Store Settings"
                    >
                      <StoreIcon width={20} height={20} fill="#1e1e1e" />
                    </button>

                    <button
                      className={styles.adminBtn}
                      onClick={() => setIsMenuPanelOpen(true)}
                      title="Manage Menu"
                    >
                      <MenuIcon width={20} height={20} color="#1e1e1e" />
                    </button>

                    {isAdmin && (
                      <button
                        className={styles.adminBtn}
                        onClick={() => setIsUserManagementOpen(true)}
                        title="User Management"
                      >
                        <UsersIcon width={20} height={20} color="#1e1e1e" />
                      </button>
                    )}
                  </>
                )}

                {isPlatformAdmin && (
                  <button
                    className={styles.adminBtn}
                    onClick={() => setIsTenantManagerOpen(true)}
                    title="Manage Stores"
                  >
                    <StoreIcon width={20} height={20} fill="#1e1e1e" />
                    <span style={{ marginLeft: 4 }}>Stores</span>
                  </button>
                )}

                <button className={styles.logoutBtn} onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                {(!tenant || isAdminView || isSmartAdminHost) && (
                  <button className={styles.loginBtn} onClick={handleLogin}>
                    Sign In
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============ MODALS ============ */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {isUserManagementOpen && tenant && (
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

      <WishlistPanel
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        onItemClick={handleWishlistItemClick}
      />

      {showAdminAvatar && (
        <InfoPopup
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
        />
      )}
    </>
  );
};

export default Header;