// components/Admin/UserManagement.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
import styles from './UserManagement.module.scss';

interface UserManagementProps {
  onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => {
  const { 
    getAllUsers, 
    createUser, 
    toggleUserStatus, 
    resetUserPassword, 
    deleteUser, 
    isAdmin, 
    user: currentUser 
  } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create user form state
  const [newUser, setNewUser] = useState({
    phone: '',
    name: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });

  // Reset password state
  const [resetPassword, setResetPassword] = useState<{ userId: string; newPassword: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!isAdmin) {
      setError('Access denied. Admin only.');
      return;
    }
    setLoading(true);
    const usersList = await getAllUsers();
    setUsers(usersList);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const result = await createUser(
      newUser.phone,
      newUser.password,
      newUser.name,
      newUser.role
    );

    if (result.success) {
      setSuccess('User created successfully!');
      setNewUser({ phone: '', name: '', password: '', role: 'user' });
      setShowCreateForm(false);
      loadUsers();
    } else {
      setError(result.error || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    setError('');
    setSuccess('');
    const result = await toggleUserStatus(userId);
    if (result.success) {
      setSuccess('User status updated');
      loadUsers();
    } else {
      setError(result.error || 'Failed to toggle status');
    }
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

    setError('');
    setSuccess('');
    const result = await resetUserPassword(userId, resetPassword.newPassword);
    if (result.success) {
      setSuccess('Password reset successfully');
      setResetPassword(null);
    } else {
      setError(result.error || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    setError('');
    setSuccess('');
    const result = await deleteUser(userId);
    if (result.success) {
      setSuccess('User deleted successfully');
      loadUsers();
    } else {
      setError(result.error || 'Failed to delete user');
    }
  };

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <h2>Access Denied</h2>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
          <div className={styles.errorMessage} style={{ margin: '20px' }}>
            You don't have permission to access this page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>User Management</h2>
          <div className={styles.headerActions}>
            <button 
              className={styles.createBtn}
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : '+ Add User'}
            </button>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        {showCreateForm && (
          <div className={styles.createForm}>
            <h3>Create New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
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
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
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
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    placeholder="Enter password (min 6 chars)"
                    minLength={6}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button type="submit" className={styles.submitBtn}>Create User</button>
            </form>
          </div>
        )}

        <div className={styles.userList}>
          {loading ? (
            <div className={styles.loading}>Loading users...</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={user.id === currentUser?.id ? styles.currentUser : ''}>
                    <td>{user.phone}</td>
                    <td>{user.name}</td>
                    <td>
                      <span className={user.role === 'admin' ? styles.adminBadge : styles.userBadge}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={user.isActive ? styles.active : styles.inactive}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.toggleBtn}
                          onClick={() => handleToggleStatus(user.id)}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? '🔒' : '🔓'}
                        </button>
                        {resetPassword?.userId === user.id ? (
                          <div className={styles.resetPasswordForm}>
                            <input
                              type="password"
                              placeholder="New password"
                              value={resetPassword.newPassword}
                              onChange={(e) => setResetPassword({ ...resetPassword, newPassword: e.target.value })}
                              className={styles.resetInput}
                            />
                            <button
                              className={styles.resetConfirmBtn}
                              onClick={() => handleResetPassword(user.id)}
                            >
                              ✓
                            </button>
                            <button
                              className={styles.resetCancelBtn}
                              onClick={() => setResetPassword(null)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            className={styles.resetBtn}
                            onClick={() => setResetPassword({ userId: user.id, newPassword: '' })}
                            title="Reset Password"
                          >
                            🔑
                          </button>
                        )}
                        {user.id !== currentUser?.id && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;