// components/Admin/UserManagement.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { User } from "../../types";
import styles from "./UserManagement.module.scss";
import { CloseIcon, CheckIcon } from "../../assets/svgs";

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
    user: currentUser,
  } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Fix: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create user form state
  const [newUser, setNewUser] = useState({
    phone: "",
    name: "",
    password: "",
    role: "user" as "admin" | "user",
  });

  // Reset password state
  const [resetPassword, setResetPassword] = useState<{
    userId: string;
    newPassword: string;
  } | null>(null);

  // ✅ State for confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    action: () => void;
    type: "warning" | "danger" | "info";
  } | null>(null);

  // ✅ Auto-hide error and success messages after 3 seconds
  useEffect(() => {
    // Clear previous timeouts
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    // Auto-hide error after 3 seconds
    if (error) {
      errorTimeoutRef.current = setTimeout(() => {
        setError("");
      }, 3000);
    }

    // Auto-hide success after 3 seconds
    if (success) {
      successTimeoutRef.current = setTimeout(() => {
        setSuccess("");
      }, 3000);
    }

    // Cleanup timeouts on unmount
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [error, success]);

  // ✅ Clear messages manually
  const clearMessages = () => {
    setError("");
    setSuccess("");
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!isAdmin) {
      setError("Access denied. Admin only.");
      return;
    }
    setLoading(true);
    const usersList = await getAllUsers();
    setUsers(usersList);
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const result = await createUser(
      newUser.phone,
      newUser.password,
      newUser.name,
      newUser.role,
    );

    if (result.success) {
      setSuccess("User created successfully!");
      setNewUser({ phone: "", name: "", password: "", role: "user" });
      setShowCreateForm(false);
      loadUsers();
    } else {
      setError(result.error || "Failed to create user");
    }
  };

  // ✅ Updated handleToggleStatus with confirmation
  const handleToggleStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const action = user.isActive ? "deactivate" : "activate";
    const actionText = user.isActive ? "Deactivate" : "Activate";

    setConfirmDialog({
      isOpen: true,
      title: `${actionText} User`,
      message: `Are you sure you want to ${action} user "${user.name}"?`,
      confirmText: `Yes, ${actionText}`,
      cancelText: "Cancel",
      type: user.isActive ? "warning" : "info",
      action: async () => {
        setConfirmDialog(null);
        clearMessages();
        const result = await toggleUserStatus(userId);
        if (result.success) {
          setSuccess(`User ${action}ed successfully`);
          loadUsers();
        } else {
          setError(result.error || `Failed to ${action} user`);
        }
      },
    });
  };

  // ✅ Updated handleResetPassword with confirmation
  const handleResetPassword = async (userId: string) => {
    if (!resetPassword || resetPassword.userId !== userId) {
      setResetPassword({ userId, newPassword: "" });
      return;
    }

    if (resetPassword.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setConfirmDialog({
      isOpen: true,
      title: "Reset Password",
      message: `Are you sure you want to reset password for user "${user.name}"?`,
      confirmText: "Yes, Reset Password",
      cancelText: "Cancel",
      type: "warning",
      action: async () => {
        setConfirmDialog(null);
        clearMessages();
        const result = await resetUserPassword(
          userId,
          resetPassword.newPassword,
        );
        if (result.success) {
          setSuccess("Password reset successfully");
          setResetPassword(null);
          loadUsers();
        } else {
          setError(result.error || "Failed to reset password");
        }
      },
    });
  };

  // ✅ Updated handleDeleteUser with confirmation
  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setConfirmDialog({
      isOpen: true,
      title: "Delete User",
      message: `Are you sure you want to permanently delete user "${user.name}"? This action cannot be undone!`,
      confirmText: "Yes, Delete User",
      cancelText: "Cancel",
      type: "danger",
      action: async () => {
        setConfirmDialog(null);
        clearMessages();
        const result = await deleteUser(userId);
        if (result.success) {
          setSuccess("User deleted successfully");
          loadUsers();
        } else {
          setError(result.error || "Failed to delete user");
        }
      },
    });
  };

  // ✅ Close confirmation dialog
  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <h2>Access Denied</h2>
            <button className={styles.closeBtn} onClick={onClose}>
              <CloseIcon width={18} height={18} fill="#4d4d4d" />
            </button>
          </div>
          <div className={styles.errorMessage} style={{ margin: "20px" }}>
            You don't have permission to access this page.
          </div>
        </div>
      </div>
    );
  }

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

          {/* ✅ Error and Success with auto-hide and manual close */}
          {error && (
            <div className={styles.errorMessage}>
              <span>{error}</span>
              <button
                className={styles.messageCloseBtn}
                onClick={() => setError("")}
              >
                <CloseIcon width={14} height={14} fill="#dc3545" />
              </button>
            </div>
          )}
          {success && (
            <div className={styles.successMessage}>
              <span>{success}</span>
              <button
                className={styles.messageCloseBtn}
                onClick={() => setSuccess("")}
              >
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
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10),
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
                    </div>
                    <div className={styles.formGroup}>
                      <label>Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            role: e.target.value as "admin" | "user",
                          })
                        }
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.submitBtn_wrap}>
                    {showCreateForm && (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setShowCreateForm(false)}
                      >
                        Cancel
                      </button>
                    )}
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
                      ${user.id === currentUser?.id ? styles.currentUser : ""} ${styles.user_item}`}
                  >
                    <div className={`${styles.row} ${styles.head}`}>
                      <div className={styles.head_in}>
                        <span>{user.name}</span>
                        <span
                          className={
                            user.role === "admin"
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
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <label htmlFor="phone">Phone</label>
                      <span>{user.phone}</span>
                    </div>
                    <div className={styles.row}>
                      <label htmlFor="pass">Password</label>
                      <span>{user.password}</span>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.actionButtons}>
                        {user.role !== "admin" && (
                          <button
                            className={styles.toggleBtn}
                            onClick={() => handleToggleStatus(user.id)}
                            title={user.isActive ? "Deactivate" : "Activate"}
                          >
                            {user.isActive ? "Lock" : "Unlock"}
                          </button>
                        )}
                        {resetPassword?.userId === user.id ? (
                          <div className={styles.resetPasswordForm}>
                            <h2>Reset {user.name}'s Password</h2>
                            <p>
                              Make sure that this is your final decision and
                              this should be done when you are very sure.
                            </p>
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
                                Cancel Reset
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className={styles.resetBtn}
                            onClick={() =>
                              setResetPassword({
                                userId: user.id,
                                newPassword: "",
                              })
                            }
                            title="Reset Password"
                          >
                            Reset Password
                          </button>
                        )}
                        {user.id !== currentUser?.id && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete User"
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

      {/* ✅ Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className={styles.confirmOverlay} onClick={closeConfirmDialog}>
          <div
            className={`${styles.confirmDialog} ${styles[confirmDialog.type]}`}
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
                className={`${styles.confirmActionBtn} ${styles[confirmDialog.type + "Btn"]}`}
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
