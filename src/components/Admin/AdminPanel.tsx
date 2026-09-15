// components/Admin/AdminPanel.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MenuItem,
  CustomizationOption,
  DEFAULT_FORM_SCHEMA,
} from '../../types';
import { useMenu } from '../../hooks/useMenu';
import { useTenant } from '../../contexts/TenantContext';
import styles from './AdminPanel.module.scss';
import { CloseIcon } from '../../assets/svgs';
import BadgeSelector from './BadgeSelector';
import CustomizationEditor from './CustomizationEditor';
import DynamicField from './DynamicField';
import FormBuilder from './FormBuilder';

interface AdminPanelProps {
  onClose: () => void;
}

const UNCATEGORIZED = 'Uncategorized';

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { tenant } = useTenant();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;

  const { items, toggleStock, updateItem, addItem, deleteItem, reorderItems } =
    useMenu();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [customizationOptions, setCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);
  const [ingredientsInput, setIngredientsInput] = useState('');

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemForm, setNewItemForm] = useState<Partial<MenuItem>>({
    name: '',
    desc: '',
    price: 0,
    costPrice: 0,
    discount: 0,
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

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Collapsible categories
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );
  const didInitCollapse = useRef(false);

  const [confirmToggle, setConfirmToggle] = useState<{
    itemId: number;
    action: 'in' | 'out';
    name: string;
  } | null>(null);

  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);

  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canReorder = searchTerm === '' && filter === 'all';

  // Schema allow-list for categories
  const schemaCategorySet = useMemo(() => {
    const catField = schema.fields.find((f) => f.key === 'category');
    return new Set<string>(
      (catField?.options ?? []).map((s) => s.trim()).filter(Boolean),
    );
  }, [schema]);

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

  // ---------- Grouped categories (schema-ordered) ----------
  const categoryGroups = useMemo(() => {
    const catField = schema.fields.find((f) => f.key === 'category');
    const categoryOrder = (catField?.options ?? [])
      .map((s) => s.trim())
      .filter(Boolean);

    const orderIndex = new Map<string, number>();
    categoryOrder.forEach((c, i) => orderIndex.set(c, i));
    const UNCATEGORIZED_INDEX = Number.MAX_SAFE_INTEGER;

    const groupsMap = new Map<string, MenuItem[]>();
    filteredItems.forEach((item) => {
      const raw = (item.category ?? '').trim();
      const key = raw && schemaCategorySet.has(raw) ? raw : UNCATEGORIZED;
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(item);
    });

    return Array.from(groupsMap.entries())
      .map(([category, list]) => ({ category, items: list }))
      .sort((a, b) => {
        const ai = orderIndex.get(a.category) ?? UNCATEGORIZED_INDEX;
        const bi = orderIndex.get(b.category) ?? UNCATEGORIZED_INDEX;
        return ai - bi;
      });
  }, [filteredItems, schemaCategorySet, schema]);

  // Collapse everything on first load
  useEffect(() => {
    if (didInitCollapse.current) return;
    if (categoryGroups.length === 0) return;
    setCollapsedCategories(new Set(categoryGroups.map((g) => g.category)));
    didInitCollapse.current = true;
  }, [categoryGroups]);

  // ============ HELPERS ============

  const prettyField = (key: string): string => {
    const fromSchema = schema.fields.find((f) => f.key === key);
    if (fromSchema) return fromSchema.label;
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

  const validateRequired = (
    form: Partial<MenuItem>,
  ): { errors: Record<string, boolean>; message: string } => {
    const errors: Record<string, boolean> = {};

    if (!form.name || form.name.trim() === '') errors.name = true;

    if (
      form.price === undefined ||
      form.price === null ||
      Number.isNaN(form.price) ||
      Number(form.price) <= 0
    ) {
      errors.price = true;
    }

    if (!form.img || form.img.trim() === '') errors.img = true;

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

  const showTemporaryError = (message: string) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setFormSuccess('');
    setFormError(message);
    errorTimeoutRef.current = setTimeout(() => {
      setFormError('');
      setInvalidFields({});
      errorTimeoutRef.current = null;
    }, 5000);
  };

  const showSuccess = (message: string, delayMs = 1200) => {
  if (successTimeoutRef.current) {
    clearTimeout(successTimeoutRef.current);
    successTimeoutRef.current = null;
  }
  setFormError('');
  setInvalidFields({});
  setFormSuccess(message);

  // Auto-clear the success banner after the delay
  successTimeoutRef.current = setTimeout(() => {
    setFormSuccess('');
    successTimeoutRef.current = null;
  }, delayMs);
};

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

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

    const sanitizedCategory =
      item.category && schemaCategorySet.has(item.category.trim())
        ? item.category
        : '';

    const form: Record<string, any> = {
      name: item.name,
      desc: item.desc,
      price: item.price,
      costPrice: item.costPrice,
      discount: item.discount ?? 0,
      img: item.img,
      category: sanitizedCategory,
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
    };

    schema.fields
      .filter((f) => !f.builtin)
      .forEach((f) => {
        form[f.key] = item.attributes?.[f.key] ?? '';
      });

    setEditForm(form as Partial<MenuItem>);
    setIngredientsInput(item.ingredients?.join(', ') || '');
    setCustomizationOptions(item.customizationOptions || []);
  };

  /**
   * Applies the discount ↔ costPrice mutual exclusion to a form patch.
   * If discount > 0 → costPrice = 0. If costPrice > 0 → discount = 0.
   */
  const applyDiscountMutex = (
    patch: Record<string, any>,
  ): Record<string, any> => {
    if ('discount' in patch) {
      const d = Number(patch.discount) || 0;
      if (d > 0) patch.costPrice = 0;
    }
    if ('costPrice' in patch) {
      const c = Number(patch.costPrice) || 0;
      if (c > 0) patch.discount = 0;
    }
    return patch;
  };

  const handleSaveEdit = async () => {
    if (!editingItem || isSaving) return;

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

      const customAttributes: Record<string, any> = {
        ...(editForm.attributes as Record<string, any> | undefined),
      };
      schema.fields
        .filter((f) => !f.builtin && f.enabled)
        .forEach((field) => {
          const value = (editForm as any)[field.key];
          if (value !== undefined && value !== null && value !== '') {
            customAttributes[field.key] = value;
          } else {
            delete customAttributes[field.key];
          }
        });

      const cleanedCategory =
        editForm.category &&
        schemaCategorySet.has(String(editForm.category).trim())
          ? String(editForm.category).trim()
          : undefined;

      // ---- discount + costPrice mutual exclusion at save time ----
      const rawDiscount = Number(editForm.discount) || 0;
      const discount =
        rawDiscount > 0 && rawDiscount <= 100 ? rawDiscount : 0;

      const costPrice =
        discount > 0 ? undefined : nz(editForm.costPrice);

      const cleaned: Partial<MenuItem> = {
        name: editForm.name!.trim(),
        desc: editForm.desc ?? '',
        price: editForm.price,
        discount,
        costPrice,
        img: editForm.img,
        category: cleanedCategory,
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
          Object.keys(customAttributes).length > 0
            ? customAttributes
            : undefined,
        customizationOptions:
          customizationOptions.length > 0 ? customizationOptions : undefined,
      };

      await updateItem(editingItem.id, cleaned);
showSuccess('Item updated successfully!');

// Close the modal and clear edit state so the user sees the refreshed list
setTimeout(() => {
  setEditingItem(null);
  setEditForm({});
  setCustomizationOptions([]);
  setIngredientsInput('');
}, 900);
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
    if (isSaving) return;
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
      discount: 0,
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

      const customAttributes: Record<string, any> = {
        ...(newItemForm.attributes as Record<string, any> | undefined),
      };
      schema.fields
        .filter((f) => !f.builtin && f.enabled)
        .forEach((field) => {
          const value = (newItemForm as any)[field.key];
          if (value !== undefined && value !== null && value !== '') {
            customAttributes[field.key] = value;
          }
        });

      const cleanedCategory =
        newItemForm.category &&
        schemaCategorySet.has(String(newItemForm.category).trim())
          ? String(newItemForm.category).trim()
          : undefined;

      const rawDiscount = Number(newItemForm.discount) || 0;
      const discount =
        rawDiscount > 0 && rawDiscount <= 100 ? rawDiscount : 0;

      const costPrice =
        discount > 0 ? undefined : nz(newItemForm.costPrice);

      const newItem: Omit<MenuItem, 'id'> = {
        name: newItemForm.name!.trim(),
        desc: newItemForm.desc ?? '',
        price: newItemForm.price!,
        discount,
        costPrice,
        img: newItemForm.img!,
        category: cleanedCategory,
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
          Object.keys(customAttributes).length > 0
            ? customAttributes
            : undefined,
        customizationOptions:
          newCustomizationOptions.length > 0
            ? newCustomizationOptions
            : undefined,
        inStock:
          newItemForm.inStock !== undefined ? newItemForm.inStock : true,
      };

      await addItem(newItem);
showSuccess('Item added successfully!');

// Close the Add modal so the user sees the new item in the list
setTimeout(() => {
  setIsAddingNew(false);
  setNewIngredientsInput('');
  setNewCustomizationOptions([]);
}, 900);
    } catch (err) {
      console.error('Save new item failed:', err);
      showTemporaryError('Failed to add menu item. Please try again.');
      setIsSaving(false);
    }
  };

  const handleCancelNewItem = () => {
    if (isSaving) return;
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

  // ============ CATEGORY COLLAPSE ============

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // ============ RENDER ============

  const enabledFields = schema.fields.filter((f) => f.enabled);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Menu Items</h2>
          <button className={styles.addNewBtn} onClick={handleAddNewItem}>
            + Add New Item
          </button>
          <button
            className={styles.addNewBtn}
            onClick={() => setIsFormBuilderOpen(true)}
            style={{ marginLeft: 8 }}
          >
            Edit Fields
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

          {categoryGroups.length === 0 ? (
            <div className={styles.emptyState}>
              No items found matching your criteria
            </div>
          ) : (
            (() => {
              const forceOpen = searchTerm.trim() !== '';

              return categoryGroups.map((group) => {
                const isCollapsed =
                  !forceOpen && collapsedCategories.has(group.category);

                return (
                  <div key={group.category} className={styles.categoryGroup}>
                    <button
                      type="button"
                      className={styles.categoryHeader}
                      onClick={() => {
                        if (forceOpen) return;
                        toggleCategory(group.category);
                      }}
                      aria-expanded={!isCollapsed}
                    >
                      <span
                        className={`${styles.chevron} ${
                          isCollapsed ? '' : styles.chevronOpen
                        }`}
                        aria-hidden
                      >
                        ▸
                      </span>
                      <span className={styles.categoryGroupName}>
                        {group.category}
                      </span>
                      <span className={styles.categoryGroupCount}>
                        {group.items.length}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className={styles.categoryGroupBody}>
                        {group.items.map((item) => {
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
                                canReorder
                                  ? (e) => handleDragStart(e, item.id)
                                  : undefined
                              }
                              onDragOver={
                                canReorder
                                  ? (e) => handleDragOver(e, item.id)
                                  : undefined
                              }
                              onDragLeave={
                                canReorder ? handleDragLeave : undefined
                              }
                              onDrop={
                                canReorder
                                  ? (e) => handleDrop(e, item.id)
                                  : undefined
                              }
                              onDragEnd={
                                canReorder ? handleDragEnd : undefined
                              }
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
                                  <div className={styles.itemName}>
                                    {item.name}
                                    {item.discount && item.discount > 0 && (
                                      <span className={styles.discountBadge}>
                                        −{item.discount}%
                                      </span>
                                    )}
                                  </div>
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
                                    {item.inStock ? 'In' : 'Out'}
                                  </span>
                                </div>
                                <button
                                  className={`${styles.toggleBtn} ${
                                    !item.inStock
                                      ? styles.outOfStockBtn
                                      : ''
                                  }`}
                                  onClick={() => handleToggle(item.id)}
                                >
                                  {item.inStock
                                    ? 'Mark Out of Stock'
                                    : 'Restock'}
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
                      </div>
                    )}
                  </div>
                );
              });
            })()
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

                {enabledFields.map((field) => (
                  <DynamicField
                    key={field.key}
                    field={field}
                    value={(newItemForm as any)[field.key]}
                    onChange={(v) => {
                      setNewItemForm((prev) =>
                        applyDiscountMutex({ ...prev, [field.key]: v }),
                      );
                      if (invalidFields[field.key]) {
                        setInvalidFields((prev) => ({
                          ...prev,
                          [field.key]: false,
                        }));
                      }
                    }}
                    invalid={!!invalidFields[field.key]}
                    onImageUploaded={
                      field.key === 'img'
                        ? (url) =>
                            setNewItemForm({ ...newItemForm, img: url })
                        : undefined
                    }
                    ingredientsInput={
                      field.key === 'ingredients'
                        ? newIngredientsInput
                        : undefined
                    }
                    onIngredientsInputChange={
                      field.key === 'ingredients'
                        ? setNewIngredientsInput
                        : undefined
                    }
                  />
                ))}

                <BadgeSelector
                  value={newItemForm.attributes}
                  onChange={(next) =>
                    setNewItemForm({ ...newItemForm, attributes: next })
                  }
                />

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

                {enabledFields.map((field) => (
                  <DynamicField
                    key={field.key}
                    field={field}
                    value={(editForm as any)[field.key]}
                    onChange={(v) => {
                      setEditForm((prev) =>
                        applyDiscountMutex({ ...prev, [field.key]: v }),
                      );
                      if (invalidFields[field.key]) {
                        setInvalidFields((prev) => ({
                          ...prev,
                          [field.key]: false,
                        }));
                      }
                    }}
                    invalid={!!invalidFields[field.key]}
                    onImageUploaded={
                      field.key === 'img'
                        ? (url) => setEditForm({ ...editForm, img: url })
                        : undefined
                    }
                    ingredientsInput={
                      field.key === 'ingredients'
                        ? ingredientsInput
                        : undefined
                    }
                    onIngredientsInputChange={
                      field.key === 'ingredients'
                        ? setIngredientsInput
                        : undefined
                    }
                  />
                ))}

                <BadgeSelector
                  value={editForm.attributes}
                  onChange={(next) =>
                    setEditForm({ ...editForm, attributes: next })
                  }
                />

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

        {/* ========== FORM BUILDER ========== */}
        {isFormBuilderOpen && (
          <FormBuilder onClose={() => setIsFormBuilderOpen(false)} />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;