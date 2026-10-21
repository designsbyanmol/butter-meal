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

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    action: () => void;
    type: "warning" | "danger" | "info";
  } | null>(null);

  // ✅ Post-reset handoff dialog (shows the new password once)
  const [handoffDialog, setHandoffDialog] = useState<{
    userName: string;
    userPhone: string;
    password: string;
  } | null>(null);

  // Auto-hide error and success messages after 3 seconds
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
      errorTimeoutRef.current = setTimeout(() => setError(""), 3000);
    }
    if (success) {
      successTimeoutRef.current = setTimeout(() => setSuccess(""), 3000);
    }

    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, [error, success]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ✅ Updated: after reset, show the new password in a handoff dialog
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

    const newPw = resetPassword.newPassword;
    const targetUser = { name: user.name, phone: user.phone, id: user.id };

    setConfirmDialog({
      isOpen: true,
      title: "Reset Password",
      message: `Reset password for "${user.name}"? Their current password will stop working immediately.`,
      confirmText: "Yes, Reset Password",
      cancelText: "Cancel",
      type: "warning",
      action: async () => {
        setConfirmDialog(null);
        clearMessages();
        const result = await resetUserPassword(userId, newPw);
        if (result.success) {
          setSuccess("Password reset successfully");
          setResetPassword(null);
          loadUsers();
          // ✅ Show the new password once for handoff
          setHandoffDialog({
            userName: targetUser.name,
            userPhone: targetUser.phone,
            password: newPw,
          });
        } else {
          setError(result.error || "Failed to reset password");
        }
      },
    });
  };

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

  const closeConfirmDialog = () => setConfirmDialog(null);

  // ✅ Generate a random 8-char password (skips ambiguous chars like 0/O, 1/l)
  const generateRandomPassword = (): string => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let pw = "";
    for (let i = 0; i < 8; i++) {
      pw += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pw;
  };

  // ✅ Copy helper for handoff dialog
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess("Password copied to clipboard");
    } catch {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setSuccess("Password copied to clipboard");
    }
  };

  // ✅ Build a ready-to-send WhatsApp message for handoff
  const buildHandoffMessage = (name: string, phone: string, pw: string): string => {
    return `Hi ${name}, your login details for the restaurant app:

Phone: ${phone}
Password: ${pw}

Please change your password after first login.`;
  };

  const openWhatsAppHandoff = (name: string, phone: string, pw: string) => {
    const msg = encodeURIComponent(buildHandoffMessage(name, phone, pw));
    // Assumes Indian numbers; adjust country code as needed
    const url = `https://wa.me/91${phone}?text=${msg}`;
    window.open(url, "_blank");
  };

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

          {error && (
            <div className={styles.errorMessage}>
              <span>{error}</span>
              <button
                className={styles.messageCloseBtn}
                onClick={() => setError("")}
                aria-label="Dismiss error"
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
                aria-label="Dismiss success"
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
                        Generate random
                      </button>
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
                      {/* ✅ Masked display — passwords are hashed and cannot be viewed */}
                      <span className={styles.passwordHint}>
                        #protected
                        <span className={styles.passwordHintText}>
                          (reset to change)
                        </span>
                      </span>
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
                              Choose a new password. You'll see it once so you can
                              share it with {user.name}.
                            </p>
                            <input
                              type="password"
                              placeholder="New password (min 6 chars)"
                              value={resetPassword.newPassword}
                              onChange={(e) =>
                                setResetPassword({
                                  ...resetPassword,
                                  newPassword: e.target.value,
                                })
                              }
                              className={styles.resetInput}
                              autoFocus
                            />
                            <button
                              type="button"
                              className={styles.generateBtn}
                              onClick={() =>
                                setResetPassword({
                                  ...resetPassword,
                                  newPassword: generateRandomPassword(),
                                })
                              }
                            >
                              Generate random
                            </button>
                            <div className={styles.button_wrap}>
                              <button
                                className={styles.resetConfirmBtn}
                                onClick={() => handleResetPassword(user.id)}
                                aria-label="Confirm password reset"
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

      {/* Confirmation Dialog Modal */}
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
                aria-label="Close"
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

      {/* ✅ Post-reset handoff dialog — shows the new password once */}
      {handoffDialog && (
        <div
          className={styles.confirmOverlay}
          onClick={() => setHandoffDialog(null)}
        >
          <div
            className={`${styles.confirmDialog} ${styles.info}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.confirmHeader}>
              <h3>Password Reset Complete</h3>
              <button
                className={styles.confirmCloseBtn}
                onClick={() => setHandoffDialog(null)}
                aria-label="Close"
              >
                <CloseIcon width={18} height={18} fill="#666" />
              </button>
            </div>
            <div className={styles.confirmBody}>
              <p>
                New password for <strong>{handoffDialog.userName}</strong>:
              </p>
              <div className={styles.passwordHandoff}>
                <code>{handoffDialog.password}</code>
                <button
                  className={styles.copyBtn}
                  onClick={() => copyToClipboard(handoffDialog.password)}
                  aria-label="Copy password"
                >
                  Copy
                </button>
              </div>
              <p className={styles.handoffNote}>
                ⚠️ This password will not be shown again. Share it with{" "}
                {handoffDialog.userName} now and ask them to change it after
                first login.
              </p>
            </div>
            <div className={styles.confirmFooter}>
              <button
                className={styles.confirmCancelBtn}
                onClick={() => setHandoffDialog(null)}
              >
                Close
              </button>
              <button
                className={`${styles.confirmActionBtn} ${styles.infoBtn}`}
                onClick={() =>
                  openWhatsAppHandoff(
                    handoffDialog.userName,
                    handoffDialog.userPhone,
                    handoffDialog.password,
                  )
                }
              >
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;