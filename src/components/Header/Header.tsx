// components/Header/Header.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { useWishlist } from '../../hooks/useWishlist';
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
} from '../../../utils/adminEvents';

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
  const { tenant, isDeactivated } = useTenant();
  const { count: wishlistCount } = useWishlist();

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
  // Visibility rules
  // ---------------------------------------------------------

  // Platform admin = admin who is NOT scoped to any tenant.
  // Only the main host (no ?t= slug) qualifies.
  const isPlatformAdmin = isAdmin && !tenant;

  // Tenant-scoped buttons only make sense when a tenant exists
  // AND it's not deactivated.
  const canManageTenant = isAuthenticated && !!tenant && !isDeactivated;

  // Wishlist only makes sense for a real, active, storefront URL
  // (i.e. not on the platform host and not on a deactivated store).
  const showWishlist = !!tenant && !isDeactivated;

  // Admin avatar — only when logged in and inside a tenant context
  const showAdminAvatar = isAuthenticated && !!tenant && !isDeactivated;

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
              {!isAuthenticated ? (
                <span className={styles.companyName}>
                  {tenant ? tenant.displayName : `${companyName} ${year}`}
                </span>
              ) : (
                <span className={styles.tagline}>{user?.name}</span>
              )}
            </span>
          </div>

          {/* ============ RIGHT: actions ============ */}
          <div className={styles.actions}>
            {/* ---- Wishlist icon (customers) ---- */}
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
                {/* ---- Tenant-scoped buttons ---- */}
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

                {/* ---- Platform admin only ---- */}
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
              <button className={styles.loginBtn} onClick={handleLogin}>
                Sign In
              </button>
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