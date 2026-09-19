// components/Cart/CustomerNameModal.tsx
import React, { useEffect, useState } from 'react';
import { CloseIcon } from '../../assets/svgs';
import {
  getCustomerName,
  setCustomerName as persistCustomerName,
} from '../../utils/customerName';
import styles from './CustomerNameModal.module.scss';

interface CustomerNameModalProps {
  isOpen: boolean;
  promptText: string;
  placeholder: string;
  initialValue?: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

const CustomerNameModal: React.FC<CustomerNameModalProps> = ({
  isOpen,
  promptText,
  placeholder,
  initialValue,
  onCancel,
  onConfirm,
}) => {
  // Currently-typed value in the input (edit mode)
  const [draft, setDraft] = useState('');
  // The name persisted from a previous order (read on open)
  const [savedName, setSavedName] = useState('');
  // Whether the input is visible right now
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  // On open: load saved name + reset state
  useEffect(() => {
    if (!isOpen) return;

    const stored = getCustomerName();
    const hasSaved = stored.length > 0;
    const initial = (initialValue ?? stored).trim();

    setSavedName(hasSaved ? stored : '');
    setDraft(initial);
    // If we have a saved name and no explicit initial override,
    // open in "greeting" mode (input hidden). Otherwise show the input.
    setIsEditing(!hasSaved || (!!initialValue && initialValue.trim() !== stored));
    setError('');
  }, [isOpen, initialValue]);

  // Esc: close  /  Enter: submit
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') {
        if (isEditing) handleSubmitEdit();
        else if (savedName) handleUseSaved();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isEditing, draft, savedName]);

  if (!isOpen) return null;

  // ---------- Actions ----------

  /** First-time submission OR after clicking "Change Name" > Continue */
  function handleSubmitEdit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Please enter your name');
      return;
    }
    if (trimmed.length > 40) {
      setError('Name is too long (max 40 characters)');
      return;
    }
    persistCustomerName(trimmed);
    onConfirm(trimmed);
  }

  /** Reuse the saved name (Continue button in greeting mode) */
  function handleUseSaved() {
    if (!savedName) return;
    onConfirm(savedName);
  }

  /** Enter edit mode from greeting mode */
  function handleChangeName() {
    setDraft(savedName);
    setIsEditing(true);
    setError('');
  }

  /** Cancel edit - go back to greeting mode if a name exists */
  function handleCancelEdit() {
    if (savedName) {
      setDraft(savedName);
      setIsEditing(false);
      setError('');
    } else {
      onCancel();
    }
  }

  // ---------- Render ----------

  const isGreetingMode = !!savedName && !isEditing;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{isGreetingMode ? 'Welcome back' : 'Your Name'}</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label="Close"
          >
            <CloseIcon width={18} height={18} fill="#4d4d4d" />
          </button>
        </div>

        {isGreetingMode ? (
          /* ============ GREETING MODE ============ */
          <div className={styles.body}>
            <p className={styles.greeting}>
              Hey <strong>{savedName}</strong>! Let&apos;s proceed.
            </p>
          </div>
        ) : (
          /* ============ EDIT MODE ============ */
          <div className={styles.body}>
            <p className={styles.prompt}>{promptText}</p>
            <input
              type="text"
              className={styles.input}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError('');
              }}
              placeholder={placeholder}
              maxLength={40}
              autoFocus
            />
            {error && <div className={styles.error}>{error}</div>}
          </div>
        )}

        {/* ---------- Footer ---------- */}
        <div className={styles.footer}>
          {isGreetingMode ? (
            <>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleChangeName}
              >
                Change Name
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={handleUseSaved}
              >
                Continue
              </button>
            </>
          ) : savedName ? (
            /* Edit mode + we came from a greeting - offer back-out */
            <>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={handleSubmitEdit}
              >
                Continue
              </button>
            </>
          ) : (
            /* First-time user - no saved name */
            <>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={handleSubmitEdit}
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerNameModal;