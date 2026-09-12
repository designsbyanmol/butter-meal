// components/Admin/UserManagement.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
import { supabaseService } from '../../services/supabase.service';
import styles from './UserManagement.module.scss';
import { CloseIcon, CheckIcon } from '../../assets/svgs';

interface UserManagementProps {
  onClose: () => void;
  tenantSlug: string;
}

const UserManagement: React.FC<UserManagementProps> = ({
  onClose,
  tenantSlug,
}) => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [newUser, setNewUser] = useState({
    phone: '',
    name: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });

  const [resetPassword, setResetPassword] = useState<{
    userId: string;
    newPassword: string;
  } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    action: () => void;
    type: 'warning' | 'danger' | 'info';
  } | null>(null);

  useEffect(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    if (error) {
      errorTimeoutRef.current = setTimeout(() => setError(''), 3000);
    }
    if (success) {
      successTimeoutRef.current = setTimeout(() => setSuccess(''), 3000);
    }

    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, [error, success]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  const loadUsers = async () => {
    setLoading(true);
    const usersList = await supabaseService.getUsers(tenantSlug);
    setUsers(usersList);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    try {
      await supabaseService.createUser(tenantSlug, {
        phone: newUser.phone,
        name: newUser.name,
        password: newUser.password,
        role: newUser.role,
        isActive: true,
      });
      setSuccess('User created successfully!');
      setNewUser({ phone: '', name: '', password: '', role: 'user' });
      setShowCreateForm(false);
      loadUsers();
    } catch (err: any) {
      setError(err?.message || 'Failed to create user');
    }
  };

  const handleToggleStatus = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const action = user.isActive ? 'deactivate' : 'activate';
    const actionText = user.isActive ? 'Deactivate' : 'Activate';

    setConfirmDialog({
      isOpen: true,
      title: `${actionText} User`,
      message: `Are you sure you want to ${action} user "${user.name}"?`,
      confirmText: `Yes, ${actionText}`,
      cancelText: 'Cancel',
      type: user.isActive ? 'warning' : 'info',
      action: async () => {
        setConfirmDialog(null);
        clearMessages();
        const result = await supabaseService.toggleUserStatus(userId);
        if (result) {
          setSuccess(`User ${action}ed successfully`);
          loadUsers();
        } else {
          setError(`Failed to ${action} user`);
        }
      },
    });
  };

  const handleResetPassword = async (userId: string) => {
    if (!resetPassword || resetPassword.userId !== userId) {
      setResetPassword({ userId, newPassword: '' });
      return;
    }
    if (resetPassword.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const newPw = resetPassword.newPassword;
    const target = { name: user.name, phone: user.phone, id: user.id };

    setConfirmDialog({
      isOpen: true,
      title: 'Reset Password',
      message: `Reset password for "${user.name}"?`,
      confirmText: 'Yes, Reset Password',
      cancelText: 'Cancel',
      type: 'warning',
      action: async () => {
        setConfirmDialog(null);
        clearMessages();
        const ok = await supabaseService.changeUserPassword(userId, newPw);
        if (ok) {
          setSuccess('Password reset successfully');
          setResetPassword(null);
          loadUsers();
          // Show handoff dialog
          alert(`New password for ${target.name}: ${newPw}`);
        } else {
          setError('Failed to reset password');
        }
      },
    });
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: `Permanently delete "${user.name}"? This cannot be undone.`,
      confirmText: 'Yes, Delete User',
      cancelText: 'Cancel',
      type: 'danger',
      action: async () => {
        setConfirmDialog(null);
        clearMessages();
        const ok = await supabaseService.deleteUser(userId);
        if (ok) {
          setSuccess('User deleted successfully');
          loadUsers();
        } else {
          setError('Failed to delete user');
        }
      },
    });
  };

  const closeConfirmDialog = () => setConfirmDialog(null);

  const generateRandomPassword = (): string => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let pw = '';
    for (let i = 0; i < 8; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pw;
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2>User Management</h2>
            <div className={styles.headerActions}>
              <button className={styles.closeBtn} onClick={onClose}>
                <CloseIcon width={18} height={18} fill="#4d4d4d" />
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <span>{error}</span>
              <button onClick={() => setError('')}>
                <CloseIcon width={14} height={14} fill="#dc3545" />
              </button>
            </div>
          )}
          {success && (
            <div className={styles.successMessage}>
              <span>{success}</span>
              <button onClick={() => setSuccess('')}>
                <CloseIcon width={14} height={14} fill="#085b1b" />
              </button>
            </div>
          )}

          {showCreateForm && (
            <div className={styles.createForm}>
              <div className={styles.createForm_in}>
                <h3>Create New User</h3>
                <form onSubmit={handleCreateUser}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        value={newUser.phone}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            phone: e.target.value
                              .replace(/\D/g, '')
                              .slice(0, 10),
                          })
                        }
                        required
                        placeholder="Enter phone number"
                        maxLength={10}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser({ ...newUser, name: e.target.value })
                        }
                        required
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Password</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        required
                        placeholder="Enter password (min 6 chars)"
                        minLength={6}
                      />
                      <button
                        type="button"
                        className={styles.generateBtn}
                        onClick={() =>
                          setNewUser({
                            ...newUser,
                            password: generateRandomPassword(),
                          })
                        }
                      >
                        🎲 Generate
                      </button>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            role: e.target.value as 'admin' | 'user',
                          })
                        }
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.submitBtn_wrap}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className={styles.submitBtn}>
                      Create User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className={styles.userList}>
            {loading ? (
              <div className={styles.loading}>Loading users...</div>
            ) : (
              <div className={styles.table}>
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`
                      ${
                        user.id === currentUser?.id ? styles.currentUser : ''
                      } ${styles.user_item}`}
                  >
                    <div className={`${styles.row} ${styles.head}`}>
                      <div className={styles.head_in}>
                        <span>{user.name}</span>
                        <span
                          className={
                            user.role === 'admin'
                              ? styles.adminBadge
                              : styles.userBadge
                          }
                        >
                          {user.role}
                        </span>
                      </div>
                      <span
                        className={
                          user.isActive ? styles.active : styles.inactive
                        }
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <label>Phone</label>
                      <span>{user.phone}</span>
                    </div>
                    <div className={styles.row}>
                      <label>Password</label>
                      <span className={styles.passwordHint}>••••••••</span>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.actionButtons}>
                        {user.role !== 'admin' && (
                          <button
                            className={styles.toggleBtn}
                            onClick={() => handleToggleStatus(user.id)}
                          >
                            {user.isActive ? 'Lock' : 'Unlock'}
                          </button>
                        )}
                        {resetPassword?.userId === user.id ? (
                          <div className={styles.resetPasswordForm}>
                            <h2>Reset {user.name}'s Password</h2>
                            <input
                              type="password"
                              placeholder="New password"
                              value={resetPassword.newPassword}
                              onChange={(e) =>
                                setResetPassword({
                                  ...resetPassword,
                                  newPassword: e.target.value,
                                })
                              }
                              className={styles.resetInput}
                            />
                            <div className={styles.button_wrap}>
                              <button
                                className={styles.resetConfirmBtn}
                                onClick={() => handleResetPassword(user.id)}
                              >
                                <CheckIcon width={18} height={18} fill="#fff" />
                              </button>
                              <button
                                className={styles.resetCancelBtn}
                                onClick={() => setResetPassword(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className={styles.resetBtn}
                            onClick={() =>
                              setResetPassword({
                                userId: user.id,
                                newPassword: '',
                              })
                            }
                          >
                            Reset Password
                          </button>
                        )}
                        {user.id !== currentUser?.id && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className={styles.createBtn}
            onClick={() => setShowCreateForm(true)}
          >
            + Add User
          </button>
        </div>
      </div>

      {confirmDialog && (
        <div className={styles.confirmOverlay} onClick={closeConfirmDialog}>
          <div
            className={`${styles.confirmDialog} ${
              styles[confirmDialog.type]
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.confirmHeader}>
              <h3>{confirmDialog.title}</h3>
              <button
                className={styles.confirmCloseBtn}
                onClick={closeConfirmDialog}
              >
                <CloseIcon width={18} height={18} fill="#666" />
              </button>
            </div>
            <div className={styles.confirmBody}>
              <p>{confirmDialog.message}</p>
            </div>
            <div className={styles.confirmFooter}>
              <button
                className={styles.confirmCancelBtn}
                onClick={closeConfirmDialog}
              >
                {confirmDialog.cancelText}
              </button>
              <button
                className={`${styles.confirmActionBtn} ${
                  styles[confirmDialog.type + 'Btn']
                }`}
                onClick={confirmDialog.action}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;