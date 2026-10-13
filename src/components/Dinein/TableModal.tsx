// src/components/Dinein/TableModal.tsx
import React, { useState } from 'react';
import { Modal, Button, Input, FormField, Banner } from '../ui';
import local from './TableModal.module.scss';

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** May be async; TableModal shows a spinner until it settles. */
  onConfirm: (
    label: string,
    kind: 'number' | 'name',
  ) => void | Promise<void>;
}

const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<'number' | 'name'>('number');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const v = value.trim();
    if (!v) {
      setError(
        mode === 'number'
          ? 'Enter your table number.'
          : 'Enter a group name.',
      );
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onConfirm(v, mode);
      // If we're still mounted, onConfirm didn't close us. Clear busy
      // so the user can retry if something went wrong.
      setBusy(false);
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof Error ? err.message : 'Could not reach the store.',
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title="Place Order"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            {busy ? 'Loading...' : 'Order Now'}
          </Button>
        </>
      }
    >
      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}

      {mode === 'number' ? (
        <FormField label="Enter Table No.">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, '').slice(0, 3));
              setError('');
            }}
            inputMode="numeric"
            autoFocus
            disabled={busy}
          />
        </FormField>
      ) : (
        <FormField label="Enter any common word of your friend circle">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value.slice(0, 24));
              setError('');
            }}
            autoFocus
            disabled={busy}
          />
        </FormField>
      )}

      <button
        type="button"
        className={local.switchLink}
        disabled={busy}
        onClick={() => {
          setMode((m) => (m === 'number' ? 'name' : 'number'));
          setValue('');
          setError('');
        }}
      >
        {mode === 'number'
          ? 'No table number?'
          : 'Have a table number instead?'}
      </button>
    </Modal>
  );
};

export default TableModal;