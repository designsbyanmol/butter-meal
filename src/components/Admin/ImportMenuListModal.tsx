// src/components/Admin/ImportMenuListModal.tsx
import React, { useRef, useState } from 'react';
import { Modal, Button, Banner, Badge } from '../ui';
import { menuService } from '../../services/menu.service';
import { MenuItem } from '../../types';
import local from './ImportMenuListModal.module.scss';

interface ImportMenuListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: { added: number; replaced: number }) => void;
}

type Stage = 'pick' | 'review';

interface PendingImport {
  newItems: Omit<MenuItem, 'id'>[];
  existingItems: { imported: Omit<MenuItem, 'id'>; existing: MenuItem }[];
  invalidCount: number;
}

const ImportMenuListModal: React.FC<ImportMenuListModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [stage, setStage] = useState<Stage>('pick');
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [replacements, setReplacements] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('pick');
    setPending(null);
    setReplacements(new Set());
    setIsBusy(false);
    setError('');
  };

  const handleClose = () => {
    if (isBusy) return;
    reset();
    onClose();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBusy(true);
    setError('');
    try {
      const preview = await menuService.previewImport(file);
      if (!preview) {
        setError('That file does not look like an Dozzelo menu export.');
        return;
      }
      setPending(preview);
      setReplacements(
        new Set(preview.existingItems.map((e) => e.existing.name)),
      );
      setStage('review');
    } catch (err) {
      console.error('Import preview failed:', err);
      setError('Could not read that file.');
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleReplace = (name: string) => {
    setReplacements((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCommit = async () => {
    if (!pending) return;
    setIsBusy(true);
    setError('');
    try {
      const replaces = pending.existingItems.filter((e) =>
        replacements.has(e.existing.name),
      );
      const result = await menuService.importItems(
        pending.newItems,
        replaces,
      );
      onComplete(result);
      reset();
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      setError('Import failed. Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  const footer =
    stage === 'pick' ? (
      <Button variant="ghost" onClick={handleClose} disabled={isBusy}>
        Cancel
      </Button>
    ) : (
      <>
        <Button
          variant="ghost"
          onClick={() => setStage('pick')}
          disabled={isBusy}
        >
          Choose a different file
        </Button>
        <Button onClick={handleCommit} loading={isBusy}>
          Import
        </Button>
      </>
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Menu List"
      size="md"
      mobileFullScreen
      footer={footer}
    >
      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}

      {stage === 'pick' && (
        <div className={local.pickBody}>
          <p className={local.lead}>
            Pick a JSON file exported from the same store. Your existing
            menu stays as-is until you confirm.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className={local.hiddenInput}
            disabled={isBusy}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            loading={isBusy}
          >
            Choose file
          </Button>
        </div>
      )}

      {stage === 'review' && pending && (
        <div className={local.reviewBody}>
          <div className={local.summary}>
            <div className={local.summaryItem}>
              <strong>{pending.newItems.length}</strong>
              <span>new items will be added</span>
            </div>
            <div className={local.summaryItem}>
              <strong>{pending.existingItems.length}</strong>
              <span>already exist</span>
            </div>
            {pending.invalidCount > 0 && (
              <div className={local.summaryItem}>
                <strong>{pending.invalidCount}</strong>
                <span>skipped (invalid)</span>
              </div>
            )}
          </div>

          {pending.existingItems.length > 0 && (
            <>
              <p className={local.instructions}>
                These items already exist in your menu. Choose whether to
                replace your copy with the imported one, or keep yours.
              </p>
              <div className={local.existingList}>
                {pending.existingItems.map((e) => {
                  const replacing = replacements.has(e.existing.name);
                  return (
                    <div
                      key={e.existing.id}
                      className={local.existingRow}
                    >
                      <div className={local.existingInfo}>
                        <strong>{e.existing.name}</strong>
                        <span>
                          Your price: Rs{e.existing.price} . Imported: Rs
                          {e.imported.price}
                        </span>
                      </div>
                      <div className={local.existingActions}>
                        <Badge
                          tone={replacing ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {replacing ? 'Replace' : 'Skip'}
                        </Badge>
                        <Button
                          size="sm"
                          variant={replacing ? 'ghost' : 'secondary'}
                          onClick={() => toggleReplace(e.existing.name)}
                          disabled={isBusy}
                        >
                          {replacing ? 'Skip instead' : 'Replace instead'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ImportMenuListModal;