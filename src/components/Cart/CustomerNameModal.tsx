// components/Cart/CustomerNameModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Button, Input, FormField, Banner } from '../ui';
import {
  getCustomerName,
  setCustomerName as persistCustomerName,
} from '../../utils/customerName';
import local from './CustomerNameModal.module.scss';

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
  const [draft, setDraft] = useState('');
  const [savedName, setSavedName] = useState('');
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
    setIsEditing(
      !hasSaved ||
        (!!initialValue && initialValue.trim() !== stored),
    );
    setError('');
  }, [isOpen, initialValue]);

  // ---- Actions ----
  const handleSubmitEdit = () => {
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
  };

  const handleUseSaved = () => {
    if (!savedName) return;
    onConfirm(savedName);
  };

  const handleChangeName = () => {
    setDraft(savedName);
    setIsEditing(true);
    setError('');
  };

  const handleCancelEdit = () => {
    if (savedName) {
      setDraft(savedName);
      setIsEditing(false);
      setError('');
    } else {
      onCancel();
    }
  };

  const isGreetingMode = !!savedName && !isEditing;

  // ---- Footer variants ----
  const footerContent = isGreetingMode ? (
    <>
      <Button variant="ghost" onClick={handleChangeName}>
        Change Name
      </Button>
      <Button onClick={handleUseSaved}>Continue</Button>
    </>
  ) : savedName ? (
    // Edit mode, came from greeting - allow back-out
    <>
      <Button variant="ghost" onClick={handleCancelEdit}>
        Cancel
      </Button>
      <Button onClick={handleSubmitEdit}>Continue</Button>
    </>
  ) : (
    // First-time user - no saved name
    <>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={handleSubmitEdit}>Continue</Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={isGreetingMode ? 'Welcome back' : 'Your Name'}
      size="sm"
      className={local.confirmModal}
      footer={footerContent}
    >
      {isGreetingMode ? (
        /* ---- Greeting mode ---- */
        <div className={local.body}>
          <p className={local.greeting}>
            Hey <strong>{savedName}</strong>! Let&apos;s proceed.
          </p>
        </div>
      ) : (
        /* ---- Edit mode ---- */
        <div className={local.body}>
          <FormField label={promptText} error={error}>
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError('');
              }}
              placeholder={placeholder}
              maxLength={40}
              autoFocus
              invalid={!!error}
            />
          </FormField>
        </div>
      )}
    </Modal>
  );
};

export default CustomerNameModal;