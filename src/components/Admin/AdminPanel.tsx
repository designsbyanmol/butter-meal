// components/Admin/AdminPanel.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MenuItem, CustomizationOption } from '../../types';
import { useMenu } from '../../hooks/useMenu';
import styles from './AdminPanel.module.scss';
import { CloseIcon } from '../../assets/svgs';
import ImageUpload from './ImageUpload';

interface AdminPanelProps {
  onClose: () => void;
}

// =========================================================
// Badge selector — reusable across Add + Edit forms
// =========================================================
const BadgeSelector: React.FC<{
  value: MenuItem['attributes'] | undefined;
  onChange: (next: MenuItem['attributes']) => void;
}> = ({ value = {}, onChange }) => {
  const toggle = (key: keyof NonNullable<MenuItem['attributes']>) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className={styles.formGroup}>
      <label>Badges</label>
      <div className={styles.badgeSelector}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value.isPopular}
            onChange={() => toggle('isPopular')}
          />
          Popular
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value.isNew}
            onChange={() => toggle('isNew')}
          />
          New
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value.isChefSpecial}
            onChange={() => toggle('isChefSpecial')}
          />
          Chef's Special
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={!!value.isLimited}
            onChange={() => toggle('isLimited')}
          />
          Limited
        </label>
      </div>
    </div>
  );
};

// =========================================================
// Customization editor — new shape with per-choice pricing
// =========================================================
const CustomizationEditor: React.FC<{
  options: CustomizationOption[];
  onChange: (next: CustomizationOption[]) => void;
}> = ({ options, onChange }) => {
  const addOption = () => {
    onChange([
      ...options,
      { name: '', choices: [{ name: '', price: 0 }], default: undefined },
    ]);
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  const updateOptionName = (idx: number, name: string) => {
    const next = [...options];
    next[idx] = { ...next[idx], name };
    onChange(next);
  };

  const addChoice = (idx: number) => {
    const next = [...options];
    next[idx] = {
      ...next[idx],
      choices: [...next[idx].choices, { name: '', price: 0 }],
    };
    onChange(next);
  };

  const removeChoice = (optIdx: number, choiceIdx: number) => {
    const next = [...options];
    const removedName = next[optIdx].choices[choiceIdx].name;
    next[optIdx] = {
      ...next[optIdx],
      choices: next[optIdx].choices.filter((_, i) => i !== choiceIdx),
      default:
        next[optIdx].default === removedName ? undefined : next[optIdx].default,
    };
    onChange(next);
  };

  const updateChoice = (
    optIdx: number,
    choiceIdx: number,
    field: 'name' | 'price',
    value: string | number,
  ) => {
    const next = [...options];
    const choices = [...next[optIdx].choices];
    const oldName = choices[choiceIdx].name;
    choices[choiceIdx] = { ...choices[choiceIdx], [field]: value };

    let newDefault = next[optIdx].default;
    if (field === 'name' && newDefault === oldName) {
      newDefault = String(value);
    }

    next[optIdx] = { ...next[optIdx], choices, default: newDefault };
    onChange(next);
  };

  const setDefault = (optIdx: number, choiceName: string) => {
    const next = [...options];
    next[optIdx] = { ...next[optIdx], default: choiceName || undefined };
    onChange(next);
  };

  return (
    <div className={styles.customizationSection}>
      <div className={styles.sectionHeader}>
        <h4>Customization</h4>
        <button
          type="button"
          className={styles.addCustomizationBtn}
          onClick={addOption}
        >
          + Add
        </button>
      </div>

      {options.length === 0 ? (
        <p className={styles.emptyCustomization}>
          No customization options yet. Click "+ Add Group" to create one.
        </p>
      ) : (
        <div className={styles.customizationList}>
          {options.map((option, optIdx) => (
            <div key={optIdx} className={styles.customizationItem}>
              <div className={styles.customizationHeader}>
                <button
                  type="button"
                  className={styles.removeCustomizationBtn}
                  onClick={() => removeOption(optIdx)}
                  aria-label="Remove option"
                >
                  <CloseIcon width={18} height={18} fill="#4d4d4d" />
                </button>
              </div>

              <div className={styles.formGroup}>
                <label>Option #{optIdx + 1} Name</label>
                <input
                  type="text"
                  value={option.name}
                  onChange={(e) => updateOptionName(optIdx, e.target.value)}
                  placeholder="e.g., Sauce, Size, Add-ons"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Choices</label>
                <div className={styles.choicesList}>
                  {option.choices.map((choice, choiceIdx) => (
                    <div key={choiceIdx} className={styles.choiceRow}>
                      <input
                        type="text"
                        value={choice.name}
                        onChange={(e) =>
                          updateChoice(
                            optIdx,
                            choiceIdx,
                            'name',
                            e.target.value,
                          )
                        }
                        placeholder={`Option ${choiceIdx + 1} name`}
                        className={styles.choiceNameInput}
                      />
                      <input
                        type="number"
                        value={choice.price || ''}
                        onChange={(e) =>
                          updateChoice(
                            optIdx,
                            choiceIdx,
                            'price',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="+Rs"
                        min="0"
                        step="1"
                        className={styles.choicePriceInput}
                      />
                      <button
                        type="button"
                        className={styles.removeChoiceBtn}
                        onClick={() => removeChoice(optIdx, choiceIdx)}
                        disabled={option.choices.length <= 1}
                        aria-label="Remove choice"
                      >
                        <CloseIcon width={18} height={18} fill="#a62d2d" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.addChoiceBtn}
                  onClick={() => addChoice(optIdx)}
                >
                  + Add Option
                </button>
              </div>

              <div className={styles.formGroup}>
                <label>Default Option</label>
                <select
                  value={option.default || ''}
                  onChange={(e) => setDefault(optIdx, e.target.value)}
                  className={styles.defaultSelect}
                >
                  <option value="">— None —</option>
                  {option.choices
                    .filter((c) => c.name.trim() !== '')
                    .map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                        {c.price > 0 ? ` (+Rs${c.price})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =========================================================
// Main Admin Panel
// =========================================================
const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { items, toggleStock, updateItem, addItem, deleteItem, reorderItems } =
    useMenu();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
  const [formError, setFormError] = useState('');
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});

  // Customization state for edit
  const [customizationOptions, setCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);

  // Add-new-item state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemForm, setNewItemForm] = useState<Partial<MenuItem>>({
    name: '',
    desc: '',
    price: 0,
    costPrice: 0,
    img: '',
    category: '',
    isVeg: false,
    isSpicy: false,
    isGlutenFree: false,
    preparationTime: '',
    calories: 0,
    rating: 0,
    reviewCount: 0,
    ingredients: [],
    nutritionalInfo: {},
    attributes: {},
    customizationOptions: [],
    inStock: true,
  });
  const [newCustomizationOptions, setNewCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);
  const [newIngredientsInput, setNewIngredientsInput] = useState('');

  // Ingredients input for edit
  const [ingredientsInput, setIngredientsInput] = useState('');

  // Drag & drop state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Confirm-dialog state for toggle-stock
  const [confirmToggle, setConfirmToggle] = useState<{
    itemId: number;
    action: 'in' | 'out';
    name: string;
  } | null>(null);

  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formSuccess, setFormSuccess] = useState('');
const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const [isSaving, setIsSaving] = useState(false);

  const canReorder = searchTerm === '' && filter === 'all';

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'inStock'
          ? item.inStock === true
          : filter === 'outOfStock'
          ? item.inStock === false
          : true;
      return matchesSearch && matchesFilter;
    });
  }, [items, searchTerm, filter]);

  const inStockCount = items.filter((item) => item.inStock === true).length;
  const outOfStockCount = items.filter((item) => item.inStock === false).length;

  // ============ TOGGLE STOCK ============

  const handleToggle = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setConfirmToggle({
      itemId,
      action: item.inStock ? 'out' : 'in',
      name: item.name,
    });
  };

  const confirmToggleStock = async () => {
    if (!confirmToggle) return;
    const { itemId } = confirmToggle;
    setConfirmToggle(null);
    await toggleStock(itemId);
  };

  // ============ EDIT ============

  const handleEditClick = (item: MenuItem) => {
    setEditingItem(item);
  setFormError('');
  setFormSuccess('');
  setInvalidFields({});
  setIsSaving(false);
    setEditForm({
      name: item.name,
      desc: item.desc,
      price: item.price,
      costPrice: item.costPrice,
      img: item.img,
      category: item.category,
      isVeg: item.isVeg,
      isSpicy: item.isSpicy,
      isGlutenFree: item.isGlutenFree,
      preparationTime: item.preparationTime,
      calories: item.calories,
      rating: item.rating,
      reviewCount: item.reviewCount,
      ingredients: item.ingredients,
      nutritionalInfo: item.nutritionalInfo,
      attributes: item.attributes || {},
      customizationOptions: item.customizationOptions || [],
    });
    setIngredientsInput(item.ingredients?.join(', ') || '');
    setCustomizationOptions(item.customizationOptions || []);
  };

  // Return a map of invalid fields → true, plus a summary message.
const validateRequired = (
  form: Partial<MenuItem>,
): { errors: Record<string, boolean>; message: string } => {
  const errors: Record<string, boolean> = {};

  if (!form.name || form.name.trim() === '') {
    errors.name = true;
  }
  if (
    form.price === undefined ||
    form.price === null ||
    Number.isNaN(form.price) ||
    Number(form.price) <= 0
  ) {
    errors.price = true;
  }
  if (!form.img || form.img.trim() === '') {
    errors.img = true;
  }

  const count = Object.keys(errors).length;
  let message = '';
  if (count === 1) {
    const field = Object.keys(errors)[0];
    message = `Please fill in the required field: ${prettyField(field)}`;
  } else if (count > 1) {
    message = `Please fill in all required fields (${count} missing).`;
  }
  return { errors, message };
};

const prettyField = (key: string): string => {
  switch (key) {
    case 'name':
      return 'Name';
    case 'price':
      return 'Price';
    case 'img':
      return 'Image';
    default:
      return key;
  }
};

// Show an error banner for 5 seconds, then clear it and the invalid highlights.
const showTemporaryError = (message: string) => {
  if (errorTimeoutRef.current) {
    clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = null;
  }
  if (successTimeoutRef.current) {
    clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = null;
  }
  setFormSuccess('');            // ✅ new — kill any success banner
  setFormError(message);
  errorTimeoutRef.current = setTimeout(() => {
    setFormError('');
    setInvalidFields({});
    errorTimeoutRef.current = null;
  }, 5000);
};

// Clean up on unmount

useEffect(() => {
  return () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
  };
}, []);

// Show a success banner, then reload after a short pause.
const showSuccessAndReload = (message: string, delayMs = 2000) => {
  if (successTimeoutRef.current) {
    clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = null;
  }
  // Clear any lingering error visuals so they don't overlap
  setFormError('');
  setInvalidFields({});
  setFormSuccess(message);

  successTimeoutRef.current = setTimeout(() => {
    window.location.reload();
  }, delayMs);
};

const handleSaveEdit = async () => {
  if (!editingItem || isSaving) return;

  // Reset prior banners before starting
  if (errorTimeoutRef.current) {
    clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = null;
  }
  if (successTimeoutRef.current) {
    clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = null;
  }
  setFormError('');
  setFormSuccess('');
  setInvalidFields({});

  // ---- Validation ----
  const { errors, message } = validateRequired(editForm);
  if (Object.keys(errors).length > 0) {
    setInvalidFields(errors);
    showTemporaryError(message);
    document
      .querySelector(`.${styles.editForm}`)
      ?.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  setIsSaving(true);

  try {
    // ---- Normalize optional fields ----
    const nz = (v: any): number | undefined => {
      if (v === undefined || v === null || v === '' || Number.isNaN(v)) {
        return undefined;
      }
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const s = (v: any): string | undefined => {
      if (v === undefined || v === null) return undefined;
      const str = String(v).trim();
      return str === '' ? undefined : str;
    };

    const cleaned: Partial<MenuItem> = {
      name: editForm.name!.trim(),
      desc: editForm.desc ?? '',
      price: editForm.price,
      costPrice: nz(editForm.costPrice),
      img: editForm.img,
      category: s(editForm.category),
      isVeg: editForm.isVeg ?? false,
      isSpicy: editForm.isSpicy ?? false,
      isGlutenFree: editForm.isGlutenFree ?? false,
      preparationTime: s(editForm.preparationTime),
      calories: nz(editForm.calories),
      rating: nz(editForm.rating),
      reviewCount: nz(editForm.reviewCount),
      ingredients:
        editForm.ingredients && editForm.ingredients.length > 0
          ? editForm.ingredients
          : undefined,
      nutritionalInfo:
        editForm.nutritionalInfo &&
        Object.values(editForm.nutritionalInfo).some(
          (v) => v !== undefined && v !== null && String(v).trim() !== '',
        )
          ? editForm.nutritionalInfo
          : undefined,
      attributes:
        editForm.attributes &&
        Object.values(editForm.attributes).some(Boolean)
          ? editForm.attributes
          : undefined,
      customizationOptions:
        customizationOptions.length > 0 ? customizationOptions : undefined,
    };

    await updateItem(editingItem.id, cleaned);

    // ✅ Success — banner for 2s, then reload.
    // Note: on success we intentionally do NOT reset isSaving; the page
    // is about to unload. Keeping the button disabled prevents a second click
    // during the 2-second banner window.
    showSuccessAndReload('Item updated successfully!');
  } catch (err) {
    console.error('Save edit failed:', err);
    showTemporaryError('Failed to update menu item. Please try again.');
    setIsSaving(false);
  }
};

  const handleDeleteItem = async () => {
    if (!editingItem) return;

    if (
      window.confirm(
        `Are you sure you want to delete "${editingItem.name}"? This action cannot be undone.`,
      )
    ) {
      try {
        await deleteItem(editingItem.id);
        setEditingItem(null);
        setEditForm({});
        setCustomizationOptions([]);
        setIngredientsInput('');
      } catch {
        setFormError('Failed to delete menu item');
      }
    }
  };

  const handleCancelEdit = () => {
    if (isSaving) return;         // ✅ guard: don't allow closing mid-save
  setEditingItem(null);
  setFormError('');
  setFormSuccess('');
  setInvalidFields({});
  setIsSaving(false);
    setCustomizationOptions([]);
    setIngredientsInput('');
  };

  // ============ ADD NEW ============

  const handleAddNewItem = () => {
    setIsAddingNew(true);
  setFormError('');
  setFormSuccess('');
  setInvalidFields({});
  setIsSaving(false);
    setNewItemForm({
      name: '',
      desc: '',
      price: 0,
      costPrice: 0,
      img: '',
      category: '',
      isVeg: false,
      isSpicy: false,
      isGlutenFree: false,
      preparationTime: '',
      calories: 0,
      rating: 0,
      reviewCount: 0,
      ingredients: [],
      nutritionalInfo: {},
      attributes: {},
      customizationOptions: [],
      inStock: true,
    });
    setNewIngredientsInput('');
    setNewCustomizationOptions([]);
  };

const handleSaveNewItem = async () => {
  if (isSaving) return;

  // Reset prior banners
  if (errorTimeoutRef.current) {
    clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = null;
  }
  if (successTimeoutRef.current) {
    clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = null;
  }
  setFormError('');
  setFormSuccess('');
  setInvalidFields({});

  // ---- Validation ----
  const { errors, message } = validateRequired(newItemForm);
  if (Object.keys(errors).length > 0) {
    setInvalidFields(errors);
    showTemporaryError(message);
    document
      .querySelector(`.${styles.editForm}`)
      ?.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  setIsSaving(true);

  try {
    // ---- Normalize optional fields ----
    const nz = (v: any): number | undefined => {
      if (v === undefined || v === null || v === '' || Number.isNaN(v)) {
        return undefined;
      }
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const s = (v: any): string | undefined => {
      if (v === undefined || v === null) return undefined;
      const str = String(v).trim();
      return str === '' ? undefined : str;
    };

    const newItem: Omit<MenuItem, 'id'> = {
      name: newItemForm.name!.trim(),
      desc: newItemForm.desc ?? '',
      price: newItemForm.price!,
      costPrice: nz(newItemForm.costPrice),
      img: newItemForm.img!,
      category: s(newItemForm.category),
      isVeg: newItemForm.isVeg ?? false,
      isSpicy: newItemForm.isSpicy ?? false,
      isGlutenFree: newItemForm.isGlutenFree ?? false,
      preparationTime: s(newItemForm.preparationTime),
      calories: nz(newItemForm.calories),
      rating: nz(newItemForm.rating),
      reviewCount: nz(newItemForm.reviewCount),
      ingredients:
        newItemForm.ingredients && newItemForm.ingredients.length > 0
          ? newItemForm.ingredients
          : undefined,
      nutritionalInfo:
        newItemForm.nutritionalInfo &&
        Object.values(newItemForm.nutritionalInfo).some(
          (v) => v !== undefined && v !== null && String(v).trim() !== '',
        )
          ? newItemForm.nutritionalInfo
          : undefined,
      attributes:
        newItemForm.attributes &&
        Object.values(newItemForm.attributes).some(Boolean)
          ? newItemForm.attributes
          : undefined,
      customizationOptions:
        newCustomizationOptions.length > 0
          ? newCustomizationOptions
          : undefined,
      inStock:
        newItemForm.inStock !== undefined ? newItemForm.inStock : true,
    };

    await addItem(newItem);

    // ✅ Success — banner then reload. isSaving stays true on purpose.
    showSuccessAndReload('Item added successfully!');
  } catch (err) {
    console.error('Save new item failed:', err);
    showTemporaryError('Failed to add menu item. Please try again.');
    setIsSaving(false);
  }
};

  const handleCancelNewItem = () => {
    if (isSaving) return;         // ✅ guard
  setIsAddingNew(false);
  setFormError('');
  setFormSuccess('');
  setInvalidFields({});
  setIsSaving(false);
    setNewIngredientsInput('');
    setNewCustomizationOptions([]);
  };

  // ============ DRAG & DROP ============

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragOverId) setDragOverId(id);
  };

  const handleDragLeave = () => setDragOverId(null);

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDragOverId(null);

    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const currentOrder = filteredItems.map((i) => i.id);
    const fromIndex = currentOrder.indexOf(draggedId);
    const toIndex = currentOrder.indexOf(targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedId);

    setDraggedId(null);
    setIsReordering(true);
    try {
      await reorderItems(newOrder);
    } catch (err) {
      console.error('Reorder failed:', err);
      setFormError('Failed to save the new order. Please try again.');
    } finally {
      setIsReordering(false);
    }
  };

  // ============ RENDER ============

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Menu Items</h2>
          <button className={styles.addNewBtn} onClick={handleAddNewItem}>
            + Add New Item
          </button>
          <button className={styles.closeBtn} onClick={onClose}>
            <CloseIcon width={18} height={18} fill="#4d4d4d" />
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>All Items</span>
            <span className={styles.statValue}>{items.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active</span>
            <span className={`${styles.statValue} ${styles.inStock}`}>
              {inStockCount}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>InActive</span>
            <span className={`${styles.statValue} ${styles.outOfStock}`}>
              {outOfStockCount}
            </span>
          </div>
        </div>

        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className={styles.filterSelect}
          >
            <option value="all">All Items</option>
            <option value="inStock">In Stock</option>
            <option value="outOfStock">Out of Stock</option>
          </select>
        </div>

        {!canReorder && (
          <div className={styles.reorderHint}>
            Clear search / filter to reorder items by dragging
          </div>
        )}

        <div className={styles.itemList}>
          {isReordering && (
            <div className={styles.reorderingBanner}>Saving order...</div>
          )}

          {filteredItems.map((item) => {
            const isDragging = draggedId === item.id;
            const isDropTarget =
              dragOverId === item.id && draggedId !== item.id;

            return (
              <div
                key={item.id}
                className={[
                  styles.itemRow,
                  isDragging ? styles.dragging : '',
                  isDropTarget ? styles.dropTarget : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable={canReorder}
                onDragStart={
                  canReorder ? (e) => handleDragStart(e, item.id) : undefined
                }
                onDragOver={
                  canReorder ? (e) => handleDragOver(e, item.id) : undefined
                }
                onDragLeave={canReorder ? handleDragLeave : undefined}
                onDrop={canReorder ? (e) => handleDrop(e, item.id) : undefined}
                onDragEnd={canReorder ? handleDragEnd : undefined}
              >
                {canReorder && (
                  <div
                    className={styles.dragHandle}
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                  >
                    <span className={styles.dragDots}></span>
                  </div>
                )}

                <div className={styles.itemInfo}>
                  <img
                    src={item.img}
                    alt={item.name}
                    className={styles.itemImage}
                  />
                  <div>
                    <div className={styles.itemName}>{item.name}</div>
                  </div>
                </div>

                <div className={styles.itemStatus}>
                  <div className={styles.stock_wrap}>
                    <span
                      className={
                        item.inStock
                          ? styles.inStockBadge
                          : styles.outOfStockBadge
                      }
                    >
                      {item.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  <button
                    className={`${styles.toggleBtn} ${
                      !item.inStock ? styles.outOfStockBtn : ''
                    }`}
                    onClick={() => handleToggle(item.id)}
                  >
                    {item.inStock ? 'Mark Out of Stock' : 'Restock'}
                  </button>
                  <button
                    className={styles.editBtn}
                    onClick={() => handleEditClick(item)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className={styles.emptyState}>
              No items found matching your criteria
            </div>
          )}
        </div>

        {/* ========== ADD NEW ITEM MODAL ========== */}
        {isAddingNew && (
          <div className={styles.editModal}>
            <div className={styles.editModalContent}>
              <div className={styles.editModalHeader}>
                <h3>Add New Menu Item</h3>
                <button
                  className={styles.closeBtn}
                  onClick={handleCancelNewItem}
                >
                  <CloseIcon width={18} height={18} fill="#4d4d4d" />
                </button>
              </div>

              <div className={styles.editForm}>
                {formError && (
                  <div className={styles.formError}>{formError}</div>
                )}

                {formSuccess && (
  <div className={styles.formSuccess}>{formSuccess}</div>
)}

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Name *</label>
                    <input
  type="text"
  value={newItemForm.name || ''}
  onChange={(e) => {
    setNewItemForm({ ...newItemForm, name: e.target.value });
    if (invalidFields.name) {
      setInvalidFields((prev) => ({ ...prev, name: false }));
    }
  }}
  placeholder="Item name"
  required
  className={invalidFields.name ? styles.inputError : ''}
/>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <input
                      type="text"
                      value={newItemForm.category || ''}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          category: e.target.value,
                        })
                      }
                      placeholder="Category"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={newItemForm.desc || ''}
                    onChange={(e) =>
                      setNewItemForm({ ...newItemForm, desc: e.target.value })
                    }
                    placeholder="Item description"
                    rows={3}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Price (Rs) *</label>
                    <input
  type="number"
  value={newItemForm.price || ''}
  onChange={(e) => {
    setNewItemForm({
      ...newItemForm,
      price: parseFloat(e.target.value) || 0,
    });
    if (invalidFields.price) {
      setInvalidFields((prev) => ({ ...prev, price: false }));
    }
  }}
  placeholder="Price"
  required
  min="0"
  step="1"
  className={invalidFields.price ? styles.inputError : ''}
/>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Cost Price (Rs)</label>
                    <input
                      type="number"
                      value={newItemForm.costPrice || ''}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          costPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="Cost price"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Image *</label>
                  <div className={invalidFields.img ? styles.imageUploadError : ''}>
                    <ImageUpload
                      currentImage={newItemForm.img || ''}
                      onImageUploaded={(url) => {
                        setNewItemForm({ ...newItemForm, img: url });
                        if (invalidFields.img) {
                          setInvalidFields((prev) => ({ ...prev, img: false }));
                        }
                      }}
                      label="Upload Item Image"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Preparation Time</label>
                    <input
                      type="text"
                      value={newItemForm.preparationTime || ''}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          preparationTime: e.target.value,
                        })
                      }
                      placeholder="e.g., 15-20 mins"
                    />
                  </div>
                  <div className={styles.checkboxRow}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newItemForm.isVeg || false}
                        onChange={(e) =>
                          setNewItemForm({
                            ...newItemForm,
                            isVeg: e.target.checked,
                          })
                        }
                      />
                      Vegetarian
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newItemForm.isSpicy || false}
                        onChange={(e) =>
                          setNewItemForm({
                            ...newItemForm,
                            isSpicy: e.target.checked,
                          })
                        }
                      />
                      Spicy
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={newItemForm.isGlutenFree || false}
                        onChange={(e) =>
                          setNewItemForm({
                            ...newItemForm,
                            isGlutenFree: e.target.checked,
                          })
                        }
                      />
                      Gluten Free
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={
                          newItemForm.inStock !== undefined
                            ? newItemForm.inStock
                            : true
                        }
                        onChange={(e) =>
                          setNewItemForm({
                            ...newItemForm,
                            inStock: e.target.checked,
                          })
                        }
                      />
                      In Stock
                    </label>
                  </div>
                </div>

                <BadgeSelector
                  value={newItemForm.attributes}
                  onChange={(next) =>
                    setNewItemForm({ ...newItemForm, attributes: next })
                  }
                />

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Rating</label>
                    <input
                      type="number"
                      value={newItemForm.rating || ''}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          rating: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0-5"
                      min="0"
                      max="5"
                      step="0.1"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Review Count</label>
                    <input
                      type="number"
                      value={newItemForm.reviewCount || ''}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          reviewCount: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Number of reviews"
                      min="0"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Calories</label>
                    <input
                      type="number"
                      value={newItemForm.calories || ''}
                      onChange={(e) =>
                        setNewItemForm({
                          ...newItemForm,
                          calories: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Calories"
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Ingredients (comma separated)</label>
                    <input
                      type="text"
                      value={newIngredientsInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewIngredientsInput(value);
                        const ingredientsArray = value
                          ? value
                              .split(',')
                              .map((s) => s.trim())
                              .filter((s) => s !== '')
                          : [];
                        setNewItemForm({
                          ...newItemForm,
                          ingredients: ingredientsArray,
                        });
                      }}
                      placeholder="Chicken, Cream, Spices"
                    />
                  </div>
                </div>

                <CustomizationEditor
                  options={newCustomizationOptions}
                  onChange={(next) => {
                    setNewCustomizationOptions(next);
                    setNewItemForm({
                      ...newItemForm,
                      customizationOptions: next,
                    });
                  }}
                />

                <div className={styles.formActions}>
                  <button
  className={styles.cancelBtn}
  onClick={handleCancelNewItem}
  disabled={isSaving}
>
  Cancel
</button>
                  <button
  className={styles.saveBtn}
  onClick={handleSaveNewItem}
  disabled={isSaving}
>
  {isSaving ? 'Saving...' : 'Add Item'}
</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== EDIT ITEM MODAL ========== */}
        {editingItem && (
          <div className={styles.editModal}>
            <div className={styles.editModalContent}>
              <div className={styles.editModalHeader}>
                <h3>Edit Menu Item</h3>
                <button
                  className={styles.closeBtn}
                  onClick={handleCancelEdit}
                >
                  <CloseIcon width={18} height={18} fill="#4d4d4d" />
                </button>
              </div>

              <div className={styles.editForm}>
                {formError && (
                  <div className={styles.formError}>{formError}</div>
                )}

                {formSuccess && (
  <div className={styles.formSuccess}>{formSuccess}</div>
)}

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Name *</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => {
                        setEditForm({ ...editForm, name: e.target.value });
                        if (invalidFields.name) {
                          setInvalidFields((prev) => ({ ...prev, name: false }));
                        }
                      }}
                      placeholder="Item name"
                      required
                      className={invalidFields.name ? styles.inputError : ''}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <input
                      type="text"
                      value={editForm.category || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, category: e.target.value })
                      }
                      placeholder="Category"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={editForm.desc || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, desc: e.target.value })
                    }
                    placeholder="Item description"
                    rows={3}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Price (Rs) *</label>
                    <input
                      type="number"
                      value={editForm.price || ''}
                      onChange={(e) => {
                        setEditForm({
                          ...editForm,
                          price: parseFloat(e.target.value) || 0,
                        });
                        if (invalidFields.price) {
                          setInvalidFields((prev) => ({ ...prev, price: false }));
                        }
                      }}
                      placeholder="Price"
                      required
                      min="0"
                      step="1"
                      className={invalidFields.price ? styles.inputError : ''}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Cost Price (Rs)</label>
                    <input
                      type="number"
                      value={editForm.costPrice || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          costPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="Cost price"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Image *</label>
                  <div className={invalidFields.img ? styles.imageUploadError : ''}>
                    <ImageUpload
                      currentImage={editForm.img || ''}
                      onImageUploaded={(url) => {
                        setEditForm({ ...editForm, img: url });
                        if (invalidFields.img) {
                          setInvalidFields((prev) => ({ ...prev, img: false }));
                        }
                      }}
                      label="Upload Item Image"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Preparation Time</label>
                    <input
                      type="text"
                      value={editForm.preparationTime || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          preparationTime: e.target.value,
                        })
                      }
                      placeholder="e.g., 15-20 mins"
                    />
                  </div>
                  <div className={styles.checkboxRow}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editForm.isVeg || false}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            isVeg: e.target.checked,
                          })
                        }
                      />
                      Vegetarian
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editForm.isSpicy || false}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            isSpicy: e.target.checked,
                          })
                        }
                      />
                      Spicy
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={editForm.isGlutenFree || false}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            isGlutenFree: e.target.checked,
                          })
                        }
                      />
                      Gluten Free
                    </label>
                  </div>
                </div>

                <BadgeSelector
                  value={editForm.attributes}
                  onChange={(next) =>
                    setEditForm({ ...editForm, attributes: next })
                  }
                />

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Rating</label>
                    <input
                      type="number"
                      value={editForm.rating || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          rating: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0-5"
                      min="0"
                      max="5"
                      step="0.1"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Review Count</label>
                    <input
                      type="number"
                      value={editForm.reviewCount || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          reviewCount: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Number of reviews"
                      min="0"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Calories</label>
                    <input
                      type="number"
                      value={editForm.calories || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          calories: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="Calories"
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Ingredients (comma separated)</label>
                    <input
                      type="text"
                      value={ingredientsInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setIngredientsInput(value);
                        const ingredientsArray = value
                          ? value
                              .split(',')
                              .map((s) => s.trim())
                              .filter((s) => s !== '')
                          : [];
                        setEditForm({
                          ...editForm,
                          ingredients: ingredientsArray,
                        });
                      }}
                      placeholder="Chicken, Cream, Spices"
                    />
                  </div>
                </div>

                <CustomizationEditor
                  options={customizationOptions}
                  onChange={(next) => {
                    setCustomizationOptions(next);
                    setEditForm({ ...editForm, customizationOptions: next });
                  }}
                />

                <div className={styles.formActions}>
                  <button
  className={styles.deleteBtn}
  onClick={handleDeleteItem}
  disabled={isSaving}
>
  Delete
</button>
                  <button
  className={styles.saveBtn}
  onClick={handleSaveEdit}
  disabled={isSaving}
>
  {isSaving ? 'Saving...' : 'Save Changes'}
</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== CONFIRM TOGGLE STOCK ========== */}
        {confirmToggle && (
          <div
            className={styles.confirmOverlay}
            onClick={() => setConfirmToggle(null)}
          >
            <div
              className={styles.confirmDialog}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.confirmHeader}>
                <h3>
                  {confirmToggle.action === 'out'
                    ? 'Mark Out of Stock'
                    : 'Restock Item'}
                </h3>
              </div>
              <div className={styles.confirmBody}>
                <p>
                  {confirmToggle.action === 'out'
                    ? `Mark "${confirmToggle.name}" as Out of Stock?`
                    : `Restock "${confirmToggle.name}"?`}
                </p>
              </div>
              <div className={styles.confirmFooter}>
                <button
                  className={styles.confirmCancelBtn}
                  onClick={() => setConfirmToggle(null)}
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmActionBtn}
                  onClick={confirmToggleStock}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;