// src/components/Cart/CustomerNameModal.tsx
import React, { useEffect, useState } from "react";
import { Modal, Button, Input, FormField } from "../ui";
import local from "./CustomerNameModal.module.scss";

interface CustomerNameModalProps {
  isOpen: boolean;
  promptText?: string;
  placeholder?: string;
  initialValue?: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

const CustomerNameModal: React.FC<CustomerNameModalProps> = ({
  isOpen,
  promptText = "Please enter your name",
  placeholder = "e.g., Anmol",
  initialValue = "",
  onCancel,
  onConfirm,
}) => {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(initialValue);
      setError("");
    }
  }, [isOpen, initialValue]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    if (trimmed.length < 2) {
      setError("Please enter at least 2 characters");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Your Name"
      size="sm"
      disableBackdropClose={true}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Continue</Button>
        </>
      }
    >
      <FormField label={promptText} error={error}>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder={placeholder}
          autoFocus
          invalid={!!error}
          maxLength={60}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
      </FormField>
      <p className={local.hint}>
        We use this only to personalise your order message.
      </p>
    </Modal>
  );
};

export default CustomerNameModal;