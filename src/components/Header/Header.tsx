// components/Header/Header.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoginModal from '../Auth/LoginModal';
import UserManagement from '../Admin/UserManagement';
import styles from './Header.module.scss';

interface HeaderProps {
  companyName: string;
  year: number;
  onAdminOpen?: () => void;
}

const Header: React.FC<HeaderProps> = ({ companyName, year, onAdminOpen }) => {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  const handleLogin = () => setIsLoginOpen(true);
  const handleLogout = () => logout();

  return (
    <>
      <div className={styles.bm_header}>
        <div className={styles.container}>
          <div className={styles.brand}>
            <span className={styles.companyName}>{companyName} | {year}</span>
            <span className={styles.tagline}>Menu Management</span>
          </div>
          <div className={styles.actions}>
            {isAuthenticated ? (
              <>
                <div className={styles.userInfo}>
                  <span className={styles.userAvatar}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                  <span className={styles.userName}>{user?.name}</span>
                  <span className={styles.userPhone}>{user?.phone}</span>
                  {isAdmin && (
                    <span className={styles.adminBadge}>Admin</span>
                  )}
                </div>
                {isAdmin && (
                  <>
                    <button 
                      className={styles.adminBtn}
                      onClick={() => setIsUserManagementOpen(true)}
                    >
                      Users
                    </button>
                    {onAdminOpen && (
                      <button 
                        className={styles.adminBtn}
                        onClick={onAdminOpen}
                      >
                        Menu
                      </button>
                    )}
                  </>
                )}
                <button 
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <button 
                className={styles.loginBtn}
                onClick={handleLogin}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      {isUserManagementOpen && (
        <UserManagement
          onClose={() => setIsUserManagementOpen(false)}
        />
      )}
    </>
  );
};

export default Header;