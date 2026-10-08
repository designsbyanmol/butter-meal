// src/components/Admin/FormBuilder.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useMenu } from '../../hooks/useMenu';
import { supabaseService } from '../../services/supabase.service';
import { menuService } from '../../services/menu.service';
import {
  FormFieldConfig,
  FormFieldType,
  FormSchema,
  FormFieldOption,
  BadgeDefinition,
  DEFAULT_FORM_SCHEMA,
  normalizeOptions,
} from '../../types';
import {
  Modal,
  Button,
  IconButton,
  Input,
  Select,
  FormField,
  Toggle,
  Banner,
  Chip,
  EmptyState,
} from '../ui';
import { CloseIcon } from '../../assets/svgs';
import ImageUpload from './ImageUpload';
import local from './FormBuilder.module.scss';

interface FormBuilderProps {
  onClose: () => void;
}

const slugifyKey = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

// =========================================================
// CategoryChip
// =========================================================
interface CategoryChipProps {
  value: string;
  index: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onCommit: (next: string) => void;
  onRemove: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

const CategoryChip: React.FC<CategoryChipProps> = ({
  value,
  index,
  isDragging,
  isDropTarget,
  onCommit,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const v = draft.trim();
    if (!v) {
      onRemove();
      return;
    }
    if (v !== value) onCommit(v);
  };

  return (
    <span
      className={[
        local.chip,
        isDragging ? local.chipDragging : '',
        isDropTarget ? local.chipDropTarget : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        onDragStart(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      onDragEnd={onDragEnd}
    >
      <span className={local.chipHandle} title="Drag to reorder">
        ::
      </span>
      <input
        type="text"
        className={local.chipInput}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'Escape') {
            setDraft(value);
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={`Rename ${value}`}
        onDragStart={(e) => e.stopPropagation()}
      />
      <IconButton
        variant="danger"
        size="sm"
        aria-label={`Remove ${value}`}
        onClick={onRemove}
      >
        <CloseIcon width={12} height={12} fill="#a62d2d" />
      </IconButton>
    </span>
  );
};

// =========================================================
// NutritionRow
// =========================================================
interface NutritionRowProps {
  option: FormFieldOption;
  index: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onChange: (next: FormFieldOption) => void;
  onRemove: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

const NutritionRow: React.FC<NutritionRowProps> = ({
  option,
  index,
  isDragging,
  isDropTarget,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const [name, setName] = useState(option.name);
  const [value, setValue] = useState(option.value ?? '');

  useEffect(() => setName(option.name), [option.name]);
  useEffect(() => setValue(option.value ?? ''), [option.value]);

  const commit = () => {
    const n = name.trim();
    if (!n) {
      onRemove();
      return;
    }
    if (n !== option.name || value !== (option.value ?? '')) {
      onChange({ name: n, value: value.trim() });
    }
  };

  return (
    <div
      className={[
        local.nutritionRow,
        isDragging ? local.chipDragging : '',
        isDropTarget ? local.chipDropTarget : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        onDragStart(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      onDragEnd={onDragEnd}
    >
      <span className={local.chipHandle} title="Drag to reorder">
        ::
      </span>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Heading (e.g. Protein)"
        inputSize="sm"
        className={local.nutritionName}
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Value (e.g. 12g)"
        inputSize="sm"
        className={local.nutritionValue}
      />
      <IconButton
        variant="danger"
        size="sm"
        aria-label={`Remove ${option.name}`}
        onClick={onRemove}
      >
        <CloseIcon width={12} height={12} fill="#a62d2d" />
      </IconButton>
    </div>
  );
};

// =========================================================
// BadgeRow
// =========================================================
interface BadgeRowProps {
  badge: BadgeDefinition;
  onChange: (next: BadgeDefinition) => void;
  onRemove: () => void;
}

const BadgeRow: React.FC<BadgeRowProps> = ({
  badge,
  onChange,
  onRemove,
}) => {
  const [label, setLabel] = useState(badge.label);

  useEffect(() => setLabel(badge.label), [badge.label]);

  const commitLabel = () => {
    const v = label.trim();
    if (!v || v === badge.label) return;
    onChange({ ...badge, label: v });
  };

  return (
    <div className={local.badgeRow}>
      <div className={local.badgeRowHeader}>
        <Toggle
          checked={badge.enabled}
          onChange={(e) =>
            onChange({ ...badge, enabled: e.target.checked })
          }
          label={<span className={local.fieldName}>{badge.label}</span>}
        />

        <IconButton
          variant="danger"
          size="sm"
          aria-label={`Remove badge ${badge.label}`}
          onClick={onRemove}
        >
          <CloseIcon width={14} height={14} fill="#a62d2d" />
        </IconButton>
      </div>

      <FormField label="Display label">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          inputSize="sm"
        />
      </FormField>

      <div className={local.badgeImageRow}>
        <ImageUpload
          currentImage={badge.image ?? ''}
          onImageUploaded={(url) => onChange({ ...badge, image: url })}
          label="Icon (optional, 128x128 recommended)"
          folder="badges"
          maxDimension={128}
          maxFileSizeMB={1}
        />
      </div>
    </div>
  );
};

// =========================================================
// FormBuilder
// =========================================================
const FormBuilder: React.FC<FormBuilderProps> = ({ onClose }) => {
  const { tenant, refreshTenant } = useTenant();
  const { items: allMenuItems } = useMenu();

  const [schema, setSchema] = useState<FormSchema>(() => {
    const incoming = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;
    return {
      fields: incoming.fields,
      badges: incoming.badges ?? DEFAULT_FORM_SCHEMA.badges,
      badgesLabel:
        incoming.badgesLabel ?? DEFAULT_FORM_SCHEMA.badgesLabel ?? 'Badges',
    };
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customType, setCustomType] = useState<FormFieldType>('text');
  const [customOptionsInput, setCustomOptionsInput] = useState('');

  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [draggedChipIndex, setDraggedChipIndex] = useState<number | null>(null);
  const [dragOverChipIndex, setDragOverChipIndex] = useState<number | null>(null);

  const [draggedNutIdx, setDraggedNutIdx] = useState<number | null>(null);
  const [dragOverNutIdx, setDragOverNutIdx] = useState<number | null>(null);

  const initialSchemaRef = useRef<FormSchema | null>(null);
  const seedRanRef = useRef(false);

  useEffect(() => {
    const incoming = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;
    const normalized: FormSchema = {
      fields: incoming.fields,
      badges: incoming.badges ?? DEFAULT_FORM_SCHEMA.badges,
      badgesLabel:
        incoming.badgesLabel ?? DEFAULT_FORM_SCHEMA.badgesLabel ?? 'Badges',
    };
    setSchema(normalized);
    initialSchemaRef.current = normalized;
    seedRanRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time category seed
  useEffect(() => {
    if (seedRanRef.current) return;
    if (!allMenuItems.length) return;

    const catField = schema.fields.find((f) => f.key === 'category');
    const catOpts = normalizeOptions(catField?.options);
    const hasCustomFields = schema.fields.some((f) => !f.builtin);

    if (catOpts.length > 0 || hasCustomFields) {
      seedRanRef.current = true;
      return;
    }

    const existing = new Set<string>();
    allMenuItems.forEach((it) => {
      const c = it.category?.trim();
      if (c) existing.add(c);
    });
    if (existing.size === 0) {
      seedRanRef.current = true;
      return;
    }

    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.key === 'category'
          ? { ...f, options: Array.from(existing) }
          : f,
      ),
    }));
    seedRanRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMenuItems.length]);

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };
  const flashError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  // ---------- Field mutations ----------
  const toggleField = (key: string) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.key === key && !f.locked ? { ...f, enabled: !f.enabled } : f,
      ),
    }));
  };

  const renameField = (key: string, label: string) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.key === key && !f.locked ? { ...f, label } : f,
      ),
    }));
  };

  const updateFieldImage = (key: string, image: string) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.key === key ? { ...f, image } : f,
      ),
    }));
  };

  const updateCustomOptions = (key: string, options: string[]) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.key === key ? { ...f, options } : f,
      ),
    }));
  };

  const removeCustomField = (key: string) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.key !== key),
    }));
  };

  const addCustomField = () => {
    const trimmed = customLabel.trim();
    if (!trimmed) {
      flashError('Field label is required');
      return;
    }
    const key = `custom_${slugifyKey(trimmed)}`;
    if (schema.fields.some((f) => f.key === key)) {
      flashError('A field with this name already exists');
      return;
    }

    let options: string[] | undefined;
    if (customType === 'select') {
      options = customOptionsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (options.length < 2) {
        flashError('Select fields need at least 2 options (comma-separated)');
        return;
      }
    }

    const newField: FormFieldConfig = {
      key,
      label: trimmed,
      type: customType,
      enabled: true,
      builtin: false,
      removable: true,
      options,
    };
    setSchema((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
    setCustomLabel('');
    setCustomType('text');
    setCustomOptionsInput('');
    setShowAddCustom(false);
  };

  // ---------- Category manager ----------
  const addCategoryOption = (fieldKey: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => {
        if (f.key !== fieldKey) return f;
        const existing = normalizeOptions(f.options).map((o) => o.name);
        if (existing.includes(trimmed)) return f;
        return { ...f, options: [...existing, trimmed] };
      }),
    }));
    setNewCategoryInput('');
  };

  const removeCategoryOption = (fieldKey: string, option: string) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.key === fieldKey
          ? {
              ...f,
              options: normalizeOptions(f.options)
                .filter((o) => o.name !== option)
                .map((o) => o.name),
            }
          : f,
      ),
    }));
  };

  const renameCategoryOption = async (
    fieldKey: string,
    oldName: string,
    newName: string,
  ) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;

    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => {
        if (f.key !== fieldKey) return f;
        const names = normalizeOptions(f.options).map((o) => o.name);
        const renamed = names.map((n) => (n === oldName ? trimmed : n));
        return { ...f, options: Array.from(new Set(renamed)) };
      }),
    }));

    if (fieldKey !== 'category') return;

    const affected = allMenuItems.filter(
      (it) => (it.category ?? '').trim() === oldName,
    );
    if (affected.length === 0) return;

    try {
      await Promise.all(
        affected.map((it) =>
          menuService.updateItem(it.id, { category: trimmed }),
        ),
      );
    } catch (err) {
      console.error('Category rename cascade failed:', err);
      flashError('Rename saved locally, but could not update all items.');
    }
  };

  const reorderCategories = (
    fieldKey: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    if (fromIndex === toIndex) return;
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => {
        if (f.key !== fieldKey) return f;
        const opts = [...normalizeOptions(f.options)];
        if (
          fromIndex < 0 ||
          fromIndex >= opts.length ||
          toIndex < 0 ||
          toIndex >= opts.length
        ) {
          return f;
        }
        const [moved] = opts.splice(fromIndex, 1);
        opts.splice(toIndex, 0, moved);
        return {
          ...f,
          options: opts.map((o) => o.name),
        };
      }),
    }));
  };

  // ---------- Nutrition manager ----------
  const getNutritionOptions = (fieldKey: string): FormFieldOption[] => {
    const f = schema.fields.find((x) => x.key === fieldKey);
    return normalizeOptions(f?.options);
  };

  const setNutritionOptions = (
    fieldKey: string,
    options: FormFieldOption[],
  ) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.key === fieldKey ? { ...f, options } : f,
      ),
    }));
  };

  const addNutritionRow = (fieldKey: string) => {
    const current = getNutritionOptions(fieldKey);
    setNutritionOptions(fieldKey, [...current, { name: '', value: '' }]);
  };

  const updateNutritionRow = (
    fieldKey: string,
    index: number,
    next: FormFieldOption,
  ) => {
    const current = getNutritionOptions(fieldKey);
    const updated = [...current];
    updated[index] = next;
    setNutritionOptions(fieldKey, updated);
  };

  const removeNutritionRow = (fieldKey: string, index: number) => {
    const current = getNutritionOptions(fieldKey);
    setNutritionOptions(
      fieldKey,
      current.filter((_, i) => i !== index),
    );
  };

  const reorderNutrition = (
    fieldKey: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    if (fromIndex === toIndex) return;
    const current = getNutritionOptions(fieldKey);
    if (
      fromIndex < 0 ||
      fromIndex >= current.length ||
      toIndex < 0 ||
      toIndex >= current.length
    )
      return;
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setNutritionOptions(fieldKey, next);
  };

  // ---------- Badge manager ----------
  const updateBadge = (index: number, next: BadgeDefinition) => {
    setSchema((prev) => ({
      ...prev,
      badges: (prev.badges ?? []).map((b, i) => (i === index ? next : b)),
    }));
  };

  const removeBadge = (index: number) => {
    setSchema((prev) => ({
      ...prev,
      badges: (prev.badges ?? []).filter((_, i) => i !== index),
    }));
  };

  const addBadge = () => {
    const badges = schema.badges ?? [];
    const newKey = `custom_${slugifyKey(
      `badge_${badges.length + 1}`,
    )}_${Date.now().toString(36).slice(-4)}`;
    setSchema((prev) => ({
      ...prev,
      badges: [
        ...(prev.badges ?? []),
        {
          key: newKey,
          label: 'New Badge',
          enabled: true,
          removable: true,
        },
      ],
    }));
  };

  // ---------- Reset / save ----------
  const resetToDefault = () => {
    if (
      !window.confirm(
        'Reset the form to the default field layout? Your custom fields, categories, badges and nutrition setup will be lost.',
      )
    )
      return;
    setSchema(DEFAULT_FORM_SCHEMA);
  };

  const handleSave = async () => {
    if (!tenant) return;

    const baseline =
      initialSchemaRef.current ?? tenant.formSchema ?? DEFAULT_FORM_SCHEMA;

    setIsSaving(true);
    setError('');

    try {
      // 1. Diff categories
      const oldCatField = baseline.fields.find((f) => f.key === 'category');
      const newCatField = schema.fields.find((f) => f.key === 'category');
      const oldCats = new Set<string>(
        normalizeOptions(oldCatField?.options).map((o) => o.name.trim()),
      );
      const newCats = new Set<string>(
        normalizeOptions(newCatField?.options).map((o) => o.name.trim()),
      );
      const removedCats: string[] = [];
      oldCats.forEach((c) => {
        if (c && !newCats.has(c)) removedCats.push(c);
      });

      if (removedCats.length > 0) {
        const removedSet = new Set(removedCats);
        const affected = allMenuItems.filter((it) => {
          const c = (it.category ?? '').trim();
          return c && removedSet.has(c);
        });
        if (affected.length > 0) {
          await Promise.all(
            affected.map((it) =>
              menuService.updateItem(it.id, { category: undefined }),
            ),
          );
        }
      }

      // 2. Diff badges and strip attributes from items
      const oldBadgeKeys = new Set((baseline.badges ?? []).map((b) => b.key));
      const newBadgeKeys = new Set((schema.badges ?? []).map((b) => b.key));
      const removedBadgeKeys: string[] = [];
      oldBadgeKeys.forEach((k) => {
        if (!newBadgeKeys.has(k)) removedBadgeKeys.push(k);
      });

      if (removedBadgeKeys.length > 0) {
        const affected = allMenuItems.filter((it) => {
          const attrs = it.attributes ?? {};
          return removedBadgeKeys.some((k) => attrs[k]);
        });
        if (affected.length > 0) {
          await Promise.all(
            affected.map((it) => {
              const nextAttrs = { ...(it.attributes ?? {}) };
              removedBadgeKeys.forEach((k) => delete nextAttrs[k]);
              return menuService.updateItem(it.id, {
                attributes: nextAttrs,
              });
            }),
          );
        }
      }

      // 3. Persist the schema
      await supabaseService.updateFormSchema(tenant.slug, schema);

      // 4. Await tenant refresh BEFORE closing
      await refreshTenant();

      menuService.refresh().catch(() => {
        /* ignore */
      });

      const msgParts: string[] = [];
      if (removedCats.length > 0) {
        msgParts.push(
          `${removedCats.length} category(ies) removed; affected items moved to Uncategorized.`,
        );
      }
      if (removedBadgeKeys.length > 0) {
        msgParts.push(
          `${removedBadgeKeys.length} badge(s) removed from all items.`,
        );
      }
      flashSuccess(
        msgParts.length > 0
          ? `Saved. ${msgParts.join(' ')}`
          : 'Form fields saved',
      );

      setTimeout(() => onClose(), 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      flashError(msg);
      setIsSaving(false);
    }
  };

  const builtinFields = schema.fields.filter(
    (f) => f.builtin && !f.platformOnly,
  );
  const customFields = schema.fields.filter((f) => !f.builtin);
  const badges = schema.badges ?? [];

  const IMAGE_ENABLED_FIELDS = new Set([
    'category',
    'preparationTime',
    'calories',
  ]);

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Customize Item Form"
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={resetToDefault}
            disabled={isSaving}
            style={{ marginRight: 'auto' }}
          >
            Reset to default
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save fields
          </Button>
        </>
      }
    >
      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}
      {success && <Banner variant="success">{success}</Banner>}

      {/* ============ Standard fields ============ */}
      <h3 className={local.sectionTitle}>Standard fields</h3>
      <p className={local.sectionHint}>
        Locked fields (marked with *) cannot be disabled or renamed.
      </p>

      <div className={local.fieldList}>
        {builtinFields.map((field) => {
          const isCategory = field.key === 'category';
          const isNutrition = field.key === 'nutritionalInfo';
          const supportsImage = IMAGE_ENABLED_FIELDS.has(field.key);

          return (
            <div key={field.key} className={local.fieldCard}>
              <div className={local.fieldHeader}>
                <Toggle
                  checked={field.enabled}
                  disabled={field.locked}
                  onChange={() => toggleField(field.key)}
                  label={
                    <span className={local.fieldName}>
                      {field.label}
                      {field.locked && (
                        <span
                          className={local.lockedMark}
                          title="This field is required and cannot be changed"
                        >
                          *
                        </span>
                      )}
                    </span>
                  }
                />
                <span className={local.fieldType}>{field.type}</span>
              </div>

              <FormField label="Display label">
                <Input
                  value={field.label}
                  onChange={(e) => renameField(field.key, e.target.value)}
                  disabled={field.locked}
                  inputSize="sm"
                />
              </FormField>

              {supportsImage && (
                <div className={local.imageFieldWrap}>
                  <ImageUpload
                    currentImage={field.image ?? ''}
                    onImageUploaded={(url) =>
                      updateFieldImage(field.key, url)
                    }
                    label="Field icon (optional, 128x128 recommended)"
                    folder="field-icons"
                    maxDimension={128}
                    maxFileSizeMB={1}
                  />
                </div>
              )}

              {isCategory && (
                <div className={local.categoryManager}>
                  <label className={local.fieldHintLabel}>
                    Categories ({normalizeOptions(field.options).length})
                  </label>

                  <div className={local.chipGrid}>
                    {normalizeOptions(field.options).length === 0 && (
                      <span className={local.emptyCategories}>
                        No categories yet - add one below.
                      </span>
                    )}

                    {normalizeOptions(field.options).map((cat, idx) => (
                      <CategoryChip
                        key={`${idx}-${cat.name}`}
                        value={cat.name}
                        index={idx}
                        isDragging={draggedChipIndex === idx}
                        isDropTarget={
                          dragOverChipIndex === idx &&
                          draggedChipIndex !== null &&
                          draggedChipIndex !== idx
                        }
                        onCommit={(next) =>
                          renameCategoryOption(field.key, cat.name, next)
                        }
                        onRemove={() =>
                          removeCategoryOption(field.key, cat.name)
                        }
                        onDragStart={setDraggedChipIndex}
                        onDragOver={(i) => {
                          if (i !== dragOverChipIndex)
                            setDragOverChipIndex(i);
                        }}
                        onDrop={(targetIdx) => {
                          if (draggedChipIndex === null) return;
                          reorderCategories(
                            field.key,
                            draggedChipIndex,
                            targetIdx,
                          );
                          setDraggedChipIndex(null);
                          setDragOverChipIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggedChipIndex(null);
                          setDragOverChipIndex(null);
                        }}
                      />
                    ))}
                  </div>

                  <div className={local.categoryAddRow}>
                    <Input
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCategoryOption(field.key, newCategoryInput);
                        }
                      }}
                      placeholder="Add a category and press Enter"
                      inputSize="sm"
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        addCategoryOption(field.key, newCategoryInput)
                      }
                      disabled={!newCategoryInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}

              {isNutrition && (
                <div className={local.categoryManager}>
                  <label className={local.fieldHintLabel}>
                    Entries ({getNutritionOptions(field.key).length})
                  </label>

                  <div className={local.nutritionList}>
                    {getNutritionOptions(field.key).length === 0 && (
                      <span className={local.emptyCategories}>
                        No nutrition entries yet - add one below.
                      </span>
                    )}

                    {getNutritionOptions(field.key).map((opt, idx) => (
                      <NutritionRow
                        key={`${idx}-${opt.name}`}
                        option={opt}
                        index={idx}
                        isDragging={draggedNutIdx === idx}
                        isDropTarget={
                          dragOverNutIdx === idx &&
                          draggedNutIdx !== null &&
                          draggedNutIdx !== idx
                        }
                        onChange={(next) =>
                          updateNutritionRow(field.key, idx, next)
                        }
                        onRemove={() =>
                          removeNutritionRow(field.key, idx)
                        }
                        onDragStart={setDraggedNutIdx}
                        onDragOver={(i) => {
                          if (i !== dragOverNutIdx) setDragOverNutIdx(i);
                        }}
                        onDrop={(targetIdx) => {
                          if (draggedNutIdx === null) return;
                          reorderNutrition(
                            field.key,
                            draggedNutIdx,
                            targetIdx,
                          );
                          setDraggedNutIdx(null);
                          setDragOverNutIdx(null);
                        }}
                        onDragEnd={() => {
                          setDraggedNutIdx(null);
                          setDragOverNutIdx(null);
                        }}
                      />
                    ))}
                  </div>

                  <div className={local.categoryAddRow}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => addNutritionRow(field.key)}
                    >
                      + Add entry
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============ Badges ============ */}
      <div className={local.customHeader}>
        {/* Section heading mirrors the editable label live */}
        <h3 className={local.sectionTitle}>
          {schema.badgesLabel?.trim() || 'Badges'}
        </h3>
        <Button size="sm" variant="secondary" onClick={addBadge}>
          + Add
        </Button>
      </div>
      <p className={local.sectionHint}>
        Rename badges, upload custom icons, or delete ones you don't use.
        Deleting a badge also removes it from all items.
      </p>

      <FormField
        label="Section label"
        hint="This is the heading shown above the badge toggles inside Add / Edit Item."
      >
        <Input
          value={schema.badgesLabel ?? 'Badges'}
          onChange={(e) =>
            setSchema((prev) => ({
              ...prev,
              badgesLabel: e.target.value,
            }))
          }
          inputSize="sm"
          placeholder="Badges"
        />
      </FormField>

      {badges.length === 0 ? (
        <EmptyState
          title="No badges configured"
          description="Add a badge to highlight items on the menu."
        />
      ) : (
        <div className={local.fieldList}>
          {badges.map((badge, idx) => (
            <BadgeRow
              key={badge.key}
              badge={badge}
              onChange={(next) => updateBadge(idx, next)}
              onRemove={() => removeBadge(idx)}
            />
          ))}
        </div>
      )}

      {/* ============ Custom fields ============ */}
      <div className={local.customHeader}>
        <h3 className={local.sectionTitle}>Custom fields</h3>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowAddCustom((s) => !s)}
        >
          + Add field
        </Button>
      </div>

      {showAddCustom && (
        <div className={local.addFieldCard}>
          <FormField label="Field label">
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g., Spice Level, Size"
            />
          </FormField>

          <FormField label="Field type">
            <Select
              value={customType}
              onChange={(e) =>
                setCustomType(e.target.value as FormFieldType)
              }
              options={[
                { value: 'text', label: 'Text' },
                { value: 'number', label: 'Number' },
                { value: 'textarea', label: 'Long text' },
                { value: 'checkbox', label: 'Yes/No' },
                { value: 'select', label: 'Dropdown (Select)' },
              ]}
            />
          </FormField>

          {customType === 'select' && (
            <FormField
              label="Options (comma separated)"
              hint="These will be shown as a dropdown on the item form."
            >
              <Input
                value={customOptionsInput}
                onChange={(e) => setCustomOptionsInput(e.target.value)}
                placeholder="e.g., Small, Medium, Large"
              />
            </FormField>
          )}

          <div className={local.addFieldActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddCustom(false);
                setCustomOptionsInput('');
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={addCustomField}>
              Add
            </Button>
          </div>
        </div>
      )}

      {customFields.length === 0 ? (
        <EmptyState
          title="No custom fields yet"
          description="Add a field to capture extra info on each item."
        />
      ) : (
        <div className={local.fieldList}>
          {customFields.map((field) => (
            <div key={field.key} className={local.fieldCard}>
              <div className={local.fieldHeader}>
                <Toggle
                  checked={field.enabled}
                  onChange={() => toggleField(field.key)}
                  label={
                    <span className={local.fieldName}>{field.label}</span>
                  }
                />
                <span className={local.fieldType}>{field.type}</span>
                <IconButton
                  variant="danger"
                  size="sm"
                  aria-label={`Remove ${field.label}`}
                  onClick={() => removeCustomField(field.key)}
                >
                  <CloseIcon width={14} height={14} fill="#a62d2d" />
                </IconButton>
              </div>

              <FormField label="Display label">
                <Input
                  value={field.label}
                  onChange={(e) => renameField(field.key, e.target.value)}
                  inputSize="sm"
                />
              </FormField>

              {field.type === 'select' && (
                <FormField label="Options (comma separated)">
                  <Input
                    value={normalizeOptions(field.options)
                      .map((o) => o.name)
                      .join(', ')}
                    onChange={(e) =>
                      updateCustomOptions(
                        field.key,
                        e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="e.g., Small, Medium, Large"
                    inputSize="sm"
                  />
                </FormField>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default FormBuilder;