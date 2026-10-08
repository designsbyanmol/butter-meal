// src/components/Admin/DynamicField.tsx
import React, { useEffect, useMemo } from 'react';
import {
  FormFieldConfig,
  FormFieldOption,
  normalizeOptions,
} from '../../types';
import { Input, Textarea, Select, Toggle, FormField } from '../ui';
import ImageUpload from './ImageUpload';
import local from './DynamicField.module.scss';

interface DynamicFieldProps {
  field: FormFieldConfig;
  value: any;
  onChange: (value: any) => void;
  invalid?: boolean;
  onImageUploaded?: (url: string) => void;
  ingredientsInput?: string;
  onIngredientsInputChange?: (value: string) => void;
}

/**
 * Custom fields with a name can hold either a plain string or an array.
 * Short-text fields (< 24 chars) render as short tags next to prep time.
 * Anything longer is treated as a paragraph.
 */
const SHORT_TEXT_LIMIT = 24;

// ---------------------------------------------------------
// Number-input focus helpers
// ---------------------------------------------------------
/**
 * When a numeric input currently reads 0, blank it on focus so the
 * user can type a fresh value without first deleting the zero.
 * The model value stays 0 until they actually type something.
 */
const blankIfZero = (
  e: React.FocusEvent<HTMLInputElement>,
  currentValue: number | undefined,
) => {
  if (currentValue === 0) {
    e.currentTarget.value = '';
  }
};

/**
 * If the user leaves a numeric input blank, snap the model back to 0
 * so downstream code (DB writes, cart math) always sees a number.
 */
const restoreZeroIfBlank = (
  e: React.FocusEvent<HTMLInputElement>,
  onEmpty: () => void,
) => {
  if (e.currentTarget.value.trim() === '') {
    onEmpty();
  }
};

const DynamicField: React.FC<DynamicFieldProps> = ({
  field,
  value,
  onChange,
  invalid,
  onImageUploaded,
  ingredientsInput,
  onIngredientsInputChange,
}) => {
  // Normalize options once per render - works for both string[] and FormFieldOption[]
  const selectOptions = useMemo(
    () => normalizeOptions(field.options),
    [field.options],
  );

  const currentValue = typeof value === 'string' ? value : '';

  // ---------- Category: drop stale values ----------
  useEffect(() => {
    if (field.key !== 'category') return;
    if (!currentValue) return;
    const names = selectOptions.map((o) => o.name);
    if (names.includes(currentValue)) return;
    onChange('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.key, currentValue, selectOptions]);

  // =========================================================
  // IMAGE
  // =========================================================
  if (field.key === 'img') {
    const gallery = Array.isArray(value) ? value : [];
    const images =
      gallery.length > 0
        ? gallery
        : typeof value === 'string' && value
        ? [value]
        : [];

    return (
      <FormField label={`${field.label} *`}>
        <div className={invalid ? local.imageUploadError : ''}>
          <ImageUpload
            multiple
            currentImages={images}
            onImagesUploaded={(urls) => onChange(urls)}
            label="Upload Item Images"
            maxImages={6}
            folder="menu-items"
          />
        </div>
      </FormField>
    );
  }

  // =========================================================
  // NUTRITIONAL INFO - heading/value list from the schema
  // =========================================================
  if (field.key === 'nutritionalInfo') {
    const headings: FormFieldOption[] = selectOptions;

    // Build a case-insensitive lookup of the item's current nutrition values.
    // Old items may have keys with different casing than the schema headings
    // (e.g. "protein" vs "Protein") because the schema keys were changed
    // after the item was saved.
    const currentMap: Record<string, string> =
      value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};

    const lookupByLower = new Map<string, string>();
    Object.entries(currentMap).forEach(([k, v]) => {
      if (typeof v === 'string' && v.trim() !== '') {
        lookupByLower.set(k.toLowerCase(), v);
      }
    });

    const setEntry = (headingName: string, val: string) => {
      // Start from a normalized object that uses only the current schema's
      // canonical heading keys. Any case-variant keys are dropped in the
      // process - this is what cleans up the ghost "protein" duplicates.
      const next: Record<string, string> = {};

      headings.forEach((h) => {
        const current = lookupByLower.get(h.name.toLowerCase());
        const isTarget = h.name === headingName;
        const newValue = isTarget ? val : current ?? '';

        if (newValue.trim() !== '') {
          next[h.name] = newValue;
        }
      });

      onChange(next);
    };

    if (headings.length === 0) {
      return (
        <FormField
          label={field.label}
          hint="No nutrition headings configured yet - add them in Edit Fields."
        >
          <div className={local.nutritionEmpty}>
            No headings defined in{' '}
            <strong>Edit Fields - Nutritional Information</strong>.
          </div>
        </FormField>
      );
    }

    return (
      <FormField label={field.label}>
        <div className={local.nutritionGrid}>
          {headings.map((heading) => {
            const current =
              lookupByLower.get(heading.name.toLowerCase()) ?? '';
            return (
              <div key={heading.name} className={local.nutritionRow}>
                <label className={local.nutritionLabel}>
                  {heading.name}
                </label>
                <Input
                  value={current}
                  onChange={(e) => setEntry(heading.name, e.target.value)}
                  placeholder={heading.value || 'e.g. 12g'}
                  inputSize="sm"
                  invalid={invalid}
                />
              </div>
            );
          })}
        </div>
      </FormField>
    );
  }

  // =========================================================
  // INGREDIENTS
  // =========================================================
  if (field.key === 'ingredients' && onIngredientsInputChange) {
    return (
      <FormField label={`${field.label} (comma separated)`}>
        <Input
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
      </FormField>
    );
  }

  // =========================================================
  // SELECT
  // =========================================================
  if (field.type === 'select') {
    return (
      <FormField
        label={field.label}
        hint={
          field.key === 'category' && selectOptions.length === 0
            ? 'No categories yet - add some in Edit Fields.'
            : undefined
        }
      >
        <Select
          value={currentValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="- Select -"
          options={selectOptions.map((o) => ({
            value: o.name,
            label: o.name,
          }))}
          invalid={invalid}
        />
      </FormField>
    );
  }

  // =========================================================
  // TEXTAREA
  // =========================================================
  if (field.type === 'textarea') {
    return (
      <FormField label={field.label}>
        <Textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          invalid={invalid}
        />
      </FormField>
    );
  }

  // =========================================================
  // CHECKBOX
  // =========================================================
  if (field.type === 'checkbox') {
    return (
      <FormField>
        <Toggle
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          label={field.label}
        />
      </FormField>
    );
  }

  // =========================================================
  // NUMBER
  // =========================================================
  if (field.type === 'number') {
    if (field.key === 'discount') {
      const discount = typeof value === 'number' ? value : 0;
      return (
        <FormField
          label={field.label}
          hint="Enter 0-100. Setting a discount forces Cost Price to 0."
        >
          <Input
            type="number"
            value={discount || ''}
            onFocus={(e) => blankIfZero(e, discount)}
            onBlur={(e) => restoreZeroIfBlank(e, () => onChange(0))}
            onChange={(e) => {
              const raw = parseFloat(e.target.value);
              let v = Number.isFinite(raw) ? raw : 0;
              if (v < 0) v = 0;
              if (v > 100) v = 100;
              onChange(v);
            }}
            invalid={invalid}
            min={0}
            max={100}
            step={1}
            placeholder="0"
          />
        </FormField>
      );
    }

    if (field.key === 'costPrice') {
      const cost = typeof value === 'number' ? value : 0;
      return (
        <FormField
          label={field.label}
          hint="Entering a Cost Price resets Discount to 0."
        >
          <Input
            type="number"
            value={cost || ''}
            onFocus={(e) => blankIfZero(e, cost)}
            onBlur={(e) => restoreZeroIfBlank(e, () => onChange(0))}
            onChange={(e) => {
              const raw = parseFloat(e.target.value);
              let v = Number.isFinite(raw) ? raw : 0;
              if (v < 0) v = 0;
              onChange(v);
            }}
            invalid={invalid}
            min={0}
            placeholder="0"
          />
        </FormField>
      );
    }

    return (
      <FormField
        label={`${field.label}${
          field.builtin && field.key === 'price' ? ' (Rs) *' : ''
        }`}
      >
        <Input
          type="number"
          value={value ?? ''}
          onFocus={(e) =>
            blankIfZero(e, typeof value === 'number' ? value : undefined)
          }
          onBlur={(e) => restoreZeroIfBlank(e, () => onChange(0))}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          invalid={invalid}
          min={0}
        />
      </FormField>
    );
  }

  // =========================================================
  // TEXT (default)
  // =========================================================
  return (
    <FormField
      label={`${field.label}${
        field.builtin && field.key === 'name' ? ' *' : ''
      }`}
    >
      <Input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        invalid={invalid}
      />
    </FormField>
  );
};

export default DynamicField;