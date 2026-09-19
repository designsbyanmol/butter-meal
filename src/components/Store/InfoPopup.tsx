// components/Store/InfoPopup.tsx
import React, { useEffect, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import { CloseIcon, CopyIcon } from '../../assets/svgs';
import EditIcon from '../../assets/svgs/EditIcon';
import ImageUpload from '../Admin/ImageUpload';
import MessageTemplateEditor from './MessageTemplateEditor';
import PlanChangeModal from '../Payments/PlanChangeModal';
import { ShopInfo } from '../../config/credentials';
import { usePlan } from '../../hooks/usePlan';
import styles from './InfoPopup.module.scss';

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
    getValue: (t) => t?.bannerUrl || ShopInfo.Shop_banner || '',
    hint: 'Shown at the top of the menu page. Recommended 1200x630px.',
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
      return Number.isFinite(n)
        ? String(n)
        : String(ShopInfo.Delivery_charge);
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isTemplateEditorOpen || isPlanChangeOpen) return;
      if (editingField) setEditingField(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, editingField, isTemplateEditorOpen, isPlanChangeOpen, onClose]);

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

  const saveEdit = async (overrideValue?: string) => {
    if (!editingField) return;
    const value = (overrideValue ?? draftValue).trim();

    if (editingField === 'display_name' && !value) {
      setError('Store name cannot be empty.');
      return;
    }
    if (
      (editingField === 'owner_phone' ||
        editingField === 'whatsapp_phone') &&
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

    setIsSaving(true);
    try {
      await supabaseService.updateTenantInfo(
        tenant.slug,
        editingField,
        value,
      );
      await refreshTenant();
      setSuccess('Saved');
      setTimeout(() => {
        setEditingField(null);
        setDraftValue('');
        setSuccess('');
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const activeFieldDef = FIELDS.find((f) => f.key === editingField) || null;

  const planStatus = tenant.subscriptionStatus ?? 'active';
  const planExpires = tenant.subscriptionExpiresAt
    ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <h2>Informations</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon width={18} height={18} fill="#4d4d4d" />
          </button>
        </div>

        <div className={styles.body}>
          {/* ---- Plan row ---- */}
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <div className={styles.labelRow}>
                <span className={styles.label}>Plan</span>
                <span className={styles.defaultPill}>
                  {tenant.planName ?? 'Professional'} .{' '}
                  {planStatus.toUpperCase()}
                </span>
              </div>
              <div className={styles.value}>Expires on {planExpires}</div>
            </div>
            <button
              className={styles.editBtn}
              onClick={() => setIsPlanChangeOpen(true)}
              title="Change plan"
            >
              <EditIcon width={16} height={16} fill="#1e7e34" />
            </button>
          </div>

          {/* ---- URLs ---- */}
          <div className={styles.row}>
            <div className={styles.rowMain}>
              <div className={styles.labelRow}>
                <span className={styles.label}>Public Store URL</span>
              </div>
              <div className={styles.value}>{publicUrl}</div>
            </div>
            <button
              className={styles.editBtn}
              onClick={() => copyToClipboard(publicUrl)}
              title="Copy public URL"
            >
              <CopyIcon width={16} height={16} fill="#4d4d4d" />
            </button>
          </div>

          <div className={styles.row}>
            <div className={styles.rowMain}>
              <div className={styles.labelRow}>
                <span className={styles.label}>Admin Store URL</span>
              </div>
              <div className={styles.value}>{adminUrl}</div>
            </div>
            <button
              className={styles.editBtn}
              onClick={() => copyToClipboard(adminUrl)}
              title="Copy admin URL"
            >
              <CopyIcon width={16} height={16} fill="#4d4d4d" />
            </button>
          </div>

          {/* ---- Editable fields (hidden entirely when the plan doesn't allow) ---- */}
          {FIELDS.map((field) => {
            const canEdit = plan.canEditProfileField(field.key);
            if (!canEdit) return null;

            const value = field.getValue(tenant);
            const isImage = field.type === 'image';
            const usingDefault = isDefault(field.key);

            return (
              <div key={field.key} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.labelRow}>
                    <span className={styles.label}>{field.label}</span>
                    {usingDefault && (
                      <span className={styles.defaultPill}>
                        Using default
                      </span>
                    )}
                  </div>

                  {isImage ? (
                    value ? (
                      <img
                        src={value}
                        alt={field.label}
                        className={styles.previewImg}
                      />
                    ) : (
                      <div className={styles.emptyPreview}>
                        No banner uploaded
                      </div>
                    )
                  ) : (
                    <div className={styles.value}>
                      {value || (
                        <span className={styles.empty}>- Not set -</span>
                      )}
                    </div>
                  )}

                  {field.hint && (
                    <div className={styles.hint}>{field.hint}</div>
                  )}
                </div>

                <button
                  className={styles.editBtn}
                  onClick={() => openEditor(field)}
                  title={`Edit ${field.label}`}
                >
                  <EditIcon width={16} height={16} fill="#1e7e34" />
                </button>
              </div>
            );
          })}

          {/* ---- Message template row (hidden when the plan doesn't allow) ---- */}
          {plan.canEditProfileField('message_template') && (
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.labelRow}>
                  <span className={styles.label}>
                    WhatsApp Message Template
                  </span>
                </div>
                <div className={styles.value}>
                  Customize the exact text customers send to your WhatsApp.
                </div>
              </div>
              <button
                className={styles.editBtn}
                onClick={() => setIsTemplateEditorOpen(true)}
                title="Edit template"
              >
                <EditIcon width={16} height={16} fill="#1e7e34" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor modal */}
      {activeFieldDef && (
        <div
          className={styles.editorOverlay}
          onClick={(e) => {
            e.stopPropagation();
            closeEditor();
          }}
        >
          <div
            className={styles.editorDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.editorHeader}>
              <h3>Edit {activeFieldDef.label}</h3>
              <button
                className={styles.closeBtn}
                onClick={closeEditor}
              >
                <CloseIcon width={18} height={18} fill="#4d4d4d" />
              </button>
            </div>

            <div className={styles.editorBody}>
              {activeFieldDef.type === 'image' ? (
                <ImageUpload
                  currentImage={draftValue}
                  onImageUploaded={(url) => {
                    setDraftValue(url);
                    saveEdit(url);
                  }}
                  label="Upload Banner"
                />
              ) : (
                <div className={styles.editorField}>
                  <label>{activeFieldDef.label}</label>
                  <input
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
                  />
                  {activeFieldDef.hint && (
                    <small className={styles.fieldHint}>
                      {activeFieldDef.hint}
                    </small>
                  )}
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.successMsg}>{success}</div>}
            </div>

            {activeFieldDef.type !== 'image' && (
              <div className={styles.editorFooter}>
                <button
                  className={styles.cancelBtn}
                  onClick={closeEditor}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  className={styles.saveBtn}
                  onClick={() => saveEdit()}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
};

export default InfoPopup;