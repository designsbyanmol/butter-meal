// components/Admin/FormBuilder.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useMenu } from '../../hooks/useMenu';
import { supabaseService } from '../../services/supabase.service';
import { menuService } from '../../services/menu.service';
import {
  FormFieldConfig,
  FormFieldType,
  FormSchema,
  DEFAULT_FORM_SCHEMA,
} from '../../types';
import { CloseIcon } from '../../assets/svgs';
import styles from './FormBuilder.module.scss';

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
// CategoryChip — inline-editable + draggable pill
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

  const handleDragStart = (e: React.DragEvent<HTMLSpanElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    onDragStart(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver(index);
  };

  const handleDrop = (e: React.DragEvent<HTMLSpanElement>) => {
    e.preventDefault();
    onDrop(index);
  };

  return (
    <span
      className={[
        styles.categoryChip,
        isDragging ? styles.chipDragging : '',
        isDropTarget ? styles.chipDropTarget : '',
      ]
        .filter(Boolean)
        .join(' ')}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
    >
      <span className={styles.chipDragHandle} title="Drag to reorder">
        ⋮⋮
      </span>
      <input
        type="text"
        className={styles.categoryChipInput}
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
        aria-label={`Rename category ${value}`}
        // Prevent the input from initiating a drag when the user
        // grabs text inside it
        onDragStart={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        className={styles.categoryChipRemove}
        onClick={onRemove}
        aria-label={`Remove ${value}`}
      >
        <CloseIcon width={12} height={12} fill="#a62d2d" />
      </button>
    </span>
  );
};

// =========================================================
// FormBuilder
// =========================================================
const FormBuilder: React.FC<FormBuilderProps> = ({ onClose }) => {
  const { tenant, refreshTenant } = useTenant();
  const { items: allMenuItems } = useMenu();

  const [schema, setSchema] = useState<FormSchema>(
    tenant?.formSchema ?? DEFAULT_FORM_SCHEMA,
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customType, setCustomType] = useState<FormFieldType>('text');
  const [customOptionsInput, setCustomOptionsInput] = useState('');

  // Category manager input
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Drag state for category reordering
  const [draggedChipIndex, setDraggedChipIndex] = useState<number | null>(null);
  const [dragOverChipIndex, setDragOverChipIndex] = useState<number | null>(null);

  // Snapshot of the tenant schema at modal open — used to diff removed cats
  const initialSchemaRef = useRef<FormSchema | null>(null);

  // Guard: auto-seed must only run once per modal lifetime
  const seedRanRef = useRef(false);

  // -------- Initialize schema from the tenant ONCE on mount --------
  useEffect(() => {
    const incoming = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;
    setSchema(incoming);
    initialSchemaRef.current = incoming;
    seedRanRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- Auto-seed categories from existing items (ONE TIME ONLY) --------
  useEffect(() => {
    if (seedRanRef.current) return;
    if (!allMenuItems.length) return;

    const catField = schema.fields.find((f) => f.key === 'category');
    const catOpts = catField?.options ?? [];
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

  // -------- Flash helpers --------
  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };
  const flashError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  // =========================================================
  // FIELD TOGGLES / RENAME
  // =========================================================
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

  // =========================================================
  // CUSTOM FIELD OPTIONS
  // =========================================================
  const updateCustomOptions = (key: string, options: string[]) => {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.key === key ? { ...f, options } : f)),
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

  // =========================================================
  // CATEGORY MANAGER
  // =========================================================
  const addCategoryOption = (fieldKey: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => {
        if (f.key !== fieldKey) return f;
        const existing = f.options ?? [];
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
          ? { ...f, options: (f.options ?? []).filter((o) => o !== option) }
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
        const opts = (f.options ?? []).map((o) =>
          o === oldName ? trimmed : o,
        );
        return { ...f, options: Array.from(new Set(opts)) };
      }),
    }));

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

  // ---------- Category reorder (drag-and-drop) ----------
  const handleChipDragStart = (index: number) => {
    setDraggedChipIndex(index);
  };

  const handleChipDragOver = (index: number) => {
    if (index !== dragOverChipIndex) setDragOverChipIndex(index);
  };

  const handleChipDragEnd = () => {
    setDraggedChipIndex(null);
    setDragOverChipIndex(null);
  };

  const reorderCategories = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => {
        if (f.key !== 'category') return f;

        const opts = [...(f.options ?? [])];
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
        return { ...f, options: opts };
      }),
    }));
  };

  const handleChipDrop = (targetIndex: number) => {
    if (draggedChipIndex === null) return;
    reorderCategories(draggedChipIndex, targetIndex);
    setDraggedChipIndex(null);
    setDragOverChipIndex(null);
  };

  // =========================================================
  // RESET / SAVE
  // =========================================================
  const resetToDefault = () => {
    if (
      !window.confirm(
        'Reset the form to the default field layout? Your custom fields and category list will be lost.',
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
      // ---------------- 1. Diff category lists ----------------
      const oldCatField = baseline.fields.find((f) => f.key === 'category');
      const newCatField = schema.fields.find((f) => f.key === 'category');

      const oldCats = new Set<string>(
        (oldCatField?.options ?? []).map((s) => s.trim()),
      );
      const newCats = new Set<string>(
        (newCatField?.options ?? []).map((s) => s.trim()),
      );

      const removedCats: string[] = [];
      oldCats.forEach((c) => {
        if (c && !newCats.has(c)) removedCats.push(c);
      });

      // ---------------- 2. Reassign items under removed categories ----------------
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

      // ---------------- 3. Persist the schema ----------------
      await supabaseService.updateFormSchema(tenant.slug, schema);

      Promise.allSettled([
        refreshTenant(),
        menuService.refresh(),
      ]).catch(() => {
        /* silently ignore */
      });

      flashSuccess(
        removedCats.length > 0
          ? `Saved. ${removedCats.length} category(ies) removed; affected items moved to Uncategorized.`
          : 'Form fields saved',
      );

      setTimeout(() => onClose(), 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      flashError(msg);
      setIsSaving(false);
    }
  };

  const builtinFields = schema.fields.filter((f) => f.builtin);
  const customFields = schema.fields.filter((f) => !f.builtin);

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Customize Item Form</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <CloseIcon width={18} height={18} fill="#4d4d4d" />
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <span>{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss">
              <CloseIcon width={14} height={14} fill="#dc3545" />
            </button>
          </div>
        )}
        {success && (
          <div className={styles.successMessage}>
            <span>{success}</span>
          </div>
        )}

        <div className={styles.itemList}>
          <h3 className={styles.sectionTitle}>Standard fields</h3>
          <p className={styles.sectionHint}>
            Locked fields (marked with *) cannot be disabled or renamed.
          </p>

          {builtinFields.map((field) => (
            <div key={field.key} className={styles.itemRow}>
              <div className={styles.itemInfo}>
                <div className={styles.fieldStack}>
                  <div className={styles.fieldHeader}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={field.enabled}
                        onChange={() => toggleField(field.key)}
                        disabled={field.locked}
                      />
                      <span className={styles.fieldName}>
                        {field.label}
                        {field.locked && (
                          <span
                            className={styles.lockedMark}
                            title="This field is required and cannot be changed"
                          >
                            *
                          </span>
                        )}
                      </span>
                    </label>
                    <span className={styles.fieldType}>{field.type}</span>
                  </div>

                  <input
                    type="text"
                    className={styles.fieldInput}
                    value={field.label}
                    onChange={(e) => renameField(field.key, e.target.value)}
                    placeholder="Display label"
                    disabled={field.locked}
                  />

                  {/* ============ CATEGORY MANAGER ============ */}
                  {field.key === 'category' && (
                    <div className={styles.categoryManager}>
                      <label className={styles.fieldHintLabel}>
                        Categories ({field.options?.length ?? 0})
                      </label>

                      <div className={styles.categoryChips}>
                        {(field.options ?? []).length === 0 && (
                          <span className={styles.emptyCategories}>
                            No categories yet — add one below.
                          </span>
                        )}

                        {(field.options ?? []).map((cat, idx) => (
                          <CategoryChip
                            key={`${idx}-${cat}`}
                            value={cat}
                            index={idx}
                            isDragging={draggedChipIndex === idx}
                            isDropTarget={
                              dragOverChipIndex === idx &&
                              draggedChipIndex !== null &&
                              draggedChipIndex !== idx
                            }
                            onCommit={(next) =>
                              renameCategoryOption(field.key, cat, next)
                            }
                            onRemove={() =>
                              removeCategoryOption(field.key, cat)
                            }
                            onDragStart={handleChipDragStart}
                            onDragOver={handleChipDragOver}
                            onDrop={handleChipDrop}
                            onDragEnd={handleChipDragEnd}
                          />
                        ))}
                      </div>

                      <div className={styles.categoryAddRow}>
                        <input
                          type="text"
                          className={styles.fieldInput}
                          value={newCategoryInput}
                          onChange={(e) =>
                            setNewCategoryInput(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCategoryOption(
                                field.key,
                                newCategoryInput,
                              );
                            }
                          }}
                          placeholder="Add a category and press Enter"
                        />
                        <button
                          type="button"
                          className={styles.addCategoryBtn}
                          onClick={() =>
                            addCategoryOption(field.key, newCategoryInput)
                          }
                          disabled={!newCategoryInput.trim()}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <h3 className={styles.customHeader}>
            Custom fields
            <button
              type="button"
              className={styles.addCustomizationBtn}
              onClick={() => setShowAddCustom((s) => !s)}
            >
              + Add field
            </button>
          </h3>

          {showAddCustom && (
            <div className={styles.addFieldCard}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Field label</label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g., Spice Level, Size"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Field type</label>
                  <select
                    value={customType}
                    onChange={(e) =>
                      setCustomType(e.target.value as FormFieldType)
                    }
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="textarea">Long text</option>
                    <option value="checkbox">Yes/No</option>
                    <option value="select">Dropdown (Select)</option>
                  </select>
                </div>
              </div>

              {customType === 'select' && (
                <div className={styles.formGroup}>
                  <label>Options (comma separated)</label>
                  <input
                    type="text"
                    value={customOptionsInput}
                    onChange={(e) => setCustomOptionsInput(e.target.value)}
                    placeholder="e.g., Small, Medium, Large"
                  />
                  <small className={styles.fieldHint}>
                    These will be shown as a dropdown on the item form.
                  </small>
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => {
                    setShowAddCustom(false);
                    setCustomOptionsInput('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={addCustomField}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {customFields.length === 0 ? (
            <p className={styles.emptyCustom}>No custom fields yet.</p>
          ) : (
            customFields.map((field) => (
              <div key={field.key} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <div className={styles.fieldStack}>
                    <div className={styles.fieldHeader}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={() => toggleField(field.key)}
                        />
                        <span className={styles.fieldName}>{field.label}</span>
                      </label>
                      <span className={styles.fieldType}>{field.type}</span>
                    </div>
                    <input
                      type="text"
                      className={styles.fieldInput}
                      value={field.label}
                      onChange={(e) => renameField(field.key, e.target.value)}
                      placeholder="Display label"
                    />

                    {field.type === 'select' && (
                      <div className={styles.selectOptionsWrap}>
                        <label className={styles.fieldHintLabel}>
                          Options (comma separated)
                        </label>
                        <input
                          type="text"
                          className={styles.fieldInput}
                          value={(field.options ?? []).join(', ')}
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
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.itemStatus}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => removeCustomField(field.key)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={resetToDefault}
            disabled={isSaving}
          >
            Reset to default
          </button>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save fields'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;