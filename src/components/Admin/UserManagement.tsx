// components/Admin/UserManagement.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
import { supabaseService } from '../../services/supabase.service';
import {
  Modal,
  ConfirmDialog,
  Button,
  IconButton,
  Input,
  Select,
  FormField,
  Banner,
  EmptyState,
  Avatar,
} from '../ui';
import { CloseIcon, PlusIcon } from '../../assets/svgs';
import local from './UserManagement.module.scss';

interface UserManagementProps {
  onClose: () => void;
  tenantSlug: string;
}

type ConfirmState = {
  title: string;
  message: string;
  confirmText: string;
  variant: 'primary' | 'danger' | 'warning';
  action: () => void | Promise<void>;
};

const UserManagement: React.FC<UserManagementProps> = ({
  onClose,
  tenantSlug,
}) => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState('');

  const [newUser, setNewUser] = useState({
    phone: '',
    name: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });

  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (error) {
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setError(''), 3000);
    }
    if (success) {
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(''), 3000);
    }
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [error, success]);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  const loadUsers = async () => {
    setLoading(true);
    const list = await supabaseService.getUsers(tenantSlug);
    setUsers(list);
    setLoading(false);
  };

  const generateRandomPassword = (): string => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 })
      .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
      .join('');
  };

  // ---- Actions ----
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      setShowCreate(false);
      loadUsers();
    } catch (err: any) {
      setError(err?.message || 'Failed to create user');
    }
  };

  const handleToggleStatus = (user: User) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    setConfirm({
      title: `${user.isActive ? 'Deactivate' : 'Activate'} User`,
      message: `Are you sure you want to ${action} user "${user.name}"?`,
      confirmText: `Yes, ${user.isActive ? 'Deactivate' : 'Activate'}`,
      variant: user.isActive ? 'warning' : 'primary',
      action: async () => {
        setConfirm(null);
        const result = await supabaseService.toggleUserStatus(user.id);
        if (result) {
          setSuccess(`User ${action}d successfully`);
          loadUsers();
        } else {
          setError(`Failed to ${action} user`);
        }
      },
    });
  };

  const handleDeleteUser = (user: User) => {
    setConfirm({
      title: 'Delete User',
      message: `Permanently delete "${user.name}"? This cannot be undone.`,
      confirmText: 'Yes, Delete User',
      variant: 'danger',
      action: async () => {
        setConfirm(null);
        const ok = await supabaseService.deleteUser(user.id);
        if (ok) {
          setSuccess('User deleted successfully');
          loadUsers();
        } else {
          setError('Failed to delete user');
        }
      },
    });
  };

  const handleResetPassword = (user: User) => {
    if (resetValue.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const newPw = resetValue;
    setConfirm({
      title: 'Reset Password',
      message: `Reset password for "${user.name}"?`,
      confirmText: 'Yes, Reset Password',
      variant: 'warning',
      action: async () => {
        setConfirm(null);
        const ok = await supabaseService.changeUserPassword(user.id, newPw);
        if (ok) {
          setSuccess('Password reset successfully');
          setResetTarget(null);
          setResetValue('');
          loadUsers();
          alert(`New password for ${user.name}: ${newPw}`);
        } else {
          setError('Failed to reset password');
        }
      },
    });
  };

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title="User Management"
        size="md"
        footer={
          <Button
            leftIcon={<PlusIcon width={16} height={16} fill="#fff" />}
            onClick={() => setShowCreate(true)}
          >
            Add User
          </Button>
        }
      >
        {error && (
          <Banner variant="error" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}
        {success && (
          <Banner variant="success" onDismiss={() => setSuccess('')}>
            {success}
          </Banner>
        )}

        {loading ? (
          <EmptyState title="Loading users..." />
        ) : users.length === 0 ? (
          <EmptyState
            title="No users yet"
            description="Add your first staff member to get started."
          />
        ) : (
          <div className={local.grid}>
            {users.map((user) => {
              const isCurrent = user.id === currentUser?.id;
              const isOwner = user.role === 'admin';
              const isResetting = resetTarget === user.id;
              return (
                <div
                  key={user.id}
                  className={`${local.userCard} ${isCurrent ? local.currentUser : ''}`}
                >
                  <div className={local.cardHeader}>
                    <div className={local.identity}>
                      <Avatar name={user.name} size="sm" />
                      <span className={local.name}>{user.name}</span>
                      <span className={local.roleBadge}>{user.role}</span>
                    </div>
                    <span
                      className={
                        user.isActive ? local.active : local.inactive
                      }
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className={local.row}>
                    <label>Phone</label>
                    <span>{user.phone}</span>
                  </div>

                  {isResetting ? (
                    <div className={local.resetBlock}>
                      <FormField label="New password">
                        <Input
                          type="text"
                          value={resetValue}
                          onChange={(e) => setResetValue(e.target.value)}
                          placeholder="Min 6 characters"
                          rightIcon={
                            <span
                              role="button"
                              tabIndex={0}
                              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                              onClick={() => setResetValue(generateRandomPassword())}
                            >
                              🎲
                            </span>
                          }
                        />
                      </FormField>
                      <div className={local.resetActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResetTarget(null);
                            setResetValue('');
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResetPassword(user)}
                        >
                          Confirm
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={local.actions}>
                      {isOwner ? (
                        <span className={local.ownerNote}>
                          Owner account · cannot be modified
                        </span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.isActive ? 'Lock' : 'Unlock'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setResetTarget(user.id);
                              setResetValue('');
                            }}
                          >
                            Reset Password
                          </Button>
                          {!isCurrent && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteUser(user)}
                            >
                              Remove
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Create user modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New User"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-user-form">
              Create User
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser}>
          <div className={local.formGrid}>
            <FormField label="Phone Number" required>
              <Input
                type="tel"
                value={newUser.phone}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                  })
                }
                placeholder="10-digit phone"
                maxLength={10}
                required
              />
            </FormField>

            <FormField label="Full Name" required>
              <Input
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                required
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                minLength={6}
                required
                rightIcon={
                  <span
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    onClick={() =>
                      setNewUser({
                        ...newUser,
                        password: generateRandomPassword(),
                      })
                    }
                  >
                    🎲
                  </span>
                }
              />
            </FormField>

            <FormField label="Role">
              <Select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({
                    ...newUser,
                    role: e.target.value as 'admin' | 'user',
                  })
                }
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmText={confirm?.confirmText}
        variant={confirm?.variant}
        onConfirm={() => confirm?.action()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

export default UserManagement;