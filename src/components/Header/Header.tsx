// components/Header/Header.tsx
import React, { useState } from 'react';
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
import WishlistIcon from '../../assets/svgs/WishlistIcon';
import WishlistFilledIcon from '../../assets/svgs/WishlistFilledIcon';
import styles from './Header.module.scss';
import { MenuIcon, UsersIcon, StoreIcon } from '../../assets/svgs';
import { authService } from '../../services/auth.service';

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

  const handleLogin = () => setIsLoginOpen(true);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  const handleLogoutAll = () => {
  if (
    window.confirm(
      'Log out of every store on this browser? You will need to sign in again on each store.',
    )
  ) {
    authService.logoutAll();
  }
};

  const handleWishlistItemClick = (item: MenuItem) => {
    onWishlistItemClick?.(item);
  };

  return (
    <>
      <div className={styles.bm_header}>
        <div className={styles.container}>
          <div className={styles.brand}>
            {!isAuthenticated ? (
              <span className={styles.companyName}>
                {tenant ? tenant.displayName : `${companyName} ${year}`}
              </span>
            ) : (
              <span className={styles.tagline}>{user?.name}</span>
            )}
          </div>

          <div className={styles.actions}>
            {/* ============ WISHLIST ICON (customers) ============ */}
            {showWishlist && (
              <button
                className={styles.wishlistBtn}
                onClick={() => setIsWishlistOpen(true)}
                aria-label="Open wishlist"
                title="Wishlist"
                type="button"
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
                {/* ============ TENANT-SCOPED BUTTONS ============ */}
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

                    {/* Users button: only admins (platform or tenant owner) */}
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

                {/* ============ PLATFORM ADMIN ONLY ============ */}
                {isPlatformAdmin && (
                  <>
                    <button
                      className={styles.adminBtn}
                      onClick={() => setIsTenantManagerOpen(true)}
                      title="Manage Stores"
                    >
                      <StoreIcon width={20} height={20} fill="#1e1e1e" />
                      <span style={{ marginLeft: 4 }}>Stores</span>
                    </button>
                    <button className={styles.logoutBtn} onClick={handleLogoutAll}>
                      Logout All
                    </button>
                  </>
                )}

                <button className={styles.logoutBtn} onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                {/* Sign In still available alongside wishlist */}
                <button className={styles.loginBtn} onClick={handleLogin}>
                  Sign In
                </button>
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
    </>
  );
};

export default Header;