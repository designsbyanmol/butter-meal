// src/components/Store/StoreModalBody.tsx
import React, { useEffect, useState } from "react";
import { useStore } from "../../contexts/StoreContext";
import { StoreSettings } from "../../types";
import {
  Toggle,
  FormField,
  Input,
  Textarea,
  Banner,
  Button,
  useToast,
} from "../ui";
import { InlineSection } from "../Dashboard/inline";
import local from "./Store.module.scss";

interface StoreModalBodyProps {
  onClose?: () => void;
}

interface FieldErrors {
  closedMessage?: string;
  expectedOpenDate?: string;
  expectedOpenTime?: string;
  expectedOpen?: string;
}

const StoreModalBody: React.FC<StoreModalBodyProps> = ({
  onClose: _onClose,
}) => {
  const { storeSettings, updateStoreSettings, isLoading } = useStore();
  const { push } = useToast();

  // Local editable copy. Synced with the context whenever it changes.
  const [localSettings, setLocalSettings] =
    useState<StoreSettings>(storeSettings);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync local state when the context's values change.
  useEffect(() => {
    setLocalSettings(storeSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    storeSettings.isOpen,
    storeSettings.acceptingOrders,
    storeSettings.closedMessage,
    storeSettings.expectedOpenDate,
    storeSettings.expectedOpenTime,
    storeSettings.lastUpdated,
  ]);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    const now = new Date();

    if (!localSettings.isOpen) {
      if (!localSettings.closedMessage?.trim()) {
        next.closedMessage = "Please enter a message for customers";
      }
      if (!localSettings.expectedOpenDate) {
        next.expectedOpenDate = "Please select an expected open date";
      }
      if (!localSettings.expectedOpenTime) {
        next.expectedOpenTime = "Please select an expected open time";
      }
      if (localSettings.expectedOpenDate && localSettings.expectedOpenTime) {
        const expected = new Date(
          `${localSettings.expectedOpenDate}T${localSettings.expectedOpenTime}`,
        );
        if (expected <= now) {
          next.expectedOpen = "Expected open time must be in the future";
        }
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await updateStoreSettings(localSettings);
      push({
        title: "Settings saved!",
        message: "Store updated Successfully.",
        tone: "success",
      });
    } catch (err) {
      console.error("[StoreModalBody] save failed:", err);
      push({
        title: "Save failed",
        message:
          err instanceof Error
            ? err.message
            : "Could not update store settings.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalSettings({ ...storeSettings });
    setErrors({});
  };

  const getMinDateTime = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate(),
      )}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
  };

  const min = getMinDateTime();

  if (isLoading) {
    return (
      <InlineSection title="Store Management">
        <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
          Loading store settings...
        </div>
      </InlineSection>
    );
  }

  return (
    <InlineSection title="Store Management">
      {/* ---- Open / closed ---- */}
      <section className={local.settingGroup}>
        <Toggle
          checked={localSettings.isOpen}
          onChange={(e) =>
            setLocalSettings((prev) => ({
              ...prev,
              isOpen: e.target.checked,
              ...(e.target.checked
                ? {
                    closedMessage: "",
                    expectedOpenDate: "",
                    expectedOpenTime: "",
                  }
                : {}),
            }))
          }
          label={localSettings.isOpen ? "Store is Open" : "Store is Closed"}
        />
        <p className={local.settingDescription}>
          {localSettings.isOpen
            ? "Customers can place orders as Store is open"
            : "Customers will see your custom closed message"}
        </p>
      </section>

      {/* ---- Accepting orders ---- */}
      <section className={local.settingGroup}>
        <Toggle
          checked={localSettings.acceptingOrders !== false}
          onChange={(e) =>
            setLocalSettings((prev) => ({
              ...prev,
              acceptingOrders: e.target.checked,
            }))
          }
          label={
            localSettings.acceptingOrders !== false
              ? "Ordering Enabled"
              : "Ordering Disabled"
          }
        />
        <p className={local.settingDescription}>
          {localSettings.acceptingOrders !== false
            ? "Customers can add items to the cart and place orders."
            : "Customers can view the menu but cannot place orders. The Add button and cart are hidden."}
        </p>
      </section>

      {/* ---- Closed-store message ---- */}
      {!localSettings.isOpen && (
        <div className={local.closedSection}>
          <h4>Closed Store Message</h4>

          <FormField label="Message to Customers" error={errors.closedMessage}>
            <Textarea
              value={localSettings.closedMessage}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  closedMessage: e.target.value,
                }))
              }
              placeholder="e.g., We're renovating and will be back soon!"
              invalid={!!errors.closedMessage}
              rows={3}
            />
          </FormField>

          <div className={local.dateTimeRow}>
            <FormField
              label="Expected Open Date"
              error={errors.expectedOpenDate}
            >
              <Input
                type="date"
                value={localSettings.expectedOpenDate || ""}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    expectedOpenDate: e.target.value,
                  }))
                }
                min={min.date}
                invalid={!!errors.expectedOpenDate}
              />
            </FormField>

            <FormField
              label="Expected Open Time"
              error={errors.expectedOpenTime}
            >
              <Input
                type="time"
                value={localSettings.expectedOpenTime || ""}
                onChange={(e) =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    expectedOpenTime: e.target.value,
                  }))
                }
                min={min.time}
                invalid={!!errors.expectedOpenTime}
              />
            </FormField>
          </div>

          {errors.expectedOpen && (
            <Banner variant="warning" inline>
              {errors.expectedOpen}
            </Banner>
          )}
        </div>
      )}

      {/* ---- Actions ---- */}
      <div className={local.bodyActions}>
        <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
          Reset
        </Button>
        <Button onClick={handleSave} loading={isSaving}>
          Save Settings
        </Button>
      </div>
    </InlineSection>
  );
};

export default StoreModalBody;