// components/Admin/TenantManagerBody.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabaseService } from "../../services/supabase.service";
import { planService } from "../../services/plan.service";
import { Tenant } from "../../contexts/TenantContext";
import { credentialCache } from "../../services/credentialCache";
import { PauseRequest, StoreCategory } from "../../types";
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
  Sheet,
  Chip,
  Pagination,
} from "../ui";
import {
  PlusIcon,
  CopyIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  FilterIcon,
  CloseIcon,
  DownloadIcon,
  EyeOffIcon,
} from "../../assets/svgs";
import PlanBadge from "./PlanBadge";
import PauseRequestIcon from "./PauseRequestIcon";
import PlanChangeModal from "../Payments/PlanChangeModal";
import { STORE_CATEGORIES, getCategoryLabel } from "../../data/storeCategories";
import { clearSignupState } from "../Pages/Signup/useSignupPersistence";
import tokens from "../../styles/_tokens.module.scss";
import { InlineSection } from "../Dashboard/inline";
import { downloadPublicQrPdf } from "../../utils/qrPdf";
import local from "./TenantManager.module.scss";

// =========================================================
// Filter types & constants
// =========================================================
type CreatedRange =
  | "all"
  | "today"
  | "in3d"
  | "in7d"
  | "in15d"
  | "in1m"
  | "in3m"
  | "in6m"
  | "in1y"
  | "custom";

type ExpiryFilter = "all" | "expired" | "next3d" | "next7d" | "next15d";

type PlanMonthsFilter = "all" | 1 | 3 | 6 | 12 | 24;

interface Filters {
  search: string;
  created: CreatedRange;
  customFrom: string;
  customTo: string;
  expiry: ExpiryFilter;
  planMonths: PlanMonthsFilter;
  category: StoreCategory | "all";
}

const EMPTY_FILTERS: Filters = {
  search: "",
  created: "all",
  customFrom: "",
  customTo: "",
  expiry: "all",
  planMonths: "all",
  category: "all",
};

const PAGE_SIZE = 8;

const CREATED_OPTIONS: { key: CreatedRange; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "in3d", label: "In 3 days" },
  { key: "in7d", label: "In 7 days" },
  { key: "in15d", label: "In 15 days" },
  { key: "in1m", label: "In 1 month" },
  { key: "in3m", label: "In 3 months" },
  { key: "in6m", label: "In 6 months" },
  { key: "in1y", label: "In 1 year" },
  { key: "custom", label: "Custom range" },
];

const EXPIRY_OPTIONS: { key: ExpiryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "expired", label: "Expired" },
  { key: "next3d", label: "Next 3 days" },
  { key: "next7d", label: "Next 7 days" },
  { key: "next15d", label: "Next 15 days" },
];

const PLAN_MONTHS_OPTIONS: { key: PlanMonthsFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: 1, label: "1 month" },
  { key: 3, label: "3 months" },
  { key: 6, label: "6 months" },
  { key: 12, label: "1 year" },
  { key: 24, label: "2 years" },
];

const daysUntilExpiry = (expiresAtIso?: string): number => {
  if (!expiresAtIso) return Infinity;
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

const monthsFromDays = (days: number): 0 | 1 | 3 | 6 | 12 | 24 => {
  if (days === Infinity || days <= 0) return 0;
  if (days <= 45) return 1;
  if (days <= 135) return 3;
  if (days <= 270) return 6;
  if (days <= 540) return 12;
  return 24;
};

interface TenantRow extends Tenant {
  url: string;
  ownerPhone?: string;
  ownerName?: string;
  hasPauseRequest?: boolean;
  pauseRequestId?: string;
  _createdAt: string;
  _daysUntilExpiry: number;
}

type PendingRowAction =
  | { kind: "qr"; tenant: TenantRow }
  | { kind: "credentials"; tenant: TenantRow }
  | { kind: "edit"; tenant: TenantRow };

type ConfirmState = {
  title: string;
  message: React.ReactNode;
  confirmText: string;
  variant: "primary" | "danger" | "warning";
  action: () => void | Promise<void>;
};

const generateRandomPassword = (length = 8): string => {
  const chars = "abcdefghijklmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < length; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
};

// =========================================================
// FilterSheet
// =========================================================
interface FilterSheetProps {
  isOpen: boolean;
  initial: Filters;
  onApply: (next: Filters) => void;
  onClose: () => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({
  isOpen,
  initial,
  onApply,
  onClose,
}) => {
  const [draft, setDraft] = useState<Filters>(initial);

  useEffect(() => {
    if (isOpen) setDraft(initial);
  }, [isOpen, initial]);

  const setCreated = (k: CreatedRange) =>
    setDraft((d) => ({ ...d, created: k }));
  const setExpiry = (k: ExpiryFilter) => setDraft((d) => ({ ...d, expiry: k }));
  const setPlanMonths = (k: PlanMonthsFilter) =>
    setDraft((d) => ({ ...d, planMonths: k }));
  const setCategory = (k: StoreCategory | "all") =>
    setDraft((d) => ({ ...d, category: k }));

  const reset = () => setDraft({ ...EMPTY_FILTERS, search: draft.search });

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      mobileFullScreen
      title="Filters"
      maxHeightVh={86}
      className={local.filterFooter}
      footer={
        <>
          <Button variant="ghost" onClick={reset} block>
            Reset
          </Button>
          <Button onClick={() => onApply(draft)} block>
            Apply
          </Button>
        </>
      }
    >
      <section className={local.filterSection}>
        <h4>Created</h4>
        <div className={local.chipGrid}>
          {CREATED_OPTIONS.map((o) => (
            <Chip
              key={o.key}
              tone="primary"
              active={draft.created === o.key}
              onClick={() => setCreated(o.key)}
            >
              {o.label}
            </Chip>
          ))}
        </div>

        {draft.created === "custom" && (
          <div className={local.dateRangeRow}>
            <FormField label="From">
              <Input
                type="date"
                value={draft.customFrom}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, customFrom: e.target.value }))
                }
              />
            </FormField>
            <FormField label="To">
              <Input
                type="date"
                value={draft.customTo}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, customTo: e.target.value }))
                }
              />
            </FormField>
          </div>
        )}
      </section>

      <section className={local.filterSection}>
        <h4>Category</h4>
        <div className={local.chipGrid}>
          <Chip
            tone="primary"
            active={draft.category === "all"}
            onClick={() => setCategory("all")}
          >
            All
          </Chip>
          {STORE_CATEGORIES.map((c) => (
            <Chip
              key={c.value}
              tone="primary"
              active={draft.category === c.value}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className={local.filterSection}>
        <h4>Expiry</h4>
        <div className={local.chipGrid}>
          {EXPIRY_OPTIONS.map((o) => (
            <Chip
              key={o.key}
              tone="primary"
              active={draft.expiry === o.key}
              onClick={() => setExpiry(o.key)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className={local.filterSection}>
        <h4>Plan duration</h4>
        <div className={local.chipGrid}>
          {PLAN_MONTHS_OPTIONS.map((o) => (
            <Chip
              key={String(o.key)}
              tone="primary"
              active={draft.planMonths === o.key}
              onClick={() => setPlanMonths(o.key)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </section>
    </Sheet>
  );
};

// =========================================================
// TenantManagerBody
// =========================================================
const TenantManagerBody: React.FC = () => {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [pauseRequests, setPauseRequests] = useState<PauseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [pendingRowAction, setPendingRowAction] =
    useState<PendingRowAction | null>(null);

  const [planFilter, setPlanFilter] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editOwnerPhone, setEditOwnerPhone] = useState("");
  const [editWhatsappPhone, setEditWhatsappPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    _daysUntilExpiry?: number;
    daysUntilExpiry?: number;
  }): number => {
    const days = tenant._daysUntilExpiry ?? tenant.daysUntilExpiry;
    if (typeof days !== "number" || days === Infinity || days <= 0) return 1;
    if (days <= 45) return 1;
    if (days <= 135) return 3;
    if (days <= 270) return 6;
    if (days <= 540) return 12;
    return 24;
  };

  const buildTenantUrl = (s: string): string => {
    const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
    return `${window.location.origin}${dir}customer.html?t=${s}`;
  };

  const buildAdminUrl = (s: string): string => {
    const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
    return `${window.location.origin}${dir}admin.html?t=${s}_admin`;
  };

  // =========================================================
  // Copy for the row-action confirmation dialog
  // =========================================================
  const rowActionCopy = (
    action: PendingRowAction | null,
  ): {
    title: string;
    message: React.ReactNode;
    confirmText: string;
    variant: "primary" | "danger" | "warning";
  } => {
    if (!action) {
      return {
        title: "",
        message: "",
        confirmText: "Confirm",
        variant: "primary",
      };
    }
    const t = action.tenant;
    switch (action.kind) {
      case "qr":
        return {
          title: "Download Public QR",
          message: (
            <>
              Download a printable public QR for{" "}
              <strong>{t.displayName}</strong>?
              <br />
              <br />
              It will link to:{" "}
              <code style={{ fontSize: 12 }}>customer.html?t={t.slug}</code>.
              Print it on table cards, flyers, or the storefront so customers
              can browse the menu.
            </>
          ),
          confirmText: "Download QR",
          variant: "primary",
        };
      case "credentials":
        return {
          title: "Reset Login Credentials",
          message: (
            <>
              Create new password for <strong>{t.displayName}</strong>?
              <br />
              <br />
              The current password will stop working immediately. The store
              owner must use the new password to sign in to their admin
              dashboard.
            </>
          ),
          confirmText: "Reset/Copy",
          variant: "warning",
        };
      case "edit":
        return {
          title: "Edit Store",
          message: (
            <>
              Open the edit form for <strong>{t.displayName}</strong>?
              <br />
              <br />
              You can change the store name, owner contact, WhatsApp number, and
              reset the owner password.
            </>
          ),
          confirmText: "Edit Store",
          variant: "primary",
        };
      default:
        return {
          title: "",
          message: "",
          confirmText: "Confirm",
          variant: "primary",
        };
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [list, requests, ownerMap] = await Promise.all([
        supabaseService.getAllTenants(),
        planService.getPendingPauseRequests(),
        supabaseService.getTenantOwnerMap(), // 1 request for all owners
      ]);

      const bySlug: Record<string, PauseRequest> = {};
      requests.forEach((r) => {
        bySlug[r.tenantSlug] = r;
      });

      const enriched: TenantRow[] = list.map((t) => {
        const owner = ownerMap[t.slug];
        const req = bySlug[t.slug];
        const createdAt =
          (t as any).createdAt ??
          (t as any).created_at ??
          new Date(0).toISOString();
        const expiresAt =
          t.subscriptionExpiresAt ?? (t as any).subscription_expires_at;
        const days = daysUntilExpiry(expiresAt);

        return {
          ...t,
          url: buildTenantUrl(t.slug),
          ownerPhone: owner?.phone || undefined,
          ownerName: owner?.name || undefined,
          hasPauseRequest: !!req,
          pauseRequestId: req?.id,
          _createdAt: createdAt,
          _daysUntilExpiry: days,
        };
      });

      setTenants(enriched);
      setPauseRequests(requests);
    } catch (err) {
      console.error("[TenantManagerBody] loadAll failed:", err);
      flashError("Failed to load stores");
    } finally {
      setLoading(false);
    }
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

  const openCreateModal = () => {
    clearSignupState();
    const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
    window.location.href = `${window.location.origin}${dir}signup.html`;
  };

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

  const handleCopyCredentials = async (t: TenantRow) => {
    const owner = await supabaseService.getTenantOwner(t.slug);
    if (!owner) return flashError("Owner not found");

    const newPassword = generateRandomPassword(10);

    const ok = await supabaseService.resetTenantOwnerPassword(
      t.slug,
      owner.phone,
      newPassword,
    );
    if (!ok) return flashError("Failed to reset password");

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

  const planCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tenants.forEach((t) => {
      const planId = t.planId ?? "professional";
      counts.set(planId, (counts.get(planId) ?? 0) + 1);
    });
    return counts;
  }, [tenants]);

  const planOrder = useMemo(() => {
    const preferred = ["professional", "dynamic", "basic"];
    const present = Array.from(planCounts.keys());
    const known = preferred.filter((p) => present.includes(p));
    const unknown = present.filter((p) => !preferred.includes(p)).sort();
    return [...known, ...unknown];
  }, [planCounts]);

  const planLabel = (planId: string): string => {
    switch (planId) {
      case "basic":
        return "Basic";
      case "dynamic":
        return "Dynamic";
      case "professional":
        return "Professional";
      default:
        return planId.charAt(0).toUpperCase() + planId.slice(1);
    }
  };

  const advancedFilterCount = useMemo(() => {
    let n = 0;
    if (filters.created !== "all") n += 1;
    if (filters.expiry !== "all") n += 1;
    if (filters.planMonths !== "all") n += 1;
    if (filters.category !== "all") n += 1;
    return n;
  }, [filters]);

  const sortedRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const now = Date.now();
    const MS_DAY = 24 * 60 * 60 * 1000;

    let createdFromMs: number | null = null;
    let createdToMs: number | null = null;

    const windowFromNow = (daysBack: number) => {
      createdFromMs = now - daysBack * MS_DAY;
      createdToMs = now;
    };

    switch (filters.created) {
      case "today": {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        createdFromMs = start.getTime();
        createdToMs = now;
        break;
      }
      case "in3d":
        windowFromNow(3);
        break;
      case "in7d":
        windowFromNow(7);
        break;
      case "in15d":
        windowFromNow(15);
        break;
      case "in1m":
        windowFromNow(30);
        break;
      case "in3m":
        windowFromNow(90);
        break;
      case "in6m":
        windowFromNow(180);
        break;
      case "in1y":
        windowFromNow(365);
        break;
      case "custom": {
        if (filters.customFrom) {
          const d = new Date(filters.customFrom);
          d.setHours(0, 0, 0, 0);
          createdFromMs = d.getTime();
        }
        if (filters.customTo) {
          const d = new Date(filters.customTo);
          d.setHours(23, 59, 59, 999);
          createdToMs = d.getTime();
        }
        break;
      }
      default:
        break;
    }

    const filtered = tenants.filter((t) => {
      if (planFilter !== null && (t.planId ?? "professional") !== planFilter) {
        return false;
      }

      if (q) {
        const hay = `${t.displayName} ${t.slug}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filters.category !== "all" && t.storeCategory !== filters.category) {
        return false;
      }

      if (createdFromMs !== null || createdToMs !== null) {
        const ts = new Date(t._createdAt).getTime();
        if (createdFromMs !== null && ts < createdFromMs) return false;
        if (createdToMs !== null && ts > createdToMs) return false;
      }

      const days = t._daysUntilExpiry;

      if (filters.expiry === "expired") {
        if (!(days !== Infinity && days < 0)) return false;
      } else if (filters.expiry === "next3d") {
        if (!(days !== Infinity && days >= 0 && days <= 3)) return false;
      } else if (filters.expiry === "next7d") {
        if (!(days !== Infinity && days >= 0 && days <= 7)) return false;
      } else if (filters.expiry === "next15d") {
        if (!(days !== Infinity && days >= 0 && days <= 15)) return false;
      }

      if (filters.planMonths !== "all") {
        const bucket = monthsFromDays(days);
        if (bucket !== filters.planMonths) return false;
      }

      return true;
    });

    // Newest first. `_createdAt` is an ISO timestamp; fall back to 0
    // when it's missing (legacy rows without created_at).
    return [...filtered].sort((a, b) => {
  // `main` (the platform tenant) is always pinned to the top.
  const aIsMain = a.slug === "main";
  const bIsMain = b.slug === "main";
  if (aIsMain && !bIsMain) return -1;
  if (!aIsMain && bIsMain) return 1;

  // Everything else sorted newest-first by `_createdAt`.
  const aT = new Date(a._createdAt).getTime() || 0;
  const bT = new Date(b._createdAt).getTime() || 0;
  return bT - aT;
});
  }, [tenants, planFilter, filters]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  // Whenever the filter result set changes, snap back to page 1 so the
  // user never lands on an empty page.
  useEffect(() => {
    setPage(1);
  }, [planFilter, filters]);

  return (
    <>
      <InlineSection
        title={`Stores (${tenants.length})`}
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadAll}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={<PlusIcon width={16} height={16} fill="#fff" />}
              onClick={openCreateModal}
            >
              Add
            </Button>
          </>
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

        {pauseRequests.length > 0 && (
          <Banner variant="warning" inline>
            {pauseRequests.length} pause request
            {pauseRequests.length === 1 ? "" : "s"} pending
          </Banner>
        )}

        {!loading && tenants.length > 0 && (
          <div className={local.planPills}>
            <button
              type="button"
              className={`${local.planPill} ${
                planFilter === null ? local.planPillActive : ""
              }`}
              onClick={() => setPlanFilter(null)}
            >
              All
              <span className={local.planPillCount}>{tenants.length}</span>
            </button>

            {planOrder.map((planId) => {
              const count = planCounts.get(planId) ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={planId}
                  type="button"
                  className={`${local.planPill} ${
                    planFilter === planId ? local.planPillActive : ""
                  }`}
                  onClick={() =>
                    setPlanFilter((prev) => (prev === planId ? null : planId))
                  }
                >
                  {planLabel(planId)}
                  <span className={local.planPillCount}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {!loading && tenants.length > 0 && (
          <div className={local.searchRow}>
            <div className={local.searchBox}>
              <Input
                placeholder="Search stores by name or slug"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                leftIcon={
                  <SearchIcon
                    width={18}
                    height={18}
                    fill="#dcdcdc"
                    aria-hidden
                  />
                }
                rightIcon={
                  filters.search ? (
                    <IconButton
                      variant="ghost"
                      size="xs"
                      aria-label="Clear search"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, search: "" }))
                      }
                    >
                      <CloseIcon width={18} height={18} fill="#4d4d4d" />
                    </IconButton>
                  ) : undefined
                }
              />
            </div>

            <Button
              variant={advancedFilterCount > 0 ? "primary" : "ghost"}
              onClick={() => setIsFilterSheetOpen(true)}
              leftIcon={
                <FilterIcon width={14} height={14} fill="currentColor" />
              }
              rightIcon={
                advancedFilterCount > 0 ? (
                  <span className={local.filterCount}>
                    {advancedFilterCount}
                  </span>
                ) : undefined
              }
              className={local.filterBtn}
            >
              <span className={local.filterBtnText}>Filters</span>
            </Button>
          </div>
        )}

        {loading ? (
          <EmptyState title="Loading stores..." />
        ) : tenants.length === 0 ? (
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
        ) : sortedRows.length === 0 ? (
          <EmptyState
            title="No stores match your filters"
            description="Try adjusting or clearing the filters."
            action={
              <Button
                variant="ghost"
                onClick={() => {
                  setPlanFilter(null);
                  setFilters(EMPTY_FILTERS);
                }}
              >
                Clear all filters
              </Button>
            }
          />
        ) : (
          <>
            <div className={local.list}>
              {paginatedRows.map((t) => (
                <div
                  key={t.id}
                  className={`${local.row} ${local.storeItemRow}`}
                >
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
                          {typeof t._daysUntilExpiry === "number" &&
                            t._daysUntilExpiry !== Infinity && (
                              <span
                                className={`${local.expiryDays} ${
                                  t._daysUntilExpiry <= 0
                                    ? local.expiryExpired
                                    : t._daysUntilExpiry <= 7
                                      ? local.expirySoon
                                      : ""
                                }`}
                              >
                                {t._daysUntilExpiry > 0
                                  ? `${t._daysUntilExpiry} day${
                                      t._daysUntilExpiry === 1 ? "" : "s"
                                    } left`
                                  : "Expired"}
                              </span>
                            )}
                        </div>

                        <div className={local.metaRow}>
                          <span className={local.categoryChip}>
                            {getCategoryLabel(t.storeCategory)}
                          </span>
                          {t.isActive === false && (
                            <Badge tone="danger" size="sm">
                              inactive
                            </Badge>
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
                            onClick={() =>
                              setPendingRowAction({ kind: "qr", tenant: t })
                            }
                            title="Download Public QR"
                          >
                            <DownloadIcon
                              width={16}
                              height={16}
                              fill={tokens.borderHover}
                            />
                          </Button>
                          <Button
                            size="xs"
                            variant="link"
                            onClick={() =>
                              setPendingRowAction({
                                kind: "credentials",
                                tenant: t,
                              })
                            }
                            title="Generate or reuse credentials"
                          >
                            <EyeOffIcon
                              width={16}
                              height={16}
                              fill={tokens.borderHover}
                            />
                          </Button>
                          <Button
                            size="xs"
                            variant="link"
                            onClick={() =>
                              setPendingRowAction({ kind: "edit", tenant: t })
                            }
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
                          size="sm"
                          variant="primary"
                          onClick={() => openAdminInNewTab(t.slug)}
                        >
                          Admin
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openInNewTab(t.slug)}
                        >
                          User
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setChangePlanFor(t)}
                        >
                          Upgrade
                        </Button>
                        {t.slug !== "main" && (
                          <Button
                            size="sm"
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
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={sortedRows.length}
                pageSize={PAGE_SIZE}
                onChange={setPage}
              />
            )}
          </>
        )}
      </InlineSection>

      {/* ============ Credentials modal ============ */}
      <Modal
        isOpen={!!credentialsModal}
        mobileFullScreen
        disableBackdropClose={true}
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

      {/* ============ Filter sheet ============ */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        initial={filters}
        onApply={(next) => {
          setFilters(next);
          setIsFilterSheetOpen(false);
        }}
        onClose={() => setIsFilterSheetOpen(false)}
      />

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

      {/* Row-action confirmation (QR / credentials / edit) */}
      <ConfirmDialog
        isOpen={!!pendingRowAction}
        title={rowActionCopy(pendingRowAction).title}
        message={rowActionCopy(pendingRowAction).message}
        confirmText={rowActionCopy(pendingRowAction).confirmText}
        variant={rowActionCopy(pendingRowAction).variant}
        onConfirm={async () => {
          const action = pendingRowAction;
          setPendingRowAction(null);
          if (!action) return;
          switch (action.kind) {
            case "qr":
              await downloadPublicQrPdf({
                storeName: action.tenant.displayName,
                url: buildTenantUrl(action.tenant.slug),
              });
              flashSuccess(
                `Public QR downloaded for ${action.tenant.displayName}`,
              );
              break;
            case "credentials":
              await handleCopyCredentials(action.tenant);
              break;
            case "edit":
              startEditing(action.tenant);
              break;
          }
        }}
        onCancel={() => setPendingRowAction(null)}
      />
    </>
  );
};

export default TenantManagerBody;
