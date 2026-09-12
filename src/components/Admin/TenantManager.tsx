// components/Admin/TenantManager.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabaseService } from '../../services/supabase.service';
import { Tenant } from '../../contexts/TenantContext';
import { credentialCache } from '../../services/credentialCache';
import { CloseIcon, PlusIcon } from '../../assets/svgs';
import styles from './TenantManager.module.scss';

interface TenantManagerProps {
  onClose: () => void;
}

interface TenantRow extends Tenant {
  url: string;
  ownerPhone?: string;
  ownerName?: string;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Human-friendly random password: skips ambiguous characters
// (0/O, 1/l/I) so it's easy to read aloud or type on a phone.
const generateRandomPassword = (length = 8): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let pw = '';
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
};

const formatGeneratedAt = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  return d.toLocaleDateString();
};

const TenantManager: React.FC<TenantManagerProps> = ({ onClose }) => {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // -------- Create modal state --------
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // -------- Edit form state --------
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerPhone, setEditOwnerPhone] = useState('');
  const [editWhatsappPhone, setEditWhatsappPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // -------- Copy-credentials modal state --------
  const [credentialsModal, setCredentialsModal] = useState<{
    displayName: string;
    url: string;
    phone: string;
    password: string;
    generatedAt: string;
    isNew: boolean;
  } | null>(null);
  const [showCredentialsPassword, setShowCredentialsPassword] = useState(false);

  // Auto-derive slug from display name until user edits it manually
  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugify(displayName));
    }
  }, [displayName, slugTouched]);

  const buildTenantUrl = (slug: string): string => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?t=${slug}`;
  };

  const loadTenants = async () => {
    setLoading(true);
    const list = await supabaseService.getAllTenants();

    const enriched: TenantRow[] = await Promise.all(
      list.map(async (t) => {
        const owner = await supabaseService.getTenantOwner(t.slug);
        return {
          ...t,
          url: buildTenantUrl(t.slug),
          ownerPhone: owner?.phone,
          ownerName: owner?.name,
        };
      }),
    );
    setTenants(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const flashError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const openInNewTab = (slug: string) => {
    window.open(buildTenantUrl(slug), '_blank');
  };

  // -------- Create modal open/close --------
  const openCreateModal = () => {
    setDisplayName('');
    setSlug('');
    setSlugTouched(false);
    setOwnerName('');
    setOwnerPhone('');
    setWhatsappPhone('');
    setOwnerPassword('');
    setShowPassword(false);
    setIsCreateOpen(true);
    setError('');
    setSuccess('');
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setIsCreateOpen(false);
  };

  // -------- Copy credentials (session-cached) --------
  const handleCopyCredentials = async (tenant: TenantRow) => {
    setError('');
    setSuccess('');

    const cached = credentialCache.get(tenant.slug);

    if (cached) {
      const owner = await supabaseService.getTenantOwner(tenant.slug);
      if (!owner) {
        flashError("Could not find this store's owner account");
        return;
      }

      setCredentialsModal({
        displayName: tenant.displayName,
        url: tenant.url,
        phone: owner.phone,
        password: cached.password,
        generatedAt: cached.generatedAt,
        isNew: false,
      });
      setShowCredentialsPassword(true);
      return;
    }

    const owner = await supabaseService.getTenantOwner(tenant.slug);
    if (!owner) {
      flashError("Could not find this store's owner account");
      return;
    }

    const newPassword = generateRandomPassword();
    const resetOk = await supabaseService.resetTenantOwnerPassword(
      tenant.slug,
      owner.phone,
      newPassword,
    );
    if (!resetOk) {
      flashError('Failed to prepare credentials');
      return;
    }

    const generatedAt = new Date().toISOString();
    credentialCache.set(tenant.slug, newPassword);

    setCredentialsModal({
      displayName: tenant.displayName,
      url: tenant.url,
      phone: owner.phone,
      password: newPassword,
      generatedAt,
      isNew: true,
    });
    setShowCredentialsPassword(true);
  };

  const copyCredentialsToClipboard = async () => {
    if (!credentialsModal) return;
    const { displayName, url, phone, password } = credentialsModal;
    const text =
      `*${displayName} — Login Details*\n\n` +
      `Store URL: ${url}\n` +
      `Phone: ${phone}\n` +
      `Password: ${password}\n\n` +
      `Keep these credentials safe.`;

    const ok = await copyToClipboard(text);
    if (ok) {
      flashSuccess('Credentials copied to clipboard');
    } else {
      flashError('Could not access clipboard');
    }
  };

  // -------- Create --------
  const validateCreateForm = (): string | null => {
    if (!displayName.trim()) return 'Store name is required';
    if (!slug.trim()) return 'URL slug is required';
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return 'Slug can only contain lowercase letters, numbers and hyphens';
    }
    if (tenants.some((t) => t.slug === slug)) {
      return 'A tenant with this URL slug already exists';
    }
    if (!ownerPhone.trim() || ownerPhone.length < 10) {
      return 'Owner phone must be at least 10 digits';
    }
    if (whatsappPhone && whatsappPhone.length < 10) {
      return 'WhatsApp number must be 10 digits (or leave blank)';
    }
    if (!ownerPassword || ownerPassword.length < 6) {
      return 'Owner password must be at least 6 characters';
    }
    return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateCreateForm();
    if (validationError) {
      flashError(validationError);
      return;
    }

    setIsCreating(true);
    try {
      const tenant = await supabaseService.createTenantWithOwner({
        displayName: displayName.trim(),
        slug: slug.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerName: ownerName.trim() || displayName.trim() + ' Owner',
        ownerPassword,
        whatsappPhone: whatsappPhone.trim() || undefined,
      });

      const generatedAt = new Date().toISOString();
      credentialCache.set(tenant.slug, ownerPassword);

      setIsCreateOpen(false);

      setCredentialsModal({
        displayName: tenant.displayName,
        url: buildTenantUrl(tenant.slug),
        phone: ownerPhone.trim(),
        password: ownerPassword,
        generatedAt,
        isNew: true,
      });
      setShowCredentialsPassword(true);

      await loadTenants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create store';
      flashError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // -------- Edit --------
  const startEditing = (tenant: TenantRow) => {
    setEditingTenant(tenant);
    setEditDisplayName(tenant.displayName);
    setEditOwnerName(tenant.ownerName ?? '');
    setEditOwnerPhone(tenant.ownerPhone ?? '');
    setEditWhatsappPhone(tenant.whatsappPhone ?? '');
    setEditPassword('');
    setShowEditPassword(false);
    setError('');
    setSuccess('');
  };

  const cancelEditing = () => {
    setEditingTenant(null);
    setEditDisplayName('');
    setEditOwnerName('');
    setEditOwnerPhone('');
    setEditWhatsappPhone('');
    setEditPassword('');
    setShowEditPassword(false);
  };

  const validateEditForm = (): string | null => {
    if (!editDisplayName.trim()) return 'Store name is required';
    if (!editOwnerPhone.trim() || editOwnerPhone.length < 10) {
      return 'Owner phone must be at least 10 digits';
    }
    if (editWhatsappPhone && editWhatsappPhone.length < 10) {
      return 'WhatsApp number must be 10 digits (or leave blank)';
    }
    if (editPassword && editPassword.length < 6) {
      return 'New password must be at least 6 characters';
    }
    return null;
  };

  const handleSaveEdit = async () => {
    if (!editingTenant) return;
    setError('');
    setSuccess('');

    const validationError = validateEditForm();
    if (validationError) {
      flashError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await supabaseService.updateTenant(
        editingTenant.slug,
        editDisplayName.trim(),
        editOwnerPhone.trim(),
        editWhatsappPhone.trim() || undefined,
      );

      if (editPassword.trim()) {
        const ok = await supabaseService.resetTenantOwnerPassword(
          editingTenant.slug,
          editOwnerPhone.trim(),
          editPassword,
        );
        if (!ok) {
          throw new Error('Store updated, but password reset failed');
        }
        credentialCache.set(editingTenant.slug, editPassword);
      }

      flashSuccess(`Store "${editDisplayName}" updated`);
      cancelEditing();
      await loadTenants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update store';
      flashError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // -------- Toggle active --------
  const handleToggleActive = async (tenant: TenantRow) => {
    if (tenant.slug === 'main') {
      flashError('The main store cannot be deactivated');
      return;
    }
    const isCurrentlyActive = tenant.isActive !== false;
    const targetState = !isCurrentlyActive;
    const actionLabel = isCurrentlyActive ? 'Deactivate' : 'Reactivate';

    const confirmed = window.confirm(
      isCurrentlyActive
        ? `Deactivate "${tenant.displayName}"? Its URL will stop serving the menu.`
        : `Reactivate "${tenant.displayName}"? Its URL will start serving the menu again.`,
    );
    if (!confirmed) return;

    const ok = await supabaseService.setTenantActive(tenant.slug, targetState);
    if (ok) {
      flashSuccess(`Store "${tenant.displayName}" ${actionLabel.toLowerCase()}d`);
      await loadTenants();
    } else {
      flashError(`Failed to ${actionLabel.toLowerCase()} store`);
    }
  };

  // -------- Delete --------
  const handleDelete = async (tenant: TenantRow) => {
    if (tenant.slug === 'main') {
      flashError('The main store cannot be deleted');
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${tenant.displayName}"?\n\n` +
        `This will erase:\n` +
        `• The store profile\n` +
        `• All menu items\n` +
        `• All users for this store\n` +
        `• All store settings\n\n` +
        `This cannot be undone.`,
    );
    if (!confirmed) return;

    const typed = window.prompt(
      `Type the store slug "${tenant.slug}" to confirm deletion:`,
    );
    if (typed !== tenant.slug) {
      flashError('Deletion cancelled — slug did not match');
      return;
    }

    try {
      const ok = await supabaseService.deleteTenant(tenant.slug);
      if (ok) {
        credentialCache.remove(tenant.slug);
        flashSuccess(`Store "${tenant.displayName}" deleted`);
        await loadTenants();
      } else {
        flashError('Failed to delete store');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete store';
      flashError(msg);
    }
  };

  const shareableRows = useMemo(() => tenants, [tenants]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
          {/* -------- Header with Add New Store button -------- */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <h2>Manage Stores</h2>
              <span className={styles.headerCount}>
                {tenants.length} {tenants.length === 1 ? 'store' : 'stores'}
              </span>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.addBtn}
                onClick={openCreateModal}
                type="button"
              >
                <span className={styles.addBtnIcon}>
                  <PlusIcon width={16} height={16} />
                </span>
                Add New Store
              </button>
              <button
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close"
              >
                <CloseIcon width={18} height={18} fill="#4d4d4d" />
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <span>{error}</span>
              <button onClick={() => setError('')} aria-label="Dismiss">
                <CloseIcon width={14} height={14} fill="#dc3545" />
              </button>
            </div>
          )}
          {success && (
            <div className={styles.successMessage}>
              <span>{success}</span>
              <button onClick={() => setSuccess('')} aria-label="Dismiss">
                <CloseIcon width={14} height={14} fill="#085b1b" />
              </button>
            </div>
          )}

          {/* -------- Existing stores -------- */}
          <div className={styles.itemList}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : shareableRows.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No stores yet</p>
                <button
                  className={styles.addBtn}
                  onClick={openCreateModal}
                  type="button"
                >
                  <span className={styles.addBtnIcon}>+</span>
                  Add your first store
                </button>
              </div>
            ) : (
              shareableRows.map((t) => (
                <div key={t.id} className={styles.itemRow}>
                  {editingTenant?.slug === t.slug ? (
                    <div className={styles.editInline}>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Store name</label>
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) =>
                              setEditDisplayName(e.target.value)
                            }
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Owner phone</label>
                          <input
                            type="tel"
                            value={editOwnerPhone}
                            onChange={(e) =>
                              setEditOwnerPhone(
                                e.target.value.replace(/\D/g, '').slice(0, 10),
                              )
                            }
                            maxLength={10}
                          />
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Owner name</label>
                          <input
                            type="text"
                            value={editOwnerName}
                            onChange={(e) => setEditOwnerName(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>WhatsApp order number</label>
                          <input
                            type="tel"
                            value={editWhatsappPhone}
                            onChange={(e) =>
                              setEditWhatsappPhone(
                                e.target.value.replace(/\D/g, '').slice(0, 10),
                              )
                            }
                            placeholder="Leave blank to use owner phone"
                            maxLength={10}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>
                          New password (leave blank to keep current)
                        </label>
                        <div className={styles.passwordRow}>
                          <input
                            type={showEditPassword ? 'text' : 'password'}
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Optional"
                          />
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() =>
                              setEditPassword(generateRandomPassword())
                            }
                            title="Generate random password"
                          >
                            🎲
                          </button>
                          <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={() => setShowEditPassword((s) => !s)}
                          >
                            {showEditPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>

                      <div className={styles.formActions}>
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={cancelEditing}
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className={styles.saveBtn}
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>
                          {t.displayName}
                          {t.slug === 'main' && (
                            <span className={styles.tenantSlugBadge}>main</span>
                          )}
                          {t.isActive === false && (
                            <span
                              className={`${styles.tenantSlugBadge} ${styles.badgeInactive}`}
                            >
                              inactive
                            </span>
                          )}
                        </div>
                        <div className={styles.tenantUrl}>{t.url}</div>
                        {t.whatsappPhone && (
                          <div className={styles.tenantMeta}>
                            WhatsApp: +91 {t.whatsappPhone}
                          </div>
                        )}
                      </div>
                      <div className={styles.itemStatus}>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleCopyCredentials(t)}
                          title="Generate or reuse this session's credentials"
                        >
                          Copy Credentials
                        </button>
                        <button
                          className={styles.editBtn}
                          onClick={() => startEditing(t)}
                        >
                          Edit
                        </button>
                        <button
                          className={styles.editBtn}
                          onClick={() => openInNewTab(t.slug)}
                        >
                          Open
                        </button>
                        {t.slug !== 'main' && (
                          <button
                            className={`${styles.toggleBtn} ${
                              t.isActive === false ? '' : styles.outOfStockBtn
                            }`}
                            onClick={() => handleToggleActive(t)}
                          >
                            {t.isActive === false ? 'Reactivate' : 'Deactivate'}
                          </button>
                        )}
                        {t.slug !== 'main' && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(t)}
                            title="Permanently delete this store and all its data"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* -------- Create Store modal -------- */}
      {isCreateOpen && (
        <div className={styles.confirmOverlay} onClick={closeCreateModal}>
          <div
            className={styles.confirmDialog}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640 }}
          >
            <div className={styles.confirmHeader}>
              <h3>Create new store</h3>
              <button
                className={styles.confirmCloseBtn}
                onClick={closeCreateModal}
                aria-label="Close"
              >
                <CloseIcon width={18} height={18} fill="#666" />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className={styles.confirmBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Store name *</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g., Soma Electric"
                      required
                      autoFocus
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>URL slug *</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ''),
                        );
                      }}
                      placeholder="e.g., soma-electric"
                      required
                    />
                    <small>
                      URL will be:{' '}
                      <code>{buildTenantUrl(slug || 'your-slug')}</code>
                    </small>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Owner name</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g., Soma Das"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Owner phone *</label>
                    <input
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) =>
                        setOwnerPhone(
                          e.target.value.replace(/\D/g, '').slice(0, 10),
                        )
                      }
                      placeholder="10-digit phone number"
                      required
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>WhatsApp order number</label>
                    <input
                      type="tel"
                      value={whatsappPhone}
                      onChange={(e) =>
                        setWhatsappPhone(
                          e.target.value.replace(/\D/g, '').slice(0, 10),
                        )
                      }
                      placeholder="Leave blank to use owner phone"
                      maxLength={10}
                    />
                    <small>Customer orders go to this number</small>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Owner password *</label>
                    <div className={styles.passwordRow}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() =>
                          setOwnerPassword(generateRandomPassword())
                        }
                        title="Generate random password"
                      >
                        🎲
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <small>
                      Share this with the store owner along with their URL.
                    </small>
                  </div>
                </div>
              </div>

              <div className={styles.confirmFooter}>
                <button
                  type="button"
                  className={styles.confirmCancelBtn}
                  onClick={closeCreateModal}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.confirmActionBtn}
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------- Copy-credentials modal -------- */}
      {credentialsModal && (
        <div
          className={styles.confirmOverlay}
          onClick={() => setCredentialsModal(null)}
        >
          <div
            className={styles.confirmDialog}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className={styles.confirmHeader}>
              <h3>
                {credentialsModal.isNew
                  ? 'Share Login Details'
                  : 'Saved Credentials'}
              </h3>
              <button
                className={styles.confirmCloseBtn}
                onClick={() => setCredentialsModal(null)}
              >
                <CloseIcon width={18} height={18} fill="#666" />
              </button>
            </div>
            <div className={styles.confirmBody}>
              {credentialsModal.isNew ? (
                <p style={{ marginBottom: 12 }}>
                  Send these to the owner of{' '}
                  <strong>{credentialsModal.displayName}</strong>:
                </p>
              ) : (
                <div className={styles.infoNote}>
                  <strong>Password from this session.</strong>
                  <br />
                  Generated {formatGeneratedAt(credentialsModal.generatedAt)}.
                  The same password will appear here until you log out.
                </div>
              )}

              <div className={styles.credentialsList}>
                <div>
                  <label className={styles.fieldLabel}>Store URL</label>
                  <div className={styles.tenantUrl}>
                    {credentialsModal.url}
                  </div>
                </div>

                <div>
                  <label className={styles.fieldLabel}>Phone</label>
                  <div className={styles.tenantUrl}>
                    +91 {credentialsModal.phone}
                  </div>
                </div>

                <div>
                  <label className={styles.fieldLabel}>Password</label>
                  <div className={styles.passwordDisplay}>
                    <span>
                      {showCredentialsPassword
                        ? credentialsModal.password
                        : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCredentialsPassword((s) => !s)}
                      className={styles.toggleLink}
                    >
                      {showCredentialsPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <p className={styles.warningNote}>
                ⚠️ This password will not be shown again after you log out.
                Copy now and share it with the owner. Ask them to change it
                after first login.
              </p>
            </div>
            <div className={styles.confirmFooter}>
              <button
                className={styles.confirmCancelBtn}
                onClick={() => setCredentialsModal(null)}
              >
                Close
              </button>
              <button
                className={styles.confirmActionBtn}
                onClick={copyCredentialsToClipboard}
              >
                Copy all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TenantManager;