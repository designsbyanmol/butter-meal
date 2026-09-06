// components/Store/StoreModal.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../contexts/StoreContext';
import { StoreSettings } from '../../types';
import { CloseIcon, CheckIcon } from '../../assets/svgs';
import styles from './Store.module.scss';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StoreModal: React.FC<StoreModalProps> = ({ isOpen, onClose }) => {
  const { storeSettings, updateStoreSettings, setPollingPaused } = useStore();
  
  const [localSettings, setLocalSettings] = useState<StoreSettings>(storeSettings);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPollingPaused(true);
      setLocalSettings({
        ...storeSettings,
      });
    } else {
      setPollingPaused(false);
    }

    return () => {
      setPollingPaused(false);
    };
  }, [isOpen, storeSettings, setPollingPaused]);

  useEffect(() => {
    if (isOpen && !isSaving) {
      setLocalSettings({
        ...storeSettings,
      });
    }
  }, [storeSettings, isOpen, isSaving]);

  if (!isOpen) return null;

  const validateSettings = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    const now = new Date();

    if (!localSettings.isOpen) {
      if (!localSettings.closedMessage || localSettings.closedMessage.trim() === '') {
        newErrors.closedMessage = 'Please enter a message for customers';
      }
      if (!localSettings.expectedOpenDate) {
        newErrors.expectedOpenDate = 'Please select an expected open date';
      }
      if (!localSettings.expectedOpenTime) {
        newErrors.expectedOpenTime = 'Please select an expected open time';
      }
      
      if (localSettings.expectedOpenDate && localSettings.expectedOpenTime) {
        const expectedOpen = new Date(`${localSettings.expectedOpenDate}T${localSettings.expectedOpenTime}`);
        if (expectedOpen <= now) {
          newErrors.expectedOpen = 'Expected open time must be in the future';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateSettings()) {
      setIsSaving(true);
      updateStoreSettings(localSettings);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 300);
    }
  };

  const handleCancel = () => {
    setLocalSettings({
      ...storeSettings,
    });
    setErrors({});
    onClose();
  };

  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
  };

  const minDateTime = getMinDateTime();

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Store Management
            <span className={`${styles.statusValue} ${localSettings.isOpen ? styles.open : styles.closed}`}>
                {localSettings.isOpen ? 'Open' : 'Closed'}
              </span>
            </h2>
          <button className={styles.closeBtn} onClick={handleCancel}>
            <CloseIcon width={20} height={20} fill="#1e1e1e" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.settingGroup}>
            <div className={styles.settingHeader}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={localSettings.isOpen}
                  onChange={(e) => setLocalSettings(prev => ({ 
                    ...prev, 
                    isOpen: e.target.checked,
                    ...(e.target.checked ? {
                      closedMessage: '',
                      expectedOpenDate: '',
                      expectedOpenTime: '',
                    } : {})
                  }))}
                />
                <span className={styles.toggleSlider}></span>
                <span className={styles.toggleText}>
                  {localSettings.isOpen ? 'Store is Open' : 'Store is Closed'}
                </span>
              </label>
            </div>
            <p className={styles.settingDescription}>
              {localSettings.isOpen 
                ? 'Customers can place orders' 
                : 'Customers will see your custom closed message'}
            </p>
          </div>

          {!localSettings.isOpen && (
            <div className={styles.settingGroup}>
              <div className={styles.closedMessageSection}>
                <h4>Closed Store Message</h4>
                
                <div className={styles.messageInput}>
                  <label>Message to Customers</label>
                  <textarea
                    value={localSettings.closedMessage}
                    onChange={(e) => setLocalSettings(prev => ({
                      ...prev,
                      closedMessage: e.target.value
                    }))}
                    placeholder="e.g., We're renovating and will be back soon!"
                    rows={3}
                    className={errors.closedMessage ? styles.error : ''}
                  />
                  {errors.closedMessage && <span className={styles.errorText}>{errors.closedMessage}</span>}
                </div>

                <div className={styles.dateTimeGroup}>
                  <div className={styles.dateTimeInput}>
                    <label>Expected Open Date</label>
                    <input
                      type="date"
                      value={localSettings.expectedOpenDate || ''}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        expectedOpenDate: e.target.value
                      }))}
                      min={minDateTime.date}
                      className={errors.expectedOpenDate ? styles.error : ''}
                    />
                    {errors.expectedOpenDate && <span className={styles.errorText}>{errors.expectedOpenDate}</span>}
                  </div>
                  <div className={styles.dateTimeInput}>
                    <label>Expected Open Time</label>
                    <input
                      type="time"
                      value={localSettings.expectedOpenTime || ''}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        expectedOpenTime: e.target.value
                      }))}
                      min={minDateTime.time}
                      className={errors.expectedOpenTime ? styles.error : ''}
                    />
                    {errors.expectedOpenTime && <span className={styles.errorText}>{errors.expectedOpenTime}</span>}
                  </div>
                </div>
                {errors.expectedOpen && <span className={styles.errorText}>{errors.expectedOpen}</span>}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={handleCancel} disabled={isSaving}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            <CheckIcon width={16} height={16} fill="white" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreModal;