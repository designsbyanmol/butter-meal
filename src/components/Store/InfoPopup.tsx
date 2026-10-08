// components/Store/InfoPopup.tsx
import React, { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import { Modal, Button, IconButton, FormField, Input, Banner } from '../ui';
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
  | 'storewide_discount';

interface FieldDef {
  key: EditableField;
  label: string;
  getValue: (t: any) => string;
  type: 'text' | 'tel' | 'number' | 'image';
  placeholder?: string;
  hint?: string;
}

const FIELDS: FieldDef[] = [
  {
    key: 'banner_url',
    label: 'Store Offer Banner',
    type: 'image',
    // `getValue` returns the tenant banner or the platform default.
    // BUT for editing we want to reflect the *actual* stored value, so we
    // don't accidentally persist the default URL when the user clicks Save
    // without changing anything. See `openEditor` below for the override.
    getValue: (t) => t?.bannerUrl || '',
    hint:
      'Shown at the top of the menu page. Leave blank to use the default banner.',
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
  },
  {
    key: 'delivery_charge',
    label: 'Delivery Charge (Rs)',
    type: 'number',
    getValue: (t) => {
      const n = Number(t?.deliveryCharge);
      return Number.isFinite(n) ? String(n) : String(ShopInfo.Delivery_charge);
    },
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

  useEffect(() => {
    if (isOpen) {
      setEditingField(null);
      setDraftValue('');
      setError('');
      setSuccess('');
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen || !tenant) return null;

  const origin = window.location.origin + window.location.pathname;
  const adminUrl = `${origin}?t=${tenant.slug}_admin`;
  const publicUrl = `${origin}?t=${tenant.slug}`;

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
    if (editingField === 'storewide_discount') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        setError('Storewide discount must be between 0 and 100.');
        return;
      }
    }
    // NOTE: no validation for 'banner_url' - an empty value is valid and
    // means "use the default banner".

    setIsSaving(true);
    setError('');
    try {
      await supabaseService.updateTenantInfo(tenant.slug, editingField, value);

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

          {/* ---- Editable fields ---- */}
          {FIELDS.map((field) => {
            const canEdit = plan.canEditProfileField(field.key);
            if (!canEdit) return null;

            // For the banner, display the tenant's value OR the default
            // so the row always shows *something* when the tenant has none.
            const value =
              field.key === 'banner_url'
                ? tenant.bannerUrl || ShopInfo.Shop_banner || ''
                : field.getValue(tenant);
            const isImage = field.type === 'image';
            const usingDefault = isDefault(field.key);

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
          {plan.canEditProfileField('message_template') && (
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