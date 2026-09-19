// components/Admin/TenantManager.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabaseService } from '../../services/supabase.service';
import { planService } from '../../services/plan.service';
import { Tenant } from '../../contexts/TenantContext';
import { credentialCache } from '../../services/credentialCache';
import { PauseRequest } from '../../types';
import { CloseIcon, PlusIcon } from '../../assets/svgs';
import PlanBadge from './PlanBadge';
import PauseRequestIcon from './PauseRequestIcon';
import PlanChangeModal from '../Payments/PlanChangeModal';
import styles from './TenantManager.module.scss';

interface TenantManagerProps {
  onClose: () => void;
}

interface TenantRow extends Tenant {
  url: string;
  ownerPhone?: string;
  ownerName?: string;
  hasPauseRequest?: boolean;
  pauseRequestId?: string;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

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
  const [pauseRequests, setPauseRequests] = useState<PauseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Edit
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerPhone, setEditOwnerPhone] = useState('');
  const [editWhatsappPhone, setEditWhatsappPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Credentials modal
  const [credentialsModal, setCredentialsModal] = useState<{
    displayName: string;
    adminUrl: string;
    customerUrl: string;
    phone: string;
    password: string;
    generatedAt: string;
    isNew: boolean;
  } | null>(null);
  const [showCredentialsPassword, setShowCredentialsPassword] = useState(false);

  // Change Plan modal
  const [changePlanFor, setChangePlanFor] = useState<TenantRow | null>(null);

  /**
 * Best-effort guess of the tenant's current subscription cycle length.
 * Rounds the remaining-days to the nearest allowed duration bucket.
 * Falls back to 1.
 */
const estimateCurrentMonths = (tenant: {
  daysUntilExpiry?: number;
}): number => {
  const days = tenant.daysUntilExpiry;
  if (typeof days !== 'number' || days === Infinity || days <= 0) return 1;
  if (days <= 45) return 1;
  if (days <= 135) return 3;
  if (days <= 270) return 6;
  if (days <= 540) return 12;
  return 24;
};
  // Auto-slug
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(displayName));
  }, [displayName, slugTouched]);

  const buildTenantUrl = (slug: string): string =>
    `${window.location.origin}${window.location.pathname}?t=${slug}`;

  const buildAdminUrl = (slug: string): string =>
    `${window.location.origin}${window.location.pathname}?t=${slug}_admin`;

  const loadAll = async () => {
    setLoading(true);
    const [list, requests] = await Promise.all([
      supabaseService.getAllTenants(),
      planService.getPendingPauseRequests(),
    ]);

    const byslug: Record<string, PauseRequest> = {};
    requests.forEach((r) => {
      byslug[r.tenantSlug] = r;
    });

    const enriched: TenantRow[] = await Promise.all(
      list.map(async (t) => {
        const owner = await supabaseService.getTenantOwner(t.slug);
        const req = byslug[t.slug];
        return {
          ...t,
          url: buildTenantUrl(t.slug),
          ownerPhone: owner?.phone,
          ownerName: owner?.name,
          hasPauseRequest: !!req,
          pauseRequestId: req?.id,
        };
      }),
    );
    setTenants(enriched);
    setPauseRequests(requests);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
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

  const openInNewTab = (slug: string) =>
    window.open(buildTenantUrl(slug), '_blank');
  const openAdminInNewTab = (slug: string) =>
    window.open(buildAdminUrl(slug), '_blank');

  // ---------- Create flow ----------
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
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setIsCreateOpen(false);
  };

  const validateCreateForm = (): string | null => {
    if (!displayName.trim()) return 'Store name is required';
    if (!slug.trim()) return 'URL slug is required';
    if (!/^[a-z0-9-]+$/.test(slug))
      return 'Slug can only contain lowercase letters, numbers and hyphens';
    if (tenants.some((t) => t.slug === slug))
      return 'A tenant with this URL slug already exists';
    if (!ownerPhone.trim() || ownerPhone.length < 10)
      return 'Owner phone must be at least 10 digits';
    if (whatsappPhone && whatsappPhone.length < 10)
      return 'WhatsApp number must be 10 digits (or leave blank)';
    if (!ownerPassword || ownerPassword.length < 6)
      return 'Owner password must be at least 6 characters';
    return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const v = validateCreateForm();
    if (v) {
      flashError(v);
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

      credentialCache.set(tenant.slug, ownerPassword);
      setIsCreateOpen(false);

      setCredentialsModal({
        displayName: tenant.displayName,
        adminUrl: buildAdminUrl(tenant.slug),
        customerUrl: buildTenantUrl(tenant.slug),
        phone: ownerPhone.trim(),
        password: ownerPassword,
        generatedAt: new Date().toISOString(),
        isNew: true,
      });
      setShowCredentialsPassword(true);
      await loadAll();
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Failed to create store');
    } finally {
      setIsCreating(false);
    }
  };

  // ---------- Edit flow ----------
  const startEditing = (t: TenantRow) => {
    setEditingTenant(t);
    setEditDisplayName(t.displayName);
    setEditOwnerName(t.ownerName ?? '');
    setEditOwnerPhone(t.ownerPhone ?? '');
    setEditWhatsappPhone(t.whatsappPhone ?? '');
    setEditPassword('');
    setShowEditPassword(false);
  };

  const cancelEditing = () => setEditingTenant(null);

  const handleSaveEdit = async () => {
    if (!editingTenant) return;
    setIsSaving(true);
    try {
      await supabaseService.updateTenant(
        editingTenant.slug,
        editDisplayName.trim(),
        editOwnerPhone.trim(),
        editWhatsappPhone.trim() || undefined,
      );
      if (editPassword.trim()) {
        await supabaseService.resetTenantOwnerPassword(
          editingTenant.slug,
          editOwnerPhone.trim(),
          editPassword,
        );
        credentialCache.set(editingTenant.slug, editPassword);
      }
      flashSuccess('Store updated');
      cancelEditing();
      await loadAll();
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- Toggle active ----------
  const handleToggleActive = async (t: TenantRow) => {
    if (t.slug === 'main') return flashError('Main store cannot be changed');
    const isActive = t.isActive !== false;
    if (
      !window.confirm(
        isActive
          ? `Deactivate "${t.displayName}"?`
          : `Reactivate "${t.displayName}"?`,
      )
    )
      return;
    const ok = await supabaseService.setTenantActive(t.slug, !isActive);
    if (ok) {
      flashSuccess(`Store ${!isActive ? 'reactivated' : 'deactivated'}`);
      await loadAll();
    } else {
      flashError('Failed to update');
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (t: TenantRow) => {
    if (t.slug === 'main') return flashError('Main store cannot be deleted');
    if (!window.confirm(`Delete "${t.displayName}" permanently?`)) return;
    const typed = window.prompt(`Type "${t.slug}" to confirm deletion:`);
    if (typed !== t.slug) return flashError('Deletion cancelled');
    const ok = await supabaseService.deleteTenant(t.slug);
    if (ok) {
      credentialCache.remove(t.slug);
      flashSuccess('Store deleted');
      await loadAll();
    } else {
      flashError('Failed to delete');
    }
  };

  // ---------- Copy credentials ----------
  const handleCopyCredentials = async (t: TenantRow) => {
    const cached = credentialCache.get(t.slug);
    if (cached) {
      const owner = await supabaseService.getTenantOwner(t.slug);
      if (!owner) return flashError('Owner not found');
      setCredentialsModal({
        displayName: t.displayName,
        adminUrl: buildAdminUrl(t.slug),
        customerUrl: buildTenantUrl(t.slug),
        phone: owner.phone,
        password: cached.password,
        generatedAt: cached.generatedAt,
        isNew: false,
      });
      setShowCredentialsPassword(true);
      return;
    }

    const owner = await supabaseService.getTenantOwner(t.slug);
    if (!owner) return flashError('Owner not found');
    const newPassword = generateRandomPassword();
    const ok = await supabaseService.resetTenantOwnerPassword(
      t.slug,
      owner.phone,
      newPassword,
    );
    if (!ok) return flashError('Failed');
    credentialCache.set(t.slug, newPassword);
    setCredentialsModal({
      displayName: t.displayName,
      adminUrl: buildAdminUrl(t.slug),
      customerUrl: buildTenantUrl(t.slug),
      phone: owner.phone,
      password: newPassword,
      generatedAt: new Date().toISOString(),
      isNew: true,
    });
    setShowCredentialsPassword(true);
  };

  const copyCredentialsToClipboard = async () => {
    if (!credentialsModal) return;
    const text =
      `*${credentialsModal.displayName} - Login Details*\n\n` +
      `Admin URL: ${credentialsModal.adminUrl}\n` +
      `Customer URL: ${credentialsModal.customerUrl}\n` +
      `Phone: ${credentialsModal.phone}\n` +
      `Password: ${credentialsModal.password}\n`;
    const ok = await copyToClipboard(text);
    flashSuccess(ok ? 'Copied to clipboard' : 'Could not access clipboard');
  };

  const shareableRows = useMemo(() => tenants, [tenants]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <h2>Manage Stores</h2>
              <span className={styles.headerCount}>
                {tenants.length} store{tenants.length === 1 ? '' : 's'}
                {pauseRequests.length > 0 && (
                  <>
                    {' . '}
                    <span className={styles.pendingCount}>
                      {pauseRequests.length} pause request
                      {pauseRequests.length === 1 ? '' : 's'}
                    </span>
                  </>
                )}
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
              <button onClick={() => setError('')}><CloseIcon width={16} height={16} fill="#4d4d4d" /></button>
            </div>
          )}
          {success && (
            <div className={styles.successMessage}>
              <span>{success}</span>
              <button onClick={() => setSuccess('')}><CloseIcon width={16} height={16} fill="#4d4d4d" /></button>
            </div>
          )}

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
                    /* ---------- Edit inline form ---------- */
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
                                e.target.value
                                  .replace(/\D/g, '')
                                  .slice(0, 10),
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
                            onChange={(e) =>
                              setEditOwnerName(e.target.value)
                            }
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>WhatsApp number</label>
                          <input
                            type="tel"
                            value={editWhatsappPhone}
                            onChange={(e) =>
                              setEditWhatsappPhone(
                                e.target.value
                                  .replace(/\D/g, '')
                                  .slice(0, 10),
                              )
                            }
                            maxLength={10}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>New password (optional)</label>
                        <div className={styles.passwordRow}>
                          <input
                            type={showEditPassword ? 'text' : 'password'}
                            value={editPassword}
                            onChange={(e) =>
                              setEditPassword(e.target.value)
                            }
                            placeholder="Leave blank to keep"
                          />
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() =>
                              setEditPassword(generateRandomPassword())
                            }
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
                    /* ---------- Normal row ---------- */
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

    <PlanBadge
      tenant={t}
      onChangePlan={() => setChangePlanFor(t)}
    />

    {t.hasPauseRequest && t.pauseRequestId && (
      <PauseRequestIcon
        requestId={t.pauseRequestId}
        tenantName={t.displayName}
        onResolved={loadAll}
      />
    )}
  </div>

  {/* Expiry line - replaces the URL block */}
  {t.subscriptionExpiresAt ? (
    <div className={styles.expiryLine}>
      <span className={styles.expiryLabel}>Expires</span>
      <span className={styles.expiryDate}>
        {new Date(t.subscriptionExpiresAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </span>
      {typeof t.daysUntilExpiry === 'number' &&
        t.daysUntilExpiry !== Infinity && (
          <span
            className={`${styles.expiryDays} ${
              t.daysUntilExpiry <= 0
                ? styles.expiryExpired
                : t.daysUntilExpiry <= 7
                ? styles.expirySoon
                : ''
            }`}
          >
            {t.daysUntilExpiry > 0
              ? `${t.daysUntilExpiry} day${t.daysUntilExpiry === 1 ? '' : 's'} left`
              : 'Expired'}
          </span>
        )}
    </div>
  ) : (
    <div className={styles.expiryLine}>
      <span className={styles.expiryLabel}>Expires</span>
      <span className={styles.expiryDate}>-</span>
    </div>
  )}

  {t.whatsappPhone && (
    <div className={styles.tenantMeta}>WhatsApp: +91 {t.whatsappPhone}</div>
  )}
</div>

                      <div className={styles.itemStatus}>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleCopyCredentials(t)}
                          title="Generate or reuse credentials"
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
                          onClick={() => setChangePlanFor(t)}
                          title="Change plan"
                        >
                          Change Plan
                        </button>
                        <button
                          className={styles.editBtn}
                          onClick={() => openAdminInNewTab(t.slug)}
                        >
                          Open Admin
                        </button>
                        <button
                          className={styles.editBtn}
                          onClick={() => openInNewTab(t.slug)}
                        >
                          Open Customer
                        </button>
                        {t.slug !== 'main' && (
                          <button
                            className={`${styles.toggleBtn} ${
                              t.isActive === false
                                ? ''
                                : styles.outOfStockBtn
                            }`}
                            onClick={() => handleToggleActive(t)}
                          >
                            {t.isActive === false
                              ? 'Reactivate'
                              : 'Deactivate'}
                          </button>
                        )}
                        {t.slug !== 'main' && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(t)}
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

      {/* ---------- Create modal (unchanged from prior) ---------- */}
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
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Owner name</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
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
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>WhatsApp number</label>
                    <input
                      type="tel"
                      value={whatsappPhone}
                      onChange={(e) =>
                        setWhatsappPhone(
                          e.target.value.replace(/\D/g, '').slice(0, 10),
                        )
                      }
                      maxLength={10}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Owner password *</label>
                    <div className={styles.passwordRow}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={ownerPassword}
                        onChange={(e) =>
                          setOwnerPassword(e.target.value)
                        }
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() =>
                          setOwnerPassword(generateRandomPassword())
                        }
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

      {/* ---------- Credentials modal (unchanged) ---------- */}
      {credentialsModal && (
        <div
          className={styles.confirmOverlay}
          onClick={() => setCredentialsModal(null)}
        >
          <div
            className={styles.confirmDialog}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
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
              <div className={styles.credentialsList}>
                <div>
                  <label className={styles.fieldLabel}>Admin URL</label>
                  <div className={styles.tenantUrl}>
                    {credentialsModal.adminUrl}
                  </div>
                </div>
                <div>
                  <label className={styles.fieldLabel}>
                    Customer URL
                  </label>
                  <div className={styles.tenantUrl}>
                    {credentialsModal.customerUrl}
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
                        : '######'}
                    </span>
                    <button
                      type="button"
                      className={styles.toggleLink}
                      onClick={() =>
                        setShowCredentialsPassword((s) => !s)
                      }
                    >
                      {showCredentialsPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>
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

      {/* ---------- Change Plan modal ---------- */}
      {changePlanFor && (
  <PlanChangeModal
    isOpen={true}
    mode="admin"
    tenantSlug={changePlanFor.slug}
    tenantName={changePlanFor.displayName}
    currentPlanId={changePlanFor.planId}
    currentMonths={estimateCurrentMonths(changePlanFor)}
    onClose={() => setChangePlanFor(null)}
    onComplete={() => {
      flashSuccess('Plan updated');
      loadAll();
    }}
  />
)}
    </>
  );
};

export default TenantManager;