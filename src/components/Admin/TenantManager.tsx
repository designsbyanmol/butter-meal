// components/Admin/TenantManager.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabaseService } from "../../services/supabase.service";
import { planService } from "../../services/plan.service";
import { Tenant } from "../../contexts/TenantContext";
import { credentialCache } from "../../services/credentialCache";
import { PauseRequest } from "../../types";
import {
  Modal,
  ConfirmDialog,
  Button,
  IconButton,
  Input,
  FormField,
  Banner,
  EmptyState,
  Badge,
  Avatar,
} from "../ui";
import {
  CloseIcon,
  PlusIcon,
  CopyIcon,
  EditIcon,
  TrashIcon,
} from "../../assets/svgs";
import PlanBadge from "./PlanBadge";
import PauseRequestIcon from "./PauseRequestIcon";
import PlanChangeModal from "../Payments/PlanChangeModal";
import tokens from "../../styles/_tokens.module.scss";
import local from "./TenantManager.module.scss";

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

type ConfirmState = {
  title: string;
  message: React.ReactNode;
  confirmText: string;
  variant: "primary" | "danger" | "warning";
  action: () => void | Promise<void>;
};

type SlugStatus = "idle" | "checking" | "available" | "taken" | "error";

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const generateRandomPassword = (length = 8): string => {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
};

const TenantManager: React.FC<TenantManagerProps> = ({ onClose }) => {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [pauseRequests, setPauseRequests] = useState<PauseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Slug availability check state (create modal)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const slugCheckTimerRef = useRef<number | null>(null);
  const skipInitialCheckRef = useRef(true);

  // Edit
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editOwnerPhone, setEditOwnerPhone] = useState("");
  const [editWhatsappPhone, setEditWhatsappPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
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

  const [changePlanFor, setChangePlanFor] = useState<TenantRow | null>(null);

  const estimateCurrentMonths = (tenant: {
    daysUntilExpiry?: number;
  }): number => {
    const days = tenant.daysUntilExpiry;
    if (typeof days !== "number" || days === Infinity || days <= 0) return 1;
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

  // Debounced slug uniqueness check (create modal only)
  useEffect(() => {
    if (!isCreateOpen) return;

    // Skip the very first run after opening - nothing to check yet
    if (skipInitialCheckRef.current) {
      skipInitialCheckRef.current = false;
      return;
    }

    const candidate = slug.trim();

    // Clear any pending check
    if (slugCheckTimerRef.current !== null) {
      window.clearTimeout(slugCheckTimerRef.current);
      slugCheckTimerRef.current = null;
    }

    if (!candidate) {
      setSlugStatus("idle");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(candidate)) {
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");

    slugCheckTimerRef.current = window.setTimeout(async () => {
      try {
        const available =
          await supabaseService.isTenantSlugAvailable(candidate);
        setSlugStatus(available ? "available" : "taken");
      } catch (err) {
        console.warn("[TenantManager] slug check failed:", err);
        setSlugStatus("error");
      } finally {
        slugCheckTimerRef.current = null;
      }
    }, 400);

    return () => {
      if (slugCheckTimerRef.current !== null) {
        window.clearTimeout(slugCheckTimerRef.current);
        slugCheckTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isCreateOpen]);

  const buildTenantUrl = (s: string): string =>
    `${window.location.origin}${window.location.pathname}?t=${s}`;

  const buildAdminUrl = (s: string): string =>
    `${window.location.origin}${window.location.pathname}?t=${s}_admin`;

  const loadAll = async () => {
    setLoading(true);
    const [list, requests] = await Promise.all([
      supabaseService.getAllTenants(),
      planService.getPendingPauseRequests(),
    ]);

    const bySlug: Record<string, PauseRequest> = {};
    requests.forEach((r) => {
      bySlug[r.tenantSlug] = r;
    });

    const enriched: TenantRow[] = await Promise.all(
      list.map(async (t) => {
        const owner = await supabaseService.getTenantOwner(t.slug);
        const req = bySlug[t.slug];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };
  const flashError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const openInNewTab = (s: string) => window.open(buildTenantUrl(s), "_blank");
  const openAdminInNewTab = (s: string) =>
    window.open(buildAdminUrl(s), "_blank");

  // ---------- Create flow ----------
  const openCreateModal = () => {
    setDisplayName("");
    setSlug("");
    setSlugTouched(false);
    setOwnerName("");
    setOwnerPhone("");
    setWhatsappPhone("");
    setOwnerPassword("");
    setShowPassword(false);
    setSlugStatus("idle");
    skipInitialCheckRef.current = true;
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setIsCreateOpen(false);
  };

  const validateCreateForm = (): string | null => {
    if (!displayName.trim()) return "Store name is required";
    if (!slug.trim()) return "URL slug is required";
    if (!/^[a-z0-9-]+$/.test(slug))
      return "Slug can only contain lowercase letters, numbers and hyphens";
    if (slugStatus === "taken")
      return "Domain already present, please change the slug";
    if (tenants.some((t) => t.slug === slug))
      return "A tenant with this URL slug already exists";
    if (!ownerPhone.trim() || ownerPhone.length < 10)
      return "Owner phone must be at least 10 digits";
    if (whatsappPhone && whatsappPhone.length < 10)
      return "WhatsApp number must be 10 digits (or leave blank)";
    if (!ownerPassword || ownerPassword.length < 6)
      return "Owner password must be at least 6 characters";
    return null;
  };

  // Is the create form ready to submit?
  const canCreate = useMemo(() => {
    return (
      displayName.trim() !== "" &&
      slug.trim() !== "" &&
      /^[a-z0-9-]+$/.test(slug) &&
      ownerPhone.trim().length === 10 &&
      (!whatsappPhone || whatsappPhone.length === 10) &&
      ownerPassword.length >= 6 &&
      slugStatus === "available"
    );
  }, [displayName, slug, ownerPhone, whatsappPhone, ownerPassword, slugStatus]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
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
        ownerName: ownerName.trim() || displayName.trim() + " Owner",
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
      flashError(err instanceof Error ? err.message : "Failed to create store");
    } finally {
      setIsCreating(false);
    }
  };

  // ---------- Edit flow ----------
  const startEditing = (t: TenantRow) => {
    setEditingTenant(t);
    setEditDisplayName(t.displayName);
    setEditOwnerName(t.ownerName ?? "");
    setEditOwnerPhone(t.ownerPhone ?? "");
    setEditWhatsappPhone(t.whatsappPhone ?? "");
    setEditPassword("");
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
      flashSuccess("Store updated");
      cancelEditing();
      await loadAll();
    } catch (err) {
      flashError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- Toggle active ----------
  const handleToggleActive = (t: TenantRow) => {
    if (t.slug === "main") return flashError("Main store cannot be changed");
    const isActive = t.isActive !== false;
    setConfirm({
      title: isActive ? "Deactivate Store" : "Reactivate Store",
      message: isActive
        ? `Deactivate "${t.displayName}"?`
        : `Reactivate "${t.displayName}"?`,
      confirmText: isActive ? "Deactivate" : "Reactivate",
      variant: isActive ? "warning" : "primary",
      action: async () => {
        setConfirm(null);
        const ok = await supabaseService.setTenantActive(t.slug, !isActive);
        if (ok) {
          flashSuccess(`Store ${!isActive ? "reactivated" : "deactivated"}`);
          await loadAll();
        } else {
          flashError("Failed to update");
        }
      },
    });
  };

  // ---------- Delete ----------
  const handleDelete = (t: TenantRow) => {
    if (t.slug === "main") return flashError("Main store cannot be deleted");
    const typed = window.prompt(
      `Type "${t.slug}" to confirm deletion of "${t.displayName}":`,
    );
    if (typed !== t.slug) return flashError("Deletion cancelled");

    setConfirm({
      title: "Delete Store",
      message: `Permanently delete "${t.displayName}"? This cannot be undone.`,
      confirmText: "Yes, Delete Store",
      variant: "danger",
      action: async () => {
        setConfirm(null);
        const ok = await supabaseService.deleteTenant(t.slug);
        if (ok) {
          credentialCache.remove(t.slug);
          flashSuccess("Store deleted");
          await loadAll();
        } else {
          flashError("Failed to delete");
        }
      },
    });
  };

  // ---------- Copy credentials ----------
  const handleCopyCredentials = async (t: TenantRow) => {
    const cached = credentialCache.get(t.slug);
    if (cached) {
      const owner = await supabaseService.getTenantOwner(t.slug);
      if (!owner) return flashError("Owner not found");
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
    if (!owner) return flashError("Owner not found");
    const newPassword = generateRandomPassword();
    const ok = await supabaseService.resetTenantOwnerPassword(
      t.slug,
      owner.phone,
      newPassword,
    );
    if (!ok) return flashError("Failed");
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
    flashSuccess(ok ? "Copied to clipboard" : "Could not access clipboard");
  };

  const shareableRows = useMemo(() => tenants, [tenants]);

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <>
      {/* ============ Main panel ============ */}
      <Modal
        isOpen={true}
        onClose={onClose}
        title={
          <>
            Manage Stores{" "}
            <div className={local.headerCount}>
              {tenants.length} store{tenants.length === 1 ? "" : "s"}
              {pauseRequests.length > 0 && (
                <>
                  {" . "}
                  <span className={local.pendingCount}>
                    {pauseRequests.length} pause request
                    {pauseRequests.length === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </div>
          </>
        }
        size="xl"
        headerRight={
          <Button
            size="sm"
            leftIcon={<PlusIcon width={16} height={16} fill="#fff" />}
            onClick={openCreateModal}
          >
            Add
          </Button>
        }
      >
        {error && (
          <Banner variant="error" onDismiss={() => setError("")}>
            {error}
          </Banner>
        )}
        {success && (
          <Banner variant="success" onDismiss={() => setSuccess("")}>
            {success}
          </Banner>
        )}

        {loading ? (
          <EmptyState title="Loading stores..." />
        ) : shareableRows.length === 0 ? (
          <EmptyState
            title="No stores yet"
            description="Add your first store to get started."
            action={
              <Button
                leftIcon={<PlusIcon width={16} height={16} fill="#fff" />}
                onClick={openCreateModal}
              >
                Add your first store
              </Button>
            }
          />
        ) : (
          <div className={local.list}>
            {shareableRows.map((t) => (
              <div key={t.id} className={`${local.row} ${local.storeItemRow}`}>
                {editingTenant?.slug === t.slug ? (
                  <div className={local.editInline}>
                    <div className={local.formRow}>
                      <FormField label="Store name">
                        <Input
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Owner phone">
                        <Input
                          type="tel"
                          value={editOwnerPhone}
                          onChange={(e) =>
                            setEditOwnerPhone(
                              e.target.value.replace(/\D/g, "").slice(0, 10),
                            )
                          }
                          maxLength={10}
                        />
                      </FormField>
                    </div>

                    <div className={local.formRow}>
                      <FormField label="Owner name">
                        <Input
                          value={editOwnerName}
                          onChange={(e) => setEditOwnerName(e.target.value)}
                        />
                      </FormField>
                      <FormField label="WhatsApp number">
                        <Input
                          type="tel"
                          value={editWhatsappPhone}
                          onChange={(e) =>
                            setEditWhatsappPhone(
                              e.target.value.replace(/\D/g, "").slice(0, 10),
                            )
                          }
                          maxLength={10}
                        />
                      </FormField>
                    </div>

                    <FormField label="New password (optional)">
                      <div className={local.passwordRow}>
                        <Input
                          type={showEditPassword ? "text" : "password"}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Leave blank to keep"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setEditPassword(generateRandomPassword())
                          }
                          aria-label="Generate password"
                        >
                          🎲
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowEditPassword((s) => !s)}
                        >
                          {showEditPassword ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </FormField>

                    <div className={local.formActions}>
                      <Button
                        variant="ghost"
                        onClick={cancelEditing}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEdit} loading={isSaving}>
                        Save changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={local.info}>
                      <div className={local.nameRow}>
                        <span className={local.name}>{t.displayName}</span>
                        <div className={local.nameHead}>
                          {t.slug === "main" && (
                            <Badge tone="info" size="sm">
                              main
                            </Badge>
                          )}
                          {t.isActive === false && (
                            <Badge tone="danger" size="sm">
                              inactive
                            </Badge>
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
                      </div>

                      <div className={local.expiryLine}>
                        <span className={local.expiryLabel}>Expires</span>
                        <span className={local.expiryDate}>
                          {t.subscriptionExpiresAt
                            ? new Date(
                                t.subscriptionExpiresAt,
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                        {typeof t.daysUntilExpiry === "number" &&
                          t.daysUntilExpiry !== Infinity && (
                            <span
                              className={`${local.expiryDays} ${
                                t.daysUntilExpiry <= 0
                                  ? local.expiryExpired
                                  : t.daysUntilExpiry <= 7
                                    ? local.expirySoon
                                    : ""
                              }`}
                            >
                              {t.daysUntilExpiry > 0
                                ? `${t.daysUntilExpiry} day${
                                    t.daysUntilExpiry === 1 ? "" : "s"
                                  } left`
                                : "Expired"}
                            </span>
                          )}
                      </div>

                      {t.whatsappPhone && (
                        <div className={local.meta}>
                          WhatsApp: {t.whatsappPhone}
                        </div>
                      )}
                    </div>

                    <div className={local.actions}>
                      <div className={local.actionsGroup}>
                        <Button
                          size="xs"
                          variant="link"
                          onClick={() => handleCopyCredentials(t)}
                          title="Generate or reuse credentials"
                        >
                          <CopyIcon
                            width={16}
                            height={16}
                            fill={tokens.borderHover}
                          />
                        </Button>
                        <Button
                          size="xs"
                          variant="link"
                          onClick={() => startEditing(t)}
                        >
                          <EditIcon
                            width={16}
                            height={16}
                            fill={tokens.borderHover}
                          />
                        </Button>
                        {t.slug !== "main" && (
                        <Button
                          size="xs"
                          variant="link"
                          onClick={() => handleDelete(t)}
                        >
                          <TrashIcon
                            width={16}
                            height={16}
                            fill={tokens.danger}
                          />
                        </Button>
                      )}
                      </div>
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => openAdminInNewTab(t.slug)}
                      >
                        Admin
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => openInNewTab(t.slug)}
                      >
                        User
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setChangePlanFor(t)}
                      >
                        Upgrade
                      </Button>
                      {t.slug !== "main" && (
                        <Button
                          size="xs"
                          variant={t.isActive === false ? "ghost" : "warning"}
                          onClick={() => handleToggleActive(t)}
                        >
                          {t.isActive === false ? "Start" : "Pause"}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ============ Create store modal ============ */}
      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        title="Create new store"
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeCreateModal}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-store-form"
              loading={isCreating}
              disabled={!canCreate}
            >
              Create store
            </Button>
          </>
        }
      >
        <form id="create-store-form" onSubmit={handleCreate}>
          <div className={local.formRow}>
            <FormField label="Store name" required>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
                required
              />
            </FormField>

            <FormField
              label="URL slug"
              required
              error={
                slugStatus === "taken"
                  ? "Domain already present, please change the slug"
                  : undefined
              }
              hint={
                slugStatus === "checking"
                  ? "Checking availability..."
                  : slugStatus === "available"
                    ? "Yes! This slug is available"
                    : undefined
              }
            >
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  );
                }}
                invalid={slugStatus === "taken"}
                required
              />
            </FormField>
          </div>

          <div className={local.formRow}>
            <FormField label="Owner name">
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </FormField>
            <FormField label="Owner phone" required>
              <Input
                type="tel"
                value={ownerPhone}
                onChange={(e) =>
                  setOwnerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                maxLength={10}
                required
              />
            </FormField>
          </div>

          <div className={local.formRow}>
            <FormField label="WhatsApp number">
              <Input
                type="tel"
                value={whatsappPhone}
                onChange={(e) =>
                  setWhatsappPhone(
                    e.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                maxLength={10}
              />
            </FormField>
            <FormField label="Owner password" required>
              <div className={local.passwordRow}>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOwnerPassword(generateRandomPassword())}
                  aria-label="Generate password"
                >
                  🎲
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </FormField>
          </div>
        </form>
      </Modal>

      {/* ============ Credentials modal ============ */}
      <Modal
        isOpen={!!credentialsModal}
        onClose={() => setCredentialsModal(null)}
        title={
          credentialsModal?.isNew ? "Share Login Details" : "Saved Credentials"
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCredentialsModal(null)}>
              Close
            </Button>
            <Button onClick={copyCredentialsToClipboard}>Copy all</Button>
          </>
        }
      >
        {credentialsModal && (
          <div className={local.credentialsList}>
            <div>
              <label className={local.fieldLabel}>Admin URL</label>
              <div className={local.urlBox}>{credentialsModal.adminUrl}</div>
            </div>
            <div>
              <label className={local.fieldLabel}>Customer URL</label>
              <div className={local.urlBox}>{credentialsModal.customerUrl}</div>
            </div>
            <div>
              <label className={local.fieldLabel}>Phone</label>
              <div className={local.urlBox}>+91 {credentialsModal.phone}</div>
            </div>
            <div>
              <label className={local.fieldLabel}>Password</label>
              <div className={local.passwordDisplay}>
                <span>
                  {showCredentialsPassword
                    ? credentialsModal.password
                    : "######"}
                </span>
                <Button
                  size="sm"
                  variant="link"
                  onClick={() => setShowCredentialsPassword((s) => !s)}
                >
                  {showCredentialsPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ============ Change plan modal ============ */}
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
            flashSuccess("Plan updated");
            loadAll();
          }}
        />
      )}

      {/* ============ Confirm dialog ============ */}
      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmText={confirm?.confirmText}
        variant={confirm?.variant}
        onConfirm={() => confirm?.action()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

export default TenantManager;
