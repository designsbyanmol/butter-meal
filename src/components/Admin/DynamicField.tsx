// components/Admin/DynamicField.tsx
import React, { useEffect } from 'react';
import { FormFieldConfig } from '../../types';
import ImageUpload from './ImageUpload';
import styles from './DynamicField.module.scss';

interface DynamicFieldProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  invalid?: boolean;
  onImageUploaded?: (url: string) => void;
  ingredientsInput?: string;
  onIngredientsInputChange?: (value: string) => void;
}

const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  value,
  onChange,
  invalid,
  onImageUploaded,
  ingredientsInput,
  onIngredientsInputChange,
}) => {
  const errorClass = invalid ? styles.inputError : '';

  // ---------- Category: drop stale values ----------
  const selectOptions = field.options ?? [];
  const currentValue = typeof value === 'string' ? value : '';

  useEffect(() => {
    if (field.key !== 'category') return;
    if (!currentValue) return;
    if (selectOptions.includes(currentValue)) return;
    onChange('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.key, currentValue, selectOptions]);

  if (field.key === 'img' && onImageUploaded) {
    return (
      <div className={styles.formGroup}>
        <label>
          {field.label}
          {field.builtin && field.key === 'img' ? ' *' : ''}
        </label>
        <div className={invalid ? styles.imageUploadError : ''}>
          <ImageUpload
            currentImage={typeof value === 'string' ? value : ''}
            onImageUploaded={onImageUploaded}
            label="Upload Item Image"
          />
        </div>
      </div>
    );
  }

  if (field.key === 'ingredients' && onIngredientsInputChange) {
    return (
      <div className={styles.formGroup}>
        <label>{field.label} (comma separated)</label>
        <input
          type="text"
          value={ingredientsInput ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onIngredientsInputChange(v);
            const arr = v
              ? v.split(',').map((s) => s.trim()).filter(Boolean)
              : [];
            onChange(arr);
          }}
          placeholder="Chicken, Cream, Spices"
        />
      </div>
    );
  }

  switch (field.type) {
    case 'select':
      return (
        <div className={styles.formGroup}>
          <label>{field.label}</label>
          <select
            value={currentValue}
            onChange={(e) => onChange(e.target.value)}
            className={`${styles.defaultSelect} ${errorClass}`}
          >
            <option value="">— Select —</option>
            {selectOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {field.key === 'category' && selectOptions.length === 0 && (
            <small className={styles.fieldHint}>
              No categories yet — add some in <strong>Edit Fields</strong>.
            </small>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className={styles.formGroup}>
          <label>{field.label}</label>
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={errorClass}
          />
        </div>
      );

    case 'checkbox':
      return (
        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
            />
            {field.label}
          </label>
        </div>
      );

    case 'number': {
      // ---- Discount special case ----
      if (field.key === 'discount') {
        const discount = typeof value === 'number' ? value : 0;
        return (
          <div className={styles.formGroup}>
            <label>{field.label}</label>
            <input
              type="number"
              value={discount || ''}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                let v = Number.isFinite(raw) ? raw : 0;
                if (v < 0) v = 0;
                if (v > 100) v = 100;
                onChange(v);
              }}
              className={errorClass}
              min="0"
              max="100"
              step="1"
              placeholder="0"
            />
            <small className={styles.fieldHint}>
              Enter 0–100. Setting a discount forces Cost Price to 0.
            </small>
          </div>
        );
      }

      // ---- Cost price special case ----
      if (field.key === 'costPrice') {
        const cost = typeof value === 'number' ? value : 0;
        return (
          <div className={styles.formGroup}>
            <label>{field.label}</label>
            <input
              type="number"
              value={cost || ''}
              onChange={(e) => {
                const raw = parseFloat(e.target.value);
                let v = Number.isFinite(raw) ? raw : 0;
                if (v < 0) v = 0;
                onChange(v);
              }}
              className={errorClass}
              min="0"
              placeholder="0"
            />
            <small className={styles.fieldHint}>
              Entering a Cost Price resets Discount to 0.
            </small>
          </div>
        );
      }

      // ---- Default number field ----
      return (
        <div className={styles.formGroup}>
          <label>
            {field.label}
            {field.builtin && field.key === 'price' ? ' (Rs) *' : ''}
          </label>
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className={errorClass}
            min="0"
          />
        </div>
      );
    }

    case 'text':
    default:
      return (
        <div className={styles.formGroup}>
          <label>
            {field.label}
            {field.builtin && field.key === 'name' ? ' *' : ''}
          </label>
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={errorClass}
          />
        </div>
      );
  }
};

export default DynamicField;