// components/Header/Header.tsx
import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import LoginModal from "../Auth/LoginModal";
import UserManagement from "../Admin/UserManagement";
import AdminPanel from "../Admin/AdminPanel";
import StoreModal from "../Store/StoreModal";
import styles from "./Header.module.scss";
import { MenuIcon, UsersIcon, StoreIcon } from "../../assets/svgs";

interface HeaderProps {
  companyName: string;
  year: number;
}

const Header: React.FC<HeaderProps> = ({ companyName, year }) => {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isMenuPanelOpen, setIsMenuPanelOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  const handleLogin = () => setIsLoginOpen(true);
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <>
      <div className={styles.bm_header}>
        <div className={styles.container}>
          <div className={styles.brand}>
            {!isAuthenticated ? (
              <span className={styles.companyName}>
                {companyName} {year}
              </span>
            ) : (
              <span className={styles.tagline}>{user?.name}</span>
            )}
          </div>
          <div className={styles.actions}>
            {isAuthenticated ? (
              <>
                {/* ✅ Store button - Visible to ALL authenticated users */}
                <button
                  className={styles.adminBtn}
                  onClick={() => setIsStoreModalOpen(true)}
                  title="Store Settings"
                >
                  <StoreIcon width={20} height={20} fill="#1e1e1e" />
                </button>

                {/* ✅ Menu button - Visible to ALL authenticated users */}
                <button
                  className={styles.adminBtn}
                  onClick={() => setIsMenuPanelOpen(true)}
                  title="Manage Menu"
                >
                  <MenuIcon width={20} height={20} color="#1e1e1e" />
                </button>

                {/* ✅ Users button - Only visible to Admins */}
                {isAdmin && (
                  <button
                    className={styles.adminBtn}
                    onClick={() => setIsUserManagementOpen(true)}
                    title="User Management"
                  >
                    <UsersIcon width={20} height={20} color="#1e1e1e" />
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

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {isUserManagementOpen && (
        <UserManagement onClose={() => setIsUserManagementOpen(false)} />
      )}

      {isMenuPanelOpen && (
        <AdminPanel onClose={() => setIsMenuPanelOpen(false)} />
      )}

      {/* ✅ Store Modal - Visible to ALL authenticated users */}
      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
      />
    </>
  );
};

export default Header;
