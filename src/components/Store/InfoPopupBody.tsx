// src/components/Store/InfoPopupBody.tsx
import React, { useEffect, useRef, useState } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { useAuth } from "../../hooks/useAuth";
import { supabaseService } from "../../services/supabase.service";
import {
  Modal,
  Button,
  IconButton,
  FormField,
  Input,
  Banner,
  Toggle,
} from "../ui";
import { CopyIcon, DownloadIcon } from "../../assets/svgs";
import EditIcon from "../../assets/svgs/EditIcon";
import ImageUpload from "../Admin/ImageUpload";
import type { ImageUploadHandle } from "../Admin/ImageUpload";
import MessageTemplateEditor from "./MessageTemplateEditor";
import PlanChangeModal from "../Payments/PlanChangeModal";
import { ShopInfo } from "../../config/credentials";
import { usePlan } from "../../hooks/usePlan";
import { ROLE_AVATAR_URL } from "../ui/Avatar/Avatar";
import { InlineSection } from "../Dashboard/inline";
import {
  downloadAdminQrPdf,
  downloadPublicQrPdf,
} from "../../utils/qrPdf";
import local from "./InfoPopup.module.scss";

interface InfoPopupBodyProps {
  onClose?: () => void;
}

type EditableField =
  | "banner_url"
  | "display_name"
  | "store_tagline"
  | "owner_phone"
  | "whatsapp_phone"
  | "delivery_charge"
  | "storewide_discount"
  | "gst_percent"
  | "packing_charge"
  | "upi_id";

interface FieldDef {
  key: EditableField;
  label: string;
  getValue: (t: any) => string;
  type: "text" | "tel" | "number" | "image";
  placeholder?: string;
  hint?: string;
  dineinHidden?: boolean;
  dineinOnly?: boolean;
}

type PendingToggle =
  | { kind: "dinein"; next: boolean }
  | { kind: "tipping"; next: boolean };

const blankIfZero = (
  e: React.FocusEvent<HTMLInputElement>,
  currentValue: string,
) => {
  const n = Number(currentValue);
  if (Number.isFinite(n) && n === 0) {
    e.currentTarget.value = "";
  }
};

const restoreZeroIfBlank = (
  e: React.FocusEvent<HTMLInputElement>,
  onEmpty: () => void,
) => {
  if (e.currentTarget.value.trim() === "") {
    onEmpty();
  }
};

const FIELDS: FieldDef[] = [
  {
    key: "banner_url",
    label: "Store Offer Banner",
    type: "image",
    getValue: (t) => t?.bannerUrl || "",
    hint: "Shown at the top of the menu page. Leave blank to use the default banner.",
  },
  {
    key: "display_name",
    label: "Store Name",
    type: "text",
    getValue: (t) => t?.displayName || ShopInfo.Shop_name,
  },
  {
    key: "store_tagline",
    label: "Store Tagline",
    type: "text",
    getValue: (t) => t?.storeTagline || ShopInfo.Shop_tagline,
  },
  {
    key: "owner_phone",
    label: "Owner Phone",
    type: "tel",
    getValue: (t) => t?.ownerPhone || ShopInfo.Owner_phone,
  },
  {
    key: "whatsapp_phone",
    label: "Store WhatsApp Number",
    type: "tel",
    getValue: (t) => t?.whatsappPhone || ShopInfo.Store_whatsapp,
    hint: "Customer orders arrive here.",
    dineinHidden: true,
  },
  {
    key: "delivery_charge",
    label: "Delivery Charge (Rs)",
    type: "number",
    getValue: (t) => {
      const n = Number(t?.deliveryCharge);
      return Number.isFinite(n) ? String(n) : String(ShopInfo.Delivery_charge);
    },
    dineinHidden: true,
  },
  {
    key: "packing_charge",
    label: "Packing Charge (Rs)",
    type: "number",
    getValue: (t) => {
      const n = Number(t?.packingCharge);
      return Number.isFinite(n) ? String(n) : "0";
    },
    hint: "Fixed amount added to every order. Set to 0 to disable.",
    dineinHidden: true,
  },
  {
    key: "gst_percent",
    label: "GST Percentage",
    type: "number",
    getValue: (t) => {
      const n = Number(t?.gstPercent);
      return Number.isFinite(n) ? String(n) : "0";
    },
    hint: "Applied on the cart subtotal at checkout. Set to 0 to disable.",
  },
  {
    key: "storewide_discount",
    label: "Storewide Discount (%)",
    type: "number",
    getValue: (t) => {
      const n = Number(t?.storewideDiscount);
      return Number.isFinite(n)
        ? String(n)
        : String(ShopInfo.Storewide_discount);
    },
    hint: "0-100. Applied on Online payment.",
  },
  {
    key: "upi_id",
    label: "Store UPI ID",
    type: "text",
    getValue: (t) => t?.upiId || "",
    dineinOnly: true,
    hint: "Used for Pay Online on dine-in bills. e.g. yourname@bank",
  },
];

const InfoPopupBody: React.FC<InfoPopupBodyProps> = ({ onClose: _onClose }) => {
  const { tenant, refreshTenant } = useTenant();
  const plan = usePlan();
  const { isAdmin } = useAuth();

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [isPlanChangeOpen, setIsPlanChangeOpen] = useState(false);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const avatarUploaderRef = useRef<ImageUploadHandle>(null);
  const [avatarPending, setAvatarPending] = useState(false);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(
    null,
  );

  if (!tenant) return null;

  const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
  const base = `${window.location.origin}${dir}`;
  const adminUrl = `${base}admin.html?t=${tenant.slug}_admin`;
  const publicUrl = `${base}customer.html?t=${tenant.slug}`;

  const isDinein = tenant.dineinEnabled === true;
  const dineinToggleVisible =
    tenant.storeCategory === "food-beverage" &&
    plan.canEditProfileField("dinein_enabled");

  const roleKey = isAdmin ? "admin" : "staff";
  const currentAvatarSrc = tenant.avatarUrl || ROLE_AVATAR_URL[roleKey];

  const isDefault = (key: EditableField): boolean => {
    if (!tenant.infoDefaults) return false;
    switch (key) {
      case "display_name":
        return !!tenant.infoDefaults.displayName;
      case "store_tagline":
        return !!tenant.infoDefaults.storeTagline;
      case "owner_phone":
        return !!tenant.infoDefaults.ownerPhone;
      case "whatsapp_phone":
        return !!tenant.infoDefaults.whatsappPhone;
      case "banner_url":
        return !!tenant.infoDefaults.bannerUrl;
      case "delivery_charge":
        return !!tenant.infoDefaults.deliveryCharge;
      case "storewide_discount":
        return !!tenant.infoDefaults.storewideDiscount;
      case "gst_percent":
        return (
          !Number.isFinite(Number(tenant.gstPercent)) ||
          Number(tenant.gstPercent) === 0
        );
      case "packing_charge":
        return (
          !Number.isFinite(Number(tenant.packingCharge)) ||
          Number(tenant.packingCharge) === 0
        );
      case "upi_id":
        return !tenant.upiId;
      default:
        return false;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const openEditor = (field: FieldDef) => {
    setEditingField(field.key);
    setDraftValue(field.getValue(tenant));
    setError("");
    setSuccess("");
  };

  const closeEditor = () => {
    if (isSaving) return;
    setEditingField(null);
    setDraftValue("");
    setError("");
  };

  const saveEdit = async () => {
    if (!editingField) return;
    const value = draftValue.trim();

    if (editingField === "display_name" && !value) {
      setError("Store name cannot be empty.");
      return;
    }
    if (
      (editingField === "owner_phone" || editingField === "whatsapp_phone") &&
      value &&
      !/^\d{10}$/.test(value)
    ) {
      setError("Phone must be exactly 10 digits.");
      return;
    }
    if (editingField === "delivery_charge") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        setError("Delivery charge must be a positive number.");
        return;
      }
    }
    if (editingField === "packing_charge") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        setError("Packing charge must be a positive number.");
        return;
      }
    }
    if (editingField === "gst_percent") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        setError("GST must be between 0 and 100.");
        return;
      }
    }
    if (editingField === "storewide_discount") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        setError("Storewide discount must be between 0 and 100.");
        return;
      }
    }

    setIsSaving(true);
    setError("");
    try {
      await supabaseService.updateTenantInfo(tenant.slug, editingField, value);

      if (
        editingField === "upi_id" &&
        !value &&
        tenant.dineinEnabled === true
      ) {
        try {
          await supabaseService.updateTenantInfo(
            tenant.slug,
            "dinein_enabled",
            "false",
          );
        } catch (err) {
          console.warn("[InfoPopupBody] failed to auto-disable dine-in:", err);
        }
      }

      if (editingField === "banner_url") {
        await refreshTenant({ expectBanner: value });
      } else {
        await refreshTenant();
      }

      setSuccess("Saved");
      setTimeout(() => {
        setEditingField(null);
        setDraftValue("");
        setSuccess("");
      }, 500);
    } catch (err) {
      console.error("[InfoPopupBody] save failed:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const requestDineinToggle = (next: boolean) => {
    setError("");
    if (tenant.storeCategory !== "food-beverage") {
      setError(
        "Dine-in ordering is only available for Food & Beverage stores.",
      );
      return;
    }
    if (next && !(tenant.upiId && tenant.upiId.trim())) {
      setError(
        "Add a Store UPI ID first - dine-in customers need it to pay online.",
      );
      return;
    }
    setPendingToggle({ kind: "dinein", next });
  };

  const requestStaffTippingToggle = (next: boolean) => {
    setError("");
    if (tenant.storeCategory !== "food-beverage") {
      setError("Staff tipping is only available for Food & Beverage stores.");
      return;
    }
    if (tenant.dineinEnabled !== true) {
      setError("Enable dine-in first - staff tipping is a dine-in feature.");
      return;
    }
    setPendingToggle({ kind: "tipping", next });
  };

  const applyPendingToggle = async () => {
    if (!pendingToggle) return;
    const { kind, next } = pendingToggle;

    if (kind === "dinein" && next && tenant.storeCategory !== "food-beverage") {
      setPendingToggle(null);
      setError(
        "Dine-in ordering is only available for Food & Beverage stores.",
      );
      return;
    }

    setToggleBusy(true);
    setError("");
    try {
      if (kind === "dinein") {
        await supabaseService.updateTenantInfo(
          tenant.slug,
          "dinein_enabled",
          next ? "true" : "false",
        );
      } else {
        await supabaseService.updateTenantInfo(
          tenant.slug,
          "staff_tipping_enabled",
          next ? "true" : "false",
        );
      }
      await refreshTenant();
      setPendingToggle(null);
    } catch (err) {
      console.error("[InfoPopupBody] toggle failed:", err);
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setToggleBusy(false);
    }
  };

  const cancelPendingToggle = () => {
    if (toggleBusy) return;
    setPendingToggle(null);
  };

  const confirmTitle = (() => {
    if (!pendingToggle) return "";
    const verb = pendingToggle.next ? "Enable" : "Disable";
    return pendingToggle.kind === "dinein"
      ? `${verb} dine-in ordering?`
      : `${verb} staff tipping?`;
  })();

  const activeFieldDef = FIELDS.find((f) => f.key === editingField) || null;

  const planStatus = tenant.subscriptionStatus ?? "active";
  const planExpires = tenant.subscriptionExpiresAt
    ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

  return (
    <>
      <InlineSection
        title="Store Information"
        actions={
          isAdmin ? (
            <button
              type="button"
              className={local.avatarHeaderBtn}
              onClick={() => setIsAvatarEditorOpen(true)}
              aria-label="Edit store avatar"
              title="Edit store avatar"
            >
              <img
                src={currentAvatarSrc}
                alt="Store avatar"
                className={local.avatarHeaderImg}
                draggable={false}
                onError={(e) => {
                  const fallback = ROLE_AVATAR_URL[roleKey];
                  if (fallback && e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
              />
              <span className={local.avatarHeaderEditBadge} aria-hidden>
                <EditIcon width={10} height={10} fill="#1e7e34" />
              </span>
            </button>
          ) : undefined
        }
      >
        <div className={local.rows}>
          <div className={local.row}>
            <div className={local.rowMain}>
              <div className={local.labelRow}>
                <span className={local.label}>Plan</span>
                <span className={local.defaultPill}>
                  {tenant.planName ?? "Professional"} -{" "}
                  {planStatus.toUpperCase()}
                </span>
              </div>
              <div className={local.value}>Expires on {planExpires}</div>
            </div>
            <IconButton
              variant="ghost"
              size="md"
              aria-label="Change plan"
              tooltip="Change plan"
              onClick={() => setIsPlanChangeOpen(true)}
            >
              <EditIcon width={16} height={16} fill="#0F172A" />
            </IconButton>
          </div>

          <div className={local.row}>
            <div className={local.rowMain}>
              <div className={local.labelRow}>
                <span className={local.label}>Public Store URL</span>
              </div>
              <div className={local.value}>{publicUrl}</div>
            </div>
            <IconButton
              variant="soft"
              size="md"
              aria-label="Copy public URL"
              tooltip="Copy public URL"
              onClick={() => copyToClipboard(publicUrl)}
            >
              <CopyIcon width={16} height={16} fill="#0F172A" />
            </IconButton>
          </div>

          <div className={local.row}>
            <div className={local.rowMain}>
              <div className={local.labelRow}>
                <span className={local.label}>Admin Store URL</span>
              </div>
              <div className={local.value}>{adminUrl}</div>
            </div>
            <IconButton
              variant="soft"
              size="md"
              aria-label="Copy admin URL"
              tooltip="Copy admin URL"
              onClick={() => copyToClipboard(adminUrl)}
            >
              <CopyIcon width={16} height={16} fill="#0F172A" />
            </IconButton>
          </div>

          <div className={local.row}>
            <div className={local.rowMain}>
              <div className={local.labelRow}>
                <span className={local.label}>QR Codes</span>
              </div>
              <div className={local.value}>
                Download printable QR codes for the storefront and admin login.
              </div>
              <div className={local.qrButtonRow}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    downloadPublicQrPdf({
                      storeName: tenant.displayName,
                      url: publicUrl,
                    })
                  }
                  leftIcon={
                    <DownloadIcon width={16} height={16} fill="#4d4d4d" />
                  }
                >
                  Public QR
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    downloadAdminQrPdf({
                      storeName: tenant.displayName,
                      url: adminUrl,
                    })
                  }
                  leftIcon={
                    <DownloadIcon width={16} height={16} fill="#4d4d4d" />
                  }
                >
                  Admin QR
                </Button>
              </div>
            </div>
          </div>

          {tenant.storeCategory === "food-beverage" &&
            plan.canEditProfileField("dinein_enabled") &&
            (() => {
              const hasUpi = !!(tenant.upiId && tenant.upiId.trim());
              return (
                <div className={local.row}>
                  <div className={local.rowMain}>
                    <div className={local.labelRow}>
                      <span className={local.label}>Dine-in ordering</span>
                      {!hasUpi && (
                        <span className={local.defaultPill}>
                          UPI ID required
                        </span>
                      )}
                    </div>
                    <div className={local.value}>
                      Let customers place dine-in orders directly from their
                      table. Whatsapp order will be disabled
                    </div>
                    {!hasUpi && (
                      <div className={local.hint}>
                        Add a Store UPI ID below first - dine-in customers need
                        it to pay online.
                      </div>
                    )}
                  </div>
                  <Toggle
                    checked={tenant.dineinEnabled === true && hasUpi}
                    disabled={toggleBusy || !hasUpi}
                    title={
                      hasUpi
                        ? undefined
                        : "Add a Store UPI ID first to enable dine-in ordering"
                    }
                    onChange={(e) => requestDineinToggle(e.target.checked)}
                  />
                </div>
              );
            })()}

          {tenant.storeCategory === "food-beverage" &&
            tenant.dineinEnabled === true &&
            plan.canEditProfileField("dinein_enabled") && (
              <div className={local.row}>
                <div className={local.rowMain}>
                  <div className={local.labelRow}>
                    <span className={local.label}>Allow staff tips</span>
                  </div>
                  <div className={local.value}>
                    Show tip options (Rs 10 / 20 / 50 / 100 / 150) to
                    customers on the bill screen. The tip is added to the
                    total and is visible to you on the order card. Not shown
                    on receipts or order history.
                  </div>
                </div>
                <Toggle
                  checked={tenant.staffTippingEnabled === true}
                  disabled={toggleBusy}
                  onChange={(e) =>
                    requestStaffTippingToggle(e.target.checked)
                  }
                />
              </div>
            )}

          {FIELDS.map((field) => {
            const canEdit = plan.canEditProfileField(field.key);
            if (!canEdit) return null;

            if (field.dineinHidden && isDinein) return null;
            if (field.dineinOnly && !dineinToggleVisible) return null;

            const isImage = field.type === "image";
            const usingDefault = isDefault(field.key);

            const value =
              field.key === "banner_url"
                ? tenant.bannerUrl || ShopInfo.Shop_banner || ""
                : field.getValue(tenant);

            return (
              <div key={field.key} className={local.row}>
                <div className={local.rowMain}>
                  <div className={local.labelRow}>
                    <span className={local.label}>{field.label}</span>
                    {usingDefault && (
                      <span className={local.defaultPill}>Using default</span>
                    )}
                  </div>

                  {isImage ? (
                    value ? (
                      <img
                        src={value}
                        alt={field.label}
                        className={local.previewImg}
                        onError={(e) => {
                          const fallbackUrl = ShopInfo.Shop_banner;
                          if (
                            fallbackUrl &&
                            e.currentTarget.src !== fallbackUrl
                          ) {
                            e.currentTarget.src = fallbackUrl;
                          }
                        }}
                      />
                    ) : (
                      <div className={local.emptyPreview}>
                        No banner uploaded
                      </div>
                    )
                  ) : (
                    <div className={local.value}>
                      {value || (
                        <span className={local.empty}>- Not set -</span>
                      )}
                    </div>
                  )}

                  {field.hint && <div className={local.hint}>{field.hint}</div>}
                </div>

                <IconButton
                  variant="ghost"
                  size="md"
                  aria-label={`Edit ${field.label}`}
                  tooltip={`Edit ${field.label}`}
                  onClick={() => openEditor(field)}
                >
                  <EditIcon width={16} height={16} fill="#0F172A" />
                </IconButton>
              </div>
            );
          })}

          {!isDinein && plan.canEditProfileField("message_template") && (
            <div className={local.row}>
              <div className={local.rowMain}>
                <div className={local.labelRow}>
                  <span className={local.label}>
                    WhatsApp Message Template
                  </span>
                </div>
                <div className={local.value}>
                  Customize the exact text customers send to your WhatsApp.
                </div>
              </div>
              <IconButton
                variant="ghost"
                size="md"
                aria-label="Edit message template"
                tooltip="Edit message template"
                onClick={() => setIsTemplateEditorOpen(true)}
              >
                <EditIcon width={16} height={16} fill="#0F172A" />
              </IconButton>
            </div>
          )}
        </div>
      </InlineSection>

      <Modal
        isOpen={!!pendingToggle}
        onClose={cancelPendingToggle}
        mobileFullScreen
        title={confirmTitle}
        disableBackdropClose={true}
        size="sm"
        overlayZIndex={1300}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={cancelPendingToggle}
              disabled={toggleBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={applyPendingToggle}
              loading={toggleBusy}
              variant={pendingToggle?.next ? "primary" : "danger"}
            >
              {pendingToggle?.next ? "Yes, enable" : "Yes, disable"}
            </Button>
          </>
        }
      >
        {pendingToggle?.kind === "dinein" && pendingToggle.next && (
          <>
            <p className={local.confirmLead}>
              Once dine-in is on,{" "}
              <strong>online WhatsApp ordering stops working</strong>.
              Customers will only be able to place orders while they are
              inside the restaurant, from their table.
            </p>
            <ul className={local.confirmList}>
              <li>
                The delivery cart and floating cart will be disabled on the
                customer side.
              </li>
              <li>
                The menu's <strong>Add to Cart</strong> button becomes{" "}
                <strong>Place Order</strong>.
              </li>
              <li>
                The store WhatsApp number, delivery charge, packing charge,
                and message template stop applying and are hidden from this
                screen.
              </li>
              <li>
                Online payment works only through the store's UPI ID
                (which is already set).
              </li>
            </ul>
            <p className={local.confirmNote}>
              You can turn dine-in off any time to restore WhatsApp ordering.
            </p>
          </>
        )}

        {pendingToggle?.kind === "dinein" && !pendingToggle.next && (
          <>
            <p className={local.confirmLead}>
              Turning off dine-in will{" "}
              <strong>restore the WhatsApp ordering flow</strong> on the
              customer side.
            </p>
            <ul className={local.confirmList}>
              <li>
                The floating cart and delivery checkout return to the menu.
              </li>
              <li>
                The menu's <strong>Place Order</strong> button becomes{" "}
                <strong>Add to Cart</strong> again.
              </li>
              <li>
                Staff tip options are hidden from customers (they only appear
                in the dine-in bill flow).
              </li>
              <li>
                Any in-progress dine-in orders at tables will continue to work
                as they are.
              </li>
            </ul>
          </>
        )}

        {pendingToggle?.kind === "tipping" && pendingToggle.next && (
          <>
            <p className={local.confirmLead}>
              Enabling staff tips will show{" "}
              <strong>Rs 10 / 20 / 50 / 100 / 150</strong> buttons to
              customers above the Request Bill button.
            </p>
            <ul className={local.confirmList}>
              <li>
                The tip amount is{" "}
                <strong>added to the customer's total</strong> and
                included in the amount they pay.
              </li>
              <li>
                The tip is only visible to you on the order card after the
                order is paid - it is not itemized on receipts or order
                history.
              </li>
              <li>
                Customers can change or remove the tip any time before
                requesting the bill.
              </li>
            </ul>
          </>
        )}

        {pendingToggle?.kind === "tipping" && !pendingToggle.next && (
          <>
            <p className={local.confirmLead}>
              Turning off staff tips will <strong>hide the tip buttons</strong>{" "}
              from the customer's bill screen.
            </p>
            <ul className={local.confirmList}>
              <li>
                Any tip already added to an in-progress order will still be
                charged - the setting only affects new tip selections.
              </li>
              <li>
                Existing paid orders with a tip keep the tip amount on their
                card.
              </li>
            </ul>
          </>
        )}

        {error && (
          <Banner variant="error" inline onDismiss={() => setError("")}>
            {error}
          </Banner>
        )}
      </Modal>

      <Modal
        isOpen={!!activeFieldDef}
        onClose={closeEditor}
        disableBackdropClose={true}
        title={activeFieldDef ? `Edit ${activeFieldDef.label}` : ""}
        size="sm"
        footer={
          activeFieldDef ? (
            <>
              <Button variant="ghost" onClick={closeEditor} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={() => saveEdit()} loading={isSaving}>
                Save
              </Button>
            </>
          ) : undefined
        }
      >
        {activeFieldDef && (
          <>
            {activeFieldDef.type === "image" ? (
              <>
                <ImageUpload
                  currentImage={draftValue}
                  onImageUploaded={(url) => {
                    setDraftValue(url);
                    setError("");
                  }}
                  label="Upload Banner"
                  folder="banners"
                />
                {error && (
                  <Banner
                    variant="error"
                    inline
                    onDismiss={() => setError("")}
                    className={local.editorBanner}
                  >
                    {error}
                  </Banner>
                )}
              </>
            ) : (
              <FormField
                label={activeFieldDef.label}
                hint={activeFieldDef.hint}
                error={error}
              >
                <Input
                  type={
                    activeFieldDef.type === "number"
                      ? "number"
                      : activeFieldDef.type === "tel"
                        ? "tel"
                        : "text"
                  }
                  value={draftValue}
                  onFocus={(e) => {
                    if (activeFieldDef.type === "number") {
                      blankIfZero(e, draftValue);
                    }
                  }}
                  onBlur={(e) => {
                    if (activeFieldDef.type === "number") {
                      restoreZeroIfBlank(e, () => setDraftValue("0"));
                    }
                  }}
                  onChange={(e) => {
                    let v = e.target.value;
                    if (activeFieldDef.type === "tel") {
                      v = v.replace(/\D/g, "").slice(0, 10);
                    }
                    if (activeFieldDef.type === "number") {
                      v = v.replace(/[^\d.]/g, "");
                    }
                    setDraftValue(v);
                    setError("");
                  }}
                  placeholder={activeFieldDef.placeholder}
                  autoFocus
                  invalid={!!error}
                />
              </FormField>
            )}

            {success && (
              <Banner variant="success" inline className={local.editorBanner}>
                {success}
              </Banner>
            )}
          </>
        )}
      </Modal>

      <Modal
        isOpen={isAvatarEditorOpen}
        onClose={() => {
          if (isAvatarSaving) return;
          avatarUploaderRef.current?.discard();
          setIsAvatarEditorOpen(false);
        }}
        title="Store Avatar"
        size="sm"
        disableBackdropClose={true}
        mobileFullScreen
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                avatarUploaderRef.current?.discard();
                setIsAvatarEditorOpen(false);
              }}
              disabled={isAvatarSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (isAvatarSaving) return;
                setIsAvatarSaving(true);
                try {
                  const url = await avatarUploaderRef.current?.upload();
                  if (typeof url !== "string") return;

                  await supabaseService.updateTenantInfo(
                    tenant.slug,
                    "avatar_url",
                    url,
                  );
                  await refreshTenant();
                  setIsAvatarEditorOpen(false);
                } catch (err) {
                  console.error("[InfoPopupBody] avatar save failed:", err);
                } finally {
                  setIsAvatarSaving(false);
                }
              }}
              loading={isAvatarSaving}
              disabled={!avatarPending && !isAvatarSaving}
            >
              Save
            </Button>
          </>
        }
      >
        <div className={local.avatarPreviewRow}>
          <img
            src={currentAvatarSrc}
            alt="Current store avatar"
            className={local.avatarPreviewImg}
          />
          <div className={local.avatarPreviewHint}>
            Upload a square image. It will be resized to a maximum of
            128x128 pixels and uploaded only when you press Save.
          </div>
        </div>

        <ImageUpload
          ref={avatarUploaderRef}
          deferred
          currentImage={tenant.avatarUrl ?? ""}
          folder="avatars"
          maxDimension={128}
          maxFileSizeMB={2}
          onPendingChange={setAvatarPending}
        />
      </Modal>

      <MessageTemplateEditor
        isOpen={isTemplateEditorOpen}
        onClose={() => setIsTemplateEditorOpen(false)}
      />

      <PlanChangeModal
        isOpen={isPlanChangeOpen}
        mode="tenant"
        tenantSlug={tenant.slug}
        tenantName={tenant.displayName}
        currentPlanId={tenant.planId}
        onClose={() => setIsPlanChangeOpen(false)}
        onComplete={() => {
          refreshTenant();
          setIsPlanChangeOpen(false);
        }}
      />
    </>
  );
};

export default InfoPopupBody;