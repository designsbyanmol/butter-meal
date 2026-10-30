// components/Store/MessageTemplateEditor.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import { Modal, Button, FormField, Input, Banner } from '../ui';
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

  // ---- Live preview ----
  const previewText = useMemo(() => {
    const brandName = tenant?.displayName ?? 'Your Store';
    const amount = 'Rs 480'; // sample amount

    let msg = `*${brandName}*\n`;
    msg += `-----------------\n`;
    msg += `*${draft.orderLabel}*\n`;
    msg += `*${draft.totalLabel}:* ${amount}\n`;
    msg += `-----------------\n`;

    const steps = [
      draft.footerNote1,
      draft.footerNote2,
      draft.footerSignature,
    ]
      .map((s) => (s || '').trim())
      .filter(Boolean);

    if (steps.length > 0) {
      msg += `*${draft.itemListTitle}*\n`;
      steps.forEach((step, i) => {
        msg += `${i + 1}. ${step}\n`;
      });
    }

    return msg;
  }, [
    draft,
    tenant?.displayName,
  ]);

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
      setError(err instanceof Error ? err.message : 'Failed to save');
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
      mobileFullScreen
      size="xl"
      disableBackdropClose={true}
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
          <section className={local.group}>
            <h3>Message header</h3>
            <FormField
              label="Order label"
              hint="Shown as the bold line at the top of the message."
            >
              <Input
                value={draft.orderLabel}
                onChange={(e) => update('orderLabel', e.target.value)}
                placeholder="New Order"
              />
            </FormField>
            <FormField
              label="Amount label"
              hint="Prefixed to the total amount the customer should pay."
            >
              <Input
                value={draft.totalLabel}
                onChange={(e) => update('totalLabel', e.target.value)}
                placeholder="Amount to pay"
              />
            </FormField>
          </section>

          <section className={local.group}>
            <h3>Instructions</h3>
            <FormField
              label="Instructions heading"
              hint="The line shown above the numbered steps."
            >
              <Input
                value={draft.itemListTitle}
                onChange={(e) => update('itemListTitle', e.target.value)}
                placeholder="Please do the following"
              />
            </FormField>

            <FormField
              label="Step 1"
              hint="e.g. Attach the bill PDF you just downloaded."
            >
              <Input
                value={draft.footerNote1}
                onChange={(e) => update('footerNote1', e.target.value)}
              />
            </FormField>
            <FormField
              label="Step 2"
              hint="e.g. Pay the amount via the UPI shown on the bill."
            >
              <Input
                value={draft.footerNote2}
                onChange={(e) => update('footerNote2', e.target.value)}
              />
            </FormField>
            <FormField
              label="Step 3"
              hint="e.g. Share your current location for delivery."
            >
              <Input
                value={draft.footerSignature}
                onChange={(e) => update('footerSignature', e.target.value)}
              />
            </FormField>
          </section>

          <section className={local.group}>
            <h3>Customer name prompt</h3>
            <FormField label="Prompt text (shown to the customer)">
              <Input
                value={draft.namePrompt}
                onChange={(e) => update('namePrompt', e.target.value)}
              />
            </FormField>
            <FormField label="Placeholder">
              <Input
                value={draft.namePromptPlaceholder}
                onChange={(e) =>
                  update('namePromptPlaceholder', e.target.value)
                }
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