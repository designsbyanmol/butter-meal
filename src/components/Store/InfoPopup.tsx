// components/Store/InfoPopup.tsx
import React, { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import {
  Modal,
  Button,
  IconButton,
  FormField,
  Input,
  Banner,
  Toggle,
} from '../ui';
import { CopyIcon } from '../../assets/svgs';
import EditIcon from '../../assets/svgs/EditIcon';
import ImageUpload from '../Admin/ImageUpload';
import MessageTemplateEditor from './MessageTemplateEditor';
import PlanChangeModal from '../Payments/PlanChangeModal';
import { ShopInfo } from '../../config/credentials';
import { usePlan } from '../../hooks/usePlan';
import local from './InfoPopup.module.scss';

interface InfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type EditableField =
  | 'banner_url'
  | 'display_name'
  | 'store_tagline'
  | 'owner_phone'
  | 'whatsapp_phone'
  | 'delivery_charge'
  | 'storewide_discount'
  | 'gst_percent'
  | 'packing_charge'
  | 'upi_id';

interface FieldDef {
  key: EditableField;
  label: string;
  getValue: (t: any) => string;
  type: 'text' | 'tel' | 'number' | 'image';
  placeholder?: string;
  hint?: string;
  dineinHidden?: boolean;
  dineinOnly?: boolean;
}

// ---------------------------------------------------------
// Number-input focus helpers
// ---------------------------------------------------------
const blankIfZero = (
  e: React.FocusEvent<HTMLInputElement>,
  currentValue: string,
) => {
  const n = Number(currentValue);
  if (Number.isFinite(n) && n === 0) {
    e.currentTarget.value = '';
  }
};

const restoreZeroIfBlank = (
  e: React.FocusEvent<HTMLInputElement>,
  onEmpty: () => void,
) => {
  if (e.currentTarget.value.trim() === '') {
    onEmpty();
  }
};

const FIELDS: FieldDef[] = [
  {
    key: 'banner_url',
    label: 'Store Offer Banner',
    type: 'image',
    getValue: (t) => t?.bannerUrl || '',
    hint: 'Shown at the top of the menu page. Leave blank to use the default banner.',
  },
  {
    key: 'display_name',
    label: 'Store Name',
    type: 'text',
    getValue: (t) => t?.displayName || ShopInfo.Shop_name,
  },
  {
    key: 'store_tagline',
    label: 'Store Tagline',
    type: 'text',
    getValue: (t) => t?.storeTagline || ShopInfo.Shop_tagline,
  },
  {
    key: 'owner_phone',
    label: 'Owner Phone',
    type: 'tel',
    getValue: (t) => t?.ownerPhone || ShopInfo.Owner_phone,
  },
  {
    key: 'whatsapp_phone',
    label: 'Store WhatsApp Number',
    type: 'tel',
    getValue: (t) => t?.whatsappPhone || ShopInfo.Store_whatsapp,
    hint: 'Customer orders arrive here.',
    // Dine-in orders never route through WhatsApp.
    dineinHidden: true,
  },
  {
    key: 'delivery_charge',
    label: 'Delivery Charge (Rs)',
    type: 'number',
    getValue: (t) => {
      const n = Number(t?.deliveryCharge);
      return Number.isFinite(n) ? String(n) : String(ShopInfo.Delivery_charge);
    },
    // Delivery does not exist in dine-in mode.
    dineinHidden: true,
  },
  {
    key: 'packing_charge',
    label: 'Packing Charge (Rs)',
    type: 'number',
    getValue: (t) => {
      const n = Number(t?.packingCharge);
      return Number.isFinite(n) ? String(n) : '0';
    },
    hint: 'Fixed amount added to every order. Set to 0 to disable.',
    // Packing is forced to 0 on every dine-in order.
    dineinHidden: true,
  },
  {
    key: 'gst_percent',
    label: 'GST Percentage',
    type: 'number',
    getValue: (t) => {
      const n = Number(t?.gstPercent);
      return Number.isFinite(n) ? String(n) : '0';
    },
    hint: 'Applied on the cart subtotal at checkout. Set to 0 to disable.',
  },
  {
    key: 'storewide_discount',
    label: 'Storewide Discount (%)',
    type: 'number',
    getValue: (t) => {
      const n = Number(t?.storewideDiscount);
      return Number.isFinite(n)
        ? String(n)
        : String(ShopInfo.Storewide_discount);
    },
    hint: '0-100. Applied on Online payment.',
  },
  {
    key: 'upi_id',
    label: 'Store UPI ID',
    type: 'text',
    getValue: (t) => t?.upiId || '',
    dineinOnly: true,
    hint: 'Used for Pay Online on dine-in bills. e.g. yourname@bank',
  },
];

const InfoPopup: React.FC<InfoPopupProps> = ({ isOpen, onClose }) => {
  const { tenant, refreshTenant } = useTenant();
  const plan = usePlan();

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [isPlanChangeOpen, setIsPlanChangeOpen] = useState(false);
  const [dineinBusy, setDineinBusy] = useState(false);
  const [confirmDineinOpen, setConfirmDineinOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditingField(null);
      setDraftValue('');
      setError('');
      setSuccess('');
      setIsSaving(false);
      setConfirmDineinOpen(false);
    }
  }, [isOpen]);

  if (!isOpen || !tenant) return null;

  const origin = window.location.origin + window.location.pathname;
  const adminUrl = `${origin}?t=${tenant.slug}_admin`;
  const publicUrl = `${origin}?t=${tenant.slug}`;

  // When dine-in is on, delivery-only concepts are hidden from the
  // editor. This mirrors the server-side rules: packing is forced to
  // 0 on dine-in orders, no WhatsApp message is generated, and the
  // delivery charge is never applied.
  const isDinein = tenant.dineinEnabled === true;
  const dineinToggleVisible =
  tenant.storeCategory === 'food-beverage' &&
  plan.canEditProfileField('dinein_enabled');

  const isDefault = (key: EditableField): boolean => {
    if (!tenant.infoDefaults) return false;
    switch (key) {
      case 'display_name':
        return !!tenant.infoDefaults.displayName;
      case 'store_tagline':
        return !!tenant.infoDefaults.storeTagline;
      case 'owner_phone':
        return !!tenant.infoDefaults.ownerPhone;
      case 'whatsapp_phone':
        return !!tenant.infoDefaults.whatsappPhone;
      case 'banner_url':
        return !!tenant.infoDefaults.bannerUrl;
      case 'delivery_charge':
        return !!tenant.infoDefaults.deliveryCharge;
      case 'storewide_discount':
        return !!tenant.infoDefaults.storewideDiscount;
      case 'gst_percent':
        return (
          !Number.isFinite(Number(tenant.gstPercent)) ||
          Number(tenant.gstPercent) === 0
        );
      case 'packing_charge':
        return (
          !Number.isFinite(Number(tenant.packingCharge)) ||
          Number(tenant.packingCharge) === 0
        );
      case 'upi_id':
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
    setError('');
    setSuccess('');
  };

  const closeEditor = () => {
    if (isSaving) return;
    setEditingField(null);
    setDraftValue('');
    setError('');
  };

  const saveEdit = async () => {
    if (!editingField) return;
    const value = draftValue.trim();

    if (editingField === 'display_name' && !value) {
      setError('Store name cannot be empty.');
      return;
    }
    if (
      (editingField === 'owner_phone' || editingField === 'whatsapp_phone') &&
      value &&
      !/^\d{10}$/.test(value)
    ) {
      setError('Phone must be exactly 10 digits.');
      return;
    }
    if (editingField === 'delivery_charge') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        setError('Delivery charge must be a positive number.');
        return;
      }
    }
    if (editingField === 'packing_charge') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        setError('Packing charge must be a positive number.');
        return;
      }
    }
    if (editingField === 'gst_percent') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        setError('GST must be between 0 and 100.');
        return;
      }
    }
    if (editingField === 'storewide_discount') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        setError('Storewide discount must be between 0 and 100.');
        return;
      }
    }

    setIsSaving(true);
    setError('');
    try {
      await supabaseService.updateTenantInfo(tenant.slug, editingField, value);

      // Safety: clearing the UPI ID while dine-in is on would leave
      // the store in a broken state (customers can't pay). Flip
      // dine-in off.
      if (
        editingField === 'upi_id' &&
        !value &&
        tenant.dineinEnabled === true
      ) {
        try {
          await supabaseService.updateTenantInfo(
            tenant.slug,
            'dinein_enabled',
            'false',
          );
        } catch (err) {
          console.warn('[InfoPopup] failed to auto-disable dine-in:', err);
        }
      }

      if (editingField === 'banner_url') {
        await refreshTenant({ expectBanner: value });
      } else {
        await refreshTenant();
      }

      setSuccess('Saved');
      setTimeout(() => {
        setEditingField(null);
        setDraftValue('');
        setSuccess('');
      }, 500);
    } catch (err) {
      console.error('[InfoPopup] save failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------
  // Dine-in toggle
  //
  // Enabling dine-in is a mode switch with real consequences on
  // the customer side (WhatsApp ordering stops). We confirm before
  // writing. Disabling is not destructive, so it goes straight
  // through.
  // ---------------------------------------------------------
  const requestDineinToggle = (next: boolean) => {
    if (tenant.storeCategory !== 'food-beverage') {
    setError('Dine-in ordering is only available for Food & Beverage stores.');
    return;
  }
    if (next && !(tenant.upiId && tenant.upiId.trim())) {
      setError(
        'Add a Store UPI ID first — dine-in customers need it to pay online.',
      );
      return;
    }

    if (next) {
      setConfirmDineinOpen(true);
      return;
    }

    // Disabling — no confirmation.
    void applyDineinToggle(false);
  };

  const applyDineinToggle = async (next: boolean) => {
    if (next && tenant.storeCategory !== 'food-beverage') {
    setConfirmDineinOpen(false);
    setError('Dine-in ordering is only available for Food & Beverage stores.');
    return;
  }
    setDineinBusy(true);
    setError('');
    try {
      await supabaseService.updateTenantInfo(
        tenant.slug,
        'dinein_enabled',
        next ? 'true' : 'false',
      );
      await refreshTenant();
    } catch (err) {
      console.error('[InfoPopup] dine-in toggle failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setDineinBusy(false);
      setConfirmDineinOpen(false);
    }
  };

  const activeFieldDef =
    FIELDS.find((f) => f.key === editingField) || null;

  const planStatus = tenant.subscriptionStatus ?? 'active';
  const planExpires = tenant.subscriptionExpiresAt
    ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

  return (
    <>
      {/* ============ Main info popup ============ */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Informations"
        size="md"
      >
        <div className={local.rows}>
          {/* ---- Plan row ---- */}
          <div className={local.row}>
            <div className={local.rowMain}>
              <div className={local.labelRow}>
                <span className={local.label}>Plan</span>
                <span className={local.defaultPill}>
                  {tenant.planName ?? 'Professional'} .{' '}
                  {planStatus.toUpperCase()}
                </span>
              </div>
              <div className={local.value}>Expires on {planExpires}</div>
            </div>
            <IconButton
              variant="primary"
              size="md"
              aria-label="Change plan"
              tooltip="Change plan"
              onClick={() => setIsPlanChangeOpen(true)}
            >
              <EditIcon width={16} height={16} fill="#1e7e34" />
            </IconButton>
          </div>

          {/* ---- URLs ---- */}
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
              <CopyIcon width={16} height={16} fill="#4d4d4d" />
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
              <CopyIcon width={16} height={16} fill="#4d4d4d" />
            </IconButton>
          </div>

          {/* ---- Dine-in toggle ---- */}
          {tenant.storeCategory === 'food-beverage' &&
  plan.canEditProfileField('dinein_enabled') &&
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
                    table. When on, the menu&apos;s Add-to-Cart becomes Place
                    Order.
                  </div>
                  {!hasUpi && (
                    <div className={local.hint}>
                      Add a Store UPI ID below first — dine-in customers need
                      it to pay online.
                    </div>
                  )}
                </div>
                <Toggle
                  checked={tenant.dineinEnabled === true && hasUpi}
                  disabled={dineinBusy || !hasUpi}
                  title={
                    hasUpi
                      ? undefined
                      : 'Add a Store UPI ID first to enable dine-in ordering'
                  }
                  onChange={(e) => requestDineinToggle(e.target.checked)}
                />
              </div>
            );
          })()}

          {/* ---- Editable fields ---- */}
          {FIELDS.map((field) => {
            const canEdit = plan.canEditProfileField(field.key);
            if (!canEdit) return null;

            // Hide delivery-only fields when dine-in is on.
            if (field.dineinHidden && isDinein) return null;
            if (field.dineinOnly && !dineinToggleVisible) return null;

            const isImage = field.type === 'image';
            const usingDefault = isDefault(field.key);

            const value =
              field.key === 'banner_url'
                ? tenant.bannerUrl || ShopInfo.Shop_banner || ''
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

                  {field.hint && (
                    <div className={local.hint}>{field.hint}</div>
                  )}
                </div>

                <IconButton
                  variant="primary"
                  size="md"
                  aria-label={`Edit ${field.label}`}
                  tooltip={`Edit ${field.label}`}
                  onClick={() => openEditor(field)}
                >
                  <EditIcon width={16} height={16} fill="#1e7e34" />
                </IconButton>
              </div>
            );
          })}

          {/* ---- Message template row ---- */}
          {!isDinein && plan.canEditProfileField('message_template') && (
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
                variant="primary"
                size="md"
                aria-label="Edit message template"
                tooltip="Edit message template"
                onClick={() => setIsTemplateEditorOpen(true)}
              >
                <EditIcon width={16} height={16} fill="#1e7e34" />
              </IconButton>
            </div>
          )}
        </div>
      </Modal>

      {/* ============ Dine-in enable confirmation ============ */}
      <Modal
        isOpen={confirmDineinOpen}
        onClose={() => {
          if (dineinBusy) return;
          setConfirmDineinOpen(false);
        }}
        title="Enable dine-in ordering?"
        size="sm"
        overlayZIndex={1300}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmDineinOpen(false)}
              disabled={dineinBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={() => applyDineinToggle(true)}
              loading={dineinBusy}
            >
              Yes, enable dine-in
            </Button>
          </>
        }
      >
        <p className={local.confirmLead}>
          Once dine-in is on, <strong>online WhatsApp ordering stops
          working</strong>. Customers will only be able to place orders
          while they are inside the restaurant, from their table.
        </p>

        <ul className={local.confirmList}>
          <li>
            The delivery cart and floating cart will be disabled on the
            customer side.
          </li>
          <li>
            The menu&apos;s <strong>Add to Cart</strong> button becomes{' '}
            <strong>Place Order</strong>.
          </li>
          <li>
            The store WhatsApp number, delivery charge, packing charge,
            and message template stop applying and are hidden from this
            screen.
          </li>
          <li>
            Online payment works only through the store&apos;s UPI ID (which
            is already set).
          </li>
        </ul>

        <p className={local.confirmNote}>
          You can turn dine-in off any time to restore WhatsApp ordering.
        </p>
      </Modal>

      {/* ============ Inline field editor ============ */}
      <Modal
        isOpen={!!activeFieldDef}
        onClose={closeEditor}
        title={activeFieldDef ? `Edit ${activeFieldDef.label}` : ''}
        size="sm"
        footer={
          activeFieldDef ? (
            <>
              <Button
                variant="ghost"
                onClick={closeEditor}
                disabled={isSaving}
              >
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
            {activeFieldDef.type === 'image' ? (
              <>
                <ImageUpload
                  currentImage={draftValue}
                  onImageUploaded={(url) => {
                    setDraftValue(url);
                    setError('');
                  }}
                  label="Upload Banner"
                  folder="banners"
                />
                {error && (
                  <Banner
                    variant="error"
                    inline
                    onDismiss={() => setError('')}
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
                    activeFieldDef.type === 'number'
                      ? 'number'
                      : activeFieldDef.type === 'tel'
                      ? 'tel'
                      : 'text'
                  }
                  value={draftValue}
                  onFocus={(e) => {
                    if (activeFieldDef.type === 'number') {
                      blankIfZero(e, draftValue);
                    }
                  }}
                  onBlur={(e) => {
                    if (activeFieldDef.type === 'number') {
                      restoreZeroIfBlank(e, () => setDraftValue('0'));
                    }
                  }}
                  onChange={(e) => {
                    let v = e.target.value;
                    if (activeFieldDef.type === 'tel') {
                      v = v.replace(/\D/g, '').slice(0, 10);
                    }
                    if (activeFieldDef.type === 'number') {
                      v = v.replace(/[^\d.]/g, '');
                    }
                    setDraftValue(v);
                    setError('');
                  }}
                  placeholder={activeFieldDef.placeholder}
                  autoFocus
                  invalid={!!error}
                />
              </FormField>
            )}

            {success && (
              <Banner
                variant="success"
                inline
                className={local.editorBanner}
              >
                {success}
              </Banner>
            )}
          </>
        )}
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

export default InfoPopup;