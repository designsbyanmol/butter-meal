// components/Store/MessageTemplateEditor.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import { CloseIcon } from '../../assets/svgs';
import {
  MessageTemplate,
  DEFAULT_MESSAGE_TEMPLATE,
} from '../../types';
import styles from './MessageTemplateEditor.module.scss';

interface MessageTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessageTemplateEditor: React.FC<MessageTemplateEditorProps> = ({
  isOpen,
  onClose,
}) => {
  const { tenant, refreshTenant } = useTenant();

  const [draft, setDraft] = useState<MessageTemplate>(
    tenant?.messageTemplate ?? DEFAULT_MESSAGE_TEMPLATE,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync on open
  useEffect(() => {
    if (isOpen) {
      setDraft(tenant?.messageTemplate ?? DEFAULT_MESSAGE_TEMPLATE);
      setError('');
      setSuccess('');
    }
  }, [isOpen, tenant?.messageTemplate]);

  // Esc closes
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  const update = <K extends keyof MessageTemplate>(
    key: K,
    value: MessageTemplate[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  // ---- Live preview using a mock cart ----
  const previewText = useMemo(() => {
    const brandName = tenant?.displayName ?? 'Your Store';
    const tagline = tenant?.storeTagline ?? '';
    const customerName = 'Anmol';

    const header = draft.orderLabel.replace(
      '{customerName}',
      customerName,
    );

    const sampleItems = [
      {
        name: 'Veg Biryani',
        qty: 2,
        price: 180,
        discount: 10,
        addons: 20,
        customizations: { Spice: 'Medium' },
        note: 'Extra raita please',
      },
      {
        name: 'Butter Naan',
        qty: 4,
        price: 40,
        discount: 0,
        addons: 0,
        customizations: {},
        note: '',
      },
    ];

    let msg = `*${header}*\n`;
    msg += `-----------------\n`;
    msg += `*${brandName}*\n`;
    if (tagline) msg += `_${tagline}_\n`;
    msg += `-----------------\n`;
    msg += `*${draft.itemListTitle}*\n`;

    sampleItems.forEach((item) => {
      const unitBase = item.price;
      const unitAfterDiscount =
        item.discount > 0
          ? Math.round(unitBase * (1 - item.discount / 100))
          : unitBase;
      const perUnit = unitAfterDiscount + item.addons;
      const total = perUnit * item.qty;

      let line = draft.itemLineTemplate
        .replace('{name}', item.name)
        .replace('{qty}', String(item.qty));

      if (draft.showItemCustomizations && Object.keys(item.customizations).length > 0) {
        const cs = Object.entries(item.customizations)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        line += ` (${cs})`;
      }
      if (draft.showItemAddons && item.addons > 0) {
        line += ` [+Rs${item.addons} add-ons]`;
      }
      if (draft.showItemDiscount && item.discount > 0) {
        line += ` [${item.discount}% off]`;
      }
      line += ` - Rs ${total}`;
      msg += `- - - - - - -\n${line}\n`;
      if (draft.showItemNotes && item.note) {
        msg += `   Note: ${item.note}\n`;
      }
    });

    msg += `-----------------\n`;
    msg += `${draft.subtotalLabel} - Rs 520\n`;
    msg += `${draft.deliveryLabel} - Rs 20\n`;
    msg += `${draft.discountLabel} (10%) - Rs 54\n`;
    msg += `-----------------\n`;
    msg += `*${draft.totalLabel} - Rs 486*\n`;
    msg += `${draft.freeDeliveryLabel.replace('{fee}', '20')}\n`;
    msg += `\n-----------------\n`;
    msg += `_${draft.footerNote1}_\n`;
    msg += `_${draft.footerNote2}_\n`;
    msg += `_${draft.footerSignature}_`;

    return msg;
  }, [draft, tenant?.displayName, tenant?.storeTagline]);

  const handleSave = async () => {
    if (!tenant) return;
    setIsSaving(true);
    setError('');
    try {
      await supabaseService.updateTenantMessageTemplate(tenant.slug, draft);
      await refreshTenant();
      setSuccess('Template saved');
      setTimeout(() => onClose(), 700);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (
      !window.confirm(
        'Reset the message template to the default? Your custom text will be lost.',
      )
    )
      return;
    setDraft(DEFAULT_MESSAGE_TEMPLATE);
    setError('');
    setSuccess('');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>WhatsApp Message Template</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon width={18} height={18} fill="#4d4d4d" />
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}
        {success && (
          <div className={styles.successMessage}>{success}</div>
        )}

        <div className={styles.body}>
          {/* -------- Editor column -------- */}
          <div className={styles.editorCol}>
            {/* Header */}
            <section className={styles.group}>
              <h3>Header</h3>
              <label className={styles.field}>
                <span>Order label</span>
                <input
                  type="text"
                  value={draft.orderLabel}
                  onChange={(e) => update('orderLabel', e.target.value)}
                  placeholder="New Order From {customerName}"
                />
                <small>
                  Use <code>{'{customerName}'}</code> where the name should go.
                </small>
              </label>
              <label className={styles.field}>
                <span>Name prompt (shown to the customer)</span>
                <input
                  type="text"
                  value={draft.namePrompt}
                  onChange={(e) => update('namePrompt', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Name placeholder</span>
                <input
                  type="text"
                  value={draft.namePromptPlaceholder}
                  onChange={(e) =>
                    update('namePromptPlaceholder', e.target.value)
                  }
                />
              </label>
            </section>

            {/* Item list */}
            <section className={styles.group}>
              <h3>Item List</h3>
              <label className={styles.field}>
                <span>Section title</span>
                <input
                  type="text"
                  value={draft.itemListTitle}
                  onChange={(e) => update('itemListTitle', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Item line template</span>
                <input
                  type="text"
                  value={draft.itemLineTemplate}
                  onChange={(e) =>
                    update('itemLineTemplate', e.target.value)
                  }
                />
                <small>
                  Tokens: <code>{'{name}'}</code>, <code>{'{qty}'}</code>
                </small>
              </label>
              <div className={styles.checkboxGrid}>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.showItemDiscount}
                    onChange={(e) =>
                      update('showItemDiscount', e.target.checked)
                    }
                  />
                  Show item discount
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.showItemAddons}
                    onChange={(e) =>
                      update('showItemAddons', e.target.checked)
                    }
                  />
                  Show add-ons
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.showItemCustomizations}
                    onChange={(e) =>
                      update('showItemCustomizations', e.target.checked)
                    }
                  />
                  Show customizations
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.showItemNotes}
                    onChange={(e) => update('showItemNotes', e.target.checked)}
                  />
                  Show special instructions
                </label>
              </div>
            </section>

            {/* Pricing */}
            <section className={styles.group}>
              <h3>Pricing labels</h3>
              <label className={styles.field}>
                <span>Subtotal label</span>
                <input
                  type="text"
                  value={draft.subtotalLabel}
                  onChange={(e) => update('subtotalLabel', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Delivery label</span>
                <input
                  type="text"
                  value={draft.deliveryLabel}
                  onChange={(e) => update('deliveryLabel', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Discount label</span>
                <input
                  type="text"
                  value={draft.discountLabel}
                  onChange={(e) => update('discountLabel', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Total label</span>
                <input
                  type="text"
                  value={draft.totalLabel}
                  onChange={(e) => update('totalLabel', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Free-delivery note</span>
                <input
                  type="text"
                  value={draft.freeDeliveryLabel}
                  onChange={(e) =>
                    update('freeDeliveryLabel', e.target.value)
                  }
                />
                <small>
                  Use <code>{'{fee}'}</code> for the delivery charge.
                </small>
              </label>
            </section>

            {/* Footer */}
            <section className={styles.group}>
              <h3>Footer</h3>
              <label className={styles.field}>
                <span>Footer note 1</span>
                <input
                  type="text"
                  value={draft.footerNote1}
                  onChange={(e) => update('footerNote1', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Footer note 2</span>
                <input
                  type="text"
                  value={draft.footerNote2}
                  onChange={(e) => update('footerNote2', e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Signature</span>
                <input
                  type="text"
                  value={draft.footerSignature}
                  onChange={(e) => update('footerSignature', e.target.value)}
                />
              </label>
            </section>
          </div>

          {/* -------- Preview column -------- */}
          <div className={styles.previewCol}>
            <div className={styles.previewHeader}>Live Preview</div>
            <pre className={styles.previewBox}>{previewText}</pre>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset to default
          </button>
          <div className={styles.footerRight}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageTemplateEditor;