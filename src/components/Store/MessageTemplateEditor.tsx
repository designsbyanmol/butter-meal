// components/Store/MessageTemplateEditor.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import { Modal, Button, FormField, Input, Checkbox, Banner } from '../ui';
import { MessageTemplate, DEFAULT_MESSAGE_TEMPLATE } from '../../types';
import local from './MessageTemplateEditor.module.scss';

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

    const header = draft.orderLabel.replace('{customerName}', customerName);

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

      if (
        draft.showItemCustomizations &&
        Object.keys(item.customizations).length > 0
      ) {
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

  // -------- Footer --------
  const footerContent = (
    <>
      <Button
        variant="ghost"
        onClick={handleReset}
        disabled={isSaving}
        style={{ marginRight: 'auto' }}
      >
        Reset to default
      </Button>
      <Button variant="ghost" onClick={onClose} disabled={isSaving}>
        Cancel
      </Button>
      <Button onClick={handleSave} loading={isSaving}>
        Save template
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WhatsApp Message Template"
      size="xl"
      footer={footerContent}
    >
      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}
      {success && <Banner variant="success">{success}</Banner>}

      <div className={local.layout}>
        {/* ---------- Editor column ---------- */}
        <div className={local.editorCol}>
          {/* Header */}
          <section className={local.group}>
            <h3>Header</h3>
            <FormField
              label="Order label"
              hint={<>Use {'{customerName}'} where the name should go.</>}
            >
              <Input
                value={draft.orderLabel}
                onChange={(e) => update('orderLabel', e.target.value)}
                placeholder="New Order From {customerName}"
              />
            </FormField>
            <FormField label="Name prompt (shown to the customer)">
              <Input
                value={draft.namePrompt}
                onChange={(e) => update('namePrompt', e.target.value)}
              />
            </FormField>
            <FormField label="Name placeholder">
              <Input
                value={draft.namePromptPlaceholder}
                onChange={(e) =>
                  update('namePromptPlaceholder', e.target.value)
                }
              />
            </FormField>
          </section>

          {/* Item list */}
          <section className={local.group}>
            <h3>Item List</h3>
            <FormField label="Section title">
              <Input
                value={draft.itemListTitle}
                onChange={(e) => update('itemListTitle', e.target.value)}
              />
            </FormField>
            <FormField
              label="Item line template"
              hint={
                <>
                  Tokens: {'{name}'}, {'{qty}'}
                </>
              }
            >
              <Input
                value={draft.itemLineTemplate}
                onChange={(e) => update('itemLineTemplate', e.target.value)}
              />
            </FormField>

            <div className={local.checkboxGrid}>
              <Checkbox
                checked={draft.showItemDiscount}
                onChange={(e) =>
                  update('showItemDiscount', e.target.checked)
                }
                label="Show item discount"
              />
              <Checkbox
                checked={draft.showItemAddons}
                onChange={(e) => update('showItemAddons', e.target.checked)}
                label="Show add-ons"
              />
              <Checkbox
                checked={draft.showItemCustomizations}
                onChange={(e) =>
                  update('showItemCustomizations', e.target.checked)
                }
                label="Show customizations"
              />
              <Checkbox
                checked={draft.showItemNotes}
                onChange={(e) => update('showItemNotes', e.target.checked)}
                label="Show special instructions"
              />
            </div>
          </section>

          {/* Pricing */}
          <section className={local.group}>
            <h3>Pricing labels</h3>
            <FormField label="Subtotal label">
              <Input
                value={draft.subtotalLabel}
                onChange={(e) => update('subtotalLabel', e.target.value)}
              />
            </FormField>
            <FormField label="Delivery label">
              <Input
                value={draft.deliveryLabel}
                onChange={(e) => update('deliveryLabel', e.target.value)}
              />
            </FormField>
            <FormField label="Discount label">
              <Input
                value={draft.discountLabel}
                onChange={(e) => update('discountLabel', e.target.value)}
              />
            </FormField>
            <FormField label="Total label">
              <Input
                value={draft.totalLabel}
                onChange={(e) => update('totalLabel', e.target.value)}
              />
            </FormField>
            <FormField
              label="Free-delivery note"
              hint={<>Use {'{fee}'} for the delivery charge.</>}
            >
              <Input
                value={draft.freeDeliveryLabel}
                onChange={(e) =>
                  update('freeDeliveryLabel', e.target.value)
                }
              />
            </FormField>
          </section>

          {/* Footer */}
          <section className={local.group}>
            <h3>Footer</h3>
            <FormField label="Footer note 1">
              <Input
                value={draft.footerNote1}
                onChange={(e) => update('footerNote1', e.target.value)}
              />
            </FormField>
            <FormField label="Footer note 2">
              <Input
                value={draft.footerNote2}
                onChange={(e) => update('footerNote2', e.target.value)}
              />
            </FormField>
            <FormField label="Signature">
              <Input
                value={draft.footerSignature}
                onChange={(e) => update('footerSignature', e.target.value)}
              />
            </FormField>
          </section>
        </div>

        {/* ---------- Preview column ---------- */}
        <div className={local.previewCol}>
          <div className={local.previewHeader}>Live Preview</div>
          <pre className={local.previewBox}>{previewText}</pre>
        </div>
      </div>
    </Modal>
  );
};

export default MessageTemplateEditor;