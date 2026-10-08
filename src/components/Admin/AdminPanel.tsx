// src/components/Admin/AdminPanel.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MenuItem,
  CustomizationOption,
  DEFAULT_FORM_SCHEMA,
  normalizeOptions,
} from '../../types';
import { useMenu } from '../../hooks/useMenu';
import { useTenant } from '../../contexts/TenantContext';
import { usePlan } from '../../hooks/usePlan';
import { useAuth } from '../../hooks/useAuth';
import {
  Modal,
  ConfirmDialog,
  Button,
  Input,
  Banner,
  Accordion,
  Badge,
  EmptyState,
} from '../ui';
import { getStoreLabels } from '../../utils/storeLabels';
import { getCategoryDefaults } from '../../data/storeDefaults';
import { menuService } from '../../services/menu.service';
import BadgeSelector from './BadgeSelector';
import CustomizationEditor from './CustomizationEditor';
import DynamicField from './DynamicField';
import FormBuilder from './FormBuilder';
import { DownloadIcon } from '../../assets/svgs';
import local from './AdminPanel.module.scss';

interface AdminPanelProps {
  onClose: () => void;
}

type MenuItemFormValue = Omit<Partial<MenuItem>, 'img'> & {
  img?: string | string[];
};

const UNCATEGORIZED = 'Uncategorized';

const emptyNewItem: MenuItemFormValue = {
  name: '',
  desc: '',
  price: 0,
  costPrice: 0,
  discount: 0,
  img: [],
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
};

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { tenant } = useTenant();
  const plan = usePlan();
  const { isAdmin } = useAuth();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;
  const labels = getStoreLabels(tenant?.storeCategory);

  const {
    items,
    toggleStock,
    updateItem,
    addItem,
    deleteItem,
    reorderItems,
  } = useMenu();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<MenuItemFormValue>({});
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);

  const [customizationOptions, setCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);
  const [ingredientsInput, setIngredientsInput] = useState('');

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemForm, setNewItemForm] =
    useState<MenuItemFormValue>(emptyNewItem);
  const [newCustomizationOptions, setNewCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);
  const [newIngredientsInput, setNewIngredientsInput] = useState('');

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const didInitCollapse = useRef(false);

  const [confirmToggle, setConfirmToggle] = useState<{
    itemId: number;
    action: 'in' | 'out';
    name: string;
  } | null>(null);

  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);

  // ---- Replace-menu-with-samples flow ----
  const [isReplacing, setIsReplacing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag only allowed for owners, and only on an un-filtered view.
  const canReorder = isAdmin && searchTerm === '' && filter === 'all';

  // -------- Schema helpers --------
  const schemaCategorySet = useMemo(() => {
    const catField = schema.fields.find((f) => f.key === 'category');
    return new Set<string>(
      normalizeOptions(catField?.options)
        .map((o) => o.name.trim())
        .filter(Boolean),
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

  const inStockCount = items.filter((i) => i.inStock === true).length;
  const outOfStockCount = items.filter((i) => i.inStock === false).length;

  const categoryGroups = useMemo(() => {
    const catField = schema.fields.find((f) => f.key === 'category');
    const order = normalizeOptions(catField?.options)
      .map((o) => o.name.trim())
      .filter(Boolean);

    const idx = new Map<string, number>();
    order.forEach((c, i) => idx.set(c, i));
    const UNCAT_IDX = Number.MAX_SAFE_INTEGER;

    const map = new Map<string, MenuItem[]>();
    filteredItems.forEach((item) => {
      const raw = (item.category ?? '').trim();
      const key = raw && schemaCategorySet.has(raw) ? raw : UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });

    return Array.from(map.entries())
      .map(([category, list]) => ({ category, items: list }))
      .sort((a, b) => {
        const ai = idx.get(a.category) ?? UNCAT_IDX;
        const bi = idx.get(b.category) ?? UNCAT_IDX;
        return ai - bi;
      });
  }, [filteredItems, schemaCategorySet, schema]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (didInitCollapse.current) return;
    if (categoryGroups.length === 0) return;
    setCollapsed(new Set(categoryGroups.map((g) => g.category)));
    didInitCollapse.current = true;
  }, [categoryGroups]);

  const toggleCategory = (category: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  };

  // -------- Flash helpers --------
  const showTemporaryError = (message: string) => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setFormSuccess('');
    setFormError(message);
    errorTimeoutRef.current = setTimeout(() => {
      setFormError('');
      setInvalidFields({});
      errorTimeoutRef.current = null;
    }, 5000);
  };

  const showSuccess = (message: string, delayMs = 1200) => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setFormError('');
    setInvalidFields({});
    setFormSuccess(message);
    successTimeoutRef.current = setTimeout(() => {
      setFormSuccess('');
      successTimeoutRef.current = null;
    }, delayMs);
  };

  useEffect(
    () => () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    },
    [],
  );

  // -------- Validation --------
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

  const validateRequired = (form: MenuItemFormValue) => {
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
    const hasImg = Array.isArray(form.img)
      ? form.img.some((s) => typeof s === 'string' && s.trim() !== '')
      : !!(form.img && String(form.img).trim() !== '');
    if (!hasImg) errors.img = true;

    const count = Object.keys(errors).length;
    let message = '';
    if (count === 1) {
      message = `Please fill in the required field: ${prettyField(
        Object.keys(errors)[0],
      )}`;
    } else if (count > 1) {
      message = `Please fill in all required fields (${count} missing).`;
    }
    return { errors, message };
  };

  // -------- Stock toggle --------
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

  // -------- Replace menu with samples --------
  const handleReplaceSamplesClick = () => {
    if (!isAdmin) return;
    if (!tenant) return;

    // Two-step confirmation: typed slug + dialog.
    const typed = window.prompt(
      `This will delete all current ${labels.items.toLowerCase()} and replace them with sample items.\n\n` +
        `Type "${tenant.slug}" to confirm:`,
    );
    if (typed !== tenant.slug) return;

    setConfirmReplace(true);
  };

  const handleConfirmReplaceSamples = async () => {
    if (!tenant || isReplacing) return;
    setConfirmReplace(false);
    setIsReplacing(true);
    try {
      const defaults = getCategoryDefaults(tenant.storeCategory);
      const inserted = await menuService.replaceWithSampleItems(
        defaults.items,
      );

      if (inserted === 0) {
        showTemporaryError('No sample items were inserted. Please retry.');
      } else {
        showSuccess(
          `Menu replaced with ${inserted} sample ${labels.items.toLowerCase()}.`,
          2500,
        );
      }
    } catch (err) {
      console.error('Replace samples failed:', err);
      showTemporaryError('Failed to replace the menu. Please try again.');
    } finally {
      setIsReplacing(false);
    }
  };

  // -------- Edit --------
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

    const form: MenuItemFormValue = {
      name: item.name,
      desc: item.desc,
      price: item.price,
      costPrice: item.costPrice,
      discount: item.discount ?? 0,
      img:
        item.gallery && item.gallery.length > 0
          ? item.gallery
          : item.img
            ? [item.img]
            : [],
      category: sanitizedCategory,
      isVeg: item.isVeg,
      isSpicy: item.isSpicy,
      isGlutenFree: item.isGlutenFree,
      preparationTime: item.preparationTime,
      calories: item.calories,
      ingredients: item.ingredients,
      nutritionalInfo: item.nutritionalInfo,
      attributes: item.attributes || {},
      customizationOptions: item.customizationOptions || [],
    };

    schema.fields
      .filter((f) => !f.builtin)
      .forEach((f) => {
        (form as Record<string, unknown>)[f.key] =
          item.attributes?.[f.key] ?? '';
      });

    setEditForm(form);
    setIngredientsInput(item.ingredients?.join(', ') || '');
    setCustomizationOptions(item.customizationOptions || []);
  };

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

  const cleanNumber = (v: any): number | undefined => {
    if (v === undefined || v === null || v === '' || Number.isNaN(v))
      return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const cleanString = (v: any): string | undefined => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  };

  const buildCleanedItem = (
    form: MenuItemFormValue,
    customOptions: CustomizationOption[],
  ): Partial<MenuItem> => {
    const customAttributes: Record<string, any> = {
      ...(form.attributes as Record<string, any> | undefined),
    };
    schema.fields
      .filter((f) => !f.builtin && f.enabled)
      .forEach((field) => {
        const value = (form as Record<string, unknown>)[field.key];
        if (value !== undefined && value !== null && value !== '') {
          customAttributes[field.key] = value;
        } else {
          delete customAttributes[field.key];
        }
      });

    const cleanedCategory =
      form.category && schemaCategorySet.has(String(form.category).trim())
        ? String(form.category).trim()
        : undefined;

    const rawDiscount = Number(form.discount) || 0;
    const discount =
      rawDiscount > 0 && rawDiscount <= 100 ? rawDiscount : 0;
    const costPrice =
      discount > 0 ? undefined : cleanNumber(form.costPrice);

    const imgArray = Array.isArray(form.img)
      ? form.img.filter(Boolean)
      : typeof form.img === 'string' && form.img
        ? [form.img]
        : [];

    const primaryImg = imgArray[0] ?? '';
    const gallery = imgArray.length > 1 ? imgArray : undefined;

    return {
      name: form.name!.trim(),
      desc: form.desc ?? '',
      price: form.price,
      discount,
      costPrice,
      img: primaryImg,
      gallery,
      category: cleanedCategory,
      isVeg: form.isVeg ?? false,
      isSpicy: form.isSpicy ?? false,
      isGlutenFree: form.isGlutenFree ?? false,
      preparationTime: cleanString(form.preparationTime),
      calories: cleanNumber(form.calories),
      ingredients:
        form.ingredients && form.ingredients.length > 0
          ? form.ingredients
          : undefined,
      nutritionalInfo:
        form.nutritionalInfo &&
        Object.values(form.nutritionalInfo).some(
          (v) => v !== undefined && v !== null && String(v).trim() !== '',
        )
          ? form.nutritionalInfo
          : undefined,
      attributes:
        Object.keys(customAttributes).length > 0
          ? customAttributes
          : undefined,
      customizationOptions:
        customOptions.length > 0 ? customOptions : undefined,
    };
  };

  const handleSaveEdit = async () => {
    if (!editingItem || isSaving) return;

    setFormError('');
    setFormSuccess('');
    setInvalidFields({});

    const { errors, message } = validateRequired(editForm);
    if (Object.keys(errors).length > 0) {
      setInvalidFields(errors);
      showTemporaryError(message);
      document
        .querySelector(`.${local.editForm}`)
        ?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    try {
      const cleaned = buildCleanedItem(editForm, customizationOptions);
      await updateItem(editingItem.id, cleaned);
      showSuccess(`${labels.item} updated successfully!`);
      setTimeout(() => {
        setEditingItem(null);
        setEditForm({});
        setCustomizationOptions([]);
        setIngredientsInput('');
      }, 900);
    } catch (err) {
      console.error('Save edit failed:', err);
      showTemporaryError(
        `Failed to update ${labels.item.toLowerCase()}. Please try again.`,
      );
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;
    if (
      !window.confirm(
        `Are you sure you want to delete "${editingItem.name}"? This action cannot be undone.`,
      )
    )
      return;
    try {
      await deleteItem(editingItem.id);
      setEditingItem(null);
      setEditForm({});
      setCustomizationOptions([]);
      setIngredientsInput('');
    } catch {
      setFormError(`Failed to delete ${labels.item.toLowerCase()}`);
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

  // -------- Add new --------
  const handleAddNewItem = () => {
    setIsAddingNew(true);
    setFormError('');
    setFormSuccess('');
    setInvalidFields({});
    setIsSaving(false);
    setNewItemForm({ ...emptyNewItem, img: [] });
    setNewIngredientsInput('');
    setNewCustomizationOptions([]);
  };

  const handleSaveNewItem = async () => {
    if (isSaving) return;

    setFormError('');
    setFormSuccess('');
    setInvalidFields({});

    const { errors, message } = validateRequired(newItemForm);
    if (Object.keys(errors).length > 0) {
      setInvalidFields(errors);
      showTemporaryError(message);
      document
        .querySelector(`.${local.editForm}`)
        ?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);
    try {
      const cleaned = buildCleanedItem(
        newItemForm,
        newCustomizationOptions,
      );
      const newItem: Omit<MenuItem, 'id'> = {
        ...(cleaned as Omit<MenuItem, 'id'>),
        inStock:
          newItemForm.inStock !== undefined ? newItemForm.inStock : true,
      };
      await addItem(newItem);
      showSuccess(`${labels.item} added successfully!`);
      setTimeout(() => {
        setIsAddingNew(false);
        setNewIngredientsInput('');
        setNewCustomizationOptions([]);
      }, 900);
    } catch (err) {
      console.error('Save new item failed:', err);
      showTemporaryError(
        `Failed to add ${labels.item.toLowerCase()}. Please try again.`,
      );
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

  // -------- Drag & drop --------
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
    const order = filteredItems.map((i) => i.id);
    const from = order.indexOf(draggedId);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) {
      setDraggedId(null);
      return;
    }
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, draggedId);
    setDraggedId(null);
    setIsReordering(true);
    try {
      await reorderItems(next);
    } catch (err) {
      console.error('Reorder failed:', err);
      setFormError('Failed to save the new order. Please try again.');
    } finally {
      setIsReordering(false);
    }
  };

  const enabledFields = schema.fields.filter(
    (f) => f.enabled && !f.platformOnly,
  );

  // -------- Schema version key --------
  const schemaVersion = useMemo(
    () =>
      enabledFields
        .map((f) => `${f.key}:${f.label}:${f.type}:${f.enabled ? 1 : 0}`)
        .join('|'),
    [enabledFields],
  );

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <>
      {/* ============ Main panel ============ */}
      <Modal
        isOpen={true}
        onClose={onClose}
        title={labels.adminPanelTitle}
        size="xl"
        headerRight={
          <div className={local.btnWrap}>
            {isAdmin && plan.canEditFields && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReplaceSamplesClick}
                loading={isReplacing}
                leftIcon={
                  <DownloadIcon width={14} height={14} fill="#4d4d4d" />
                }
                title="Replace the current menu with sample items for your store type"
              >
                Samples
              </Button>
            )}
            {isAdmin && plan.canEditFields && (
              <Button size="sm" onClick={handleAddNewItem}>
                + Add
              </Button>
            )}
            {isAdmin && plan.canEditFields && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFormBuilderOpen(true)}
              >
                Labels
              </Button>
            )}
          </div>
        }
      >
        {/* Stats */}
        <div className={local.stats}>
          <div className={local.statItem}>
            <span className={local.statLabel}>All {labels.items}</span>
            <span className={local.statValue}>{items.length}</span>
          </div>
          <div className={local.statItem}>
            <span className={local.statLabel}>Active</span>
            <span className={`${local.statValue} ${local.inStock}`}>
              {inStockCount}
            </span>
          </div>
          <div className={local.statItem}>
            <span className={local.statLabel}>Inactive</span>
            <span className={`${local.statValue} ${local.outOfStock}`}>
              {outOfStockCount}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className={local.controls}>
          <Input
            placeholder={labels.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            inputSize="sm"
          />
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as 'all' | 'inStock' | 'outOfStock')
            }
            className={local.filterSelect}
          >
            <option value="all">All {labels.items}</option>
            <option value="inStock">In Stock</option>
            <option value="outOfStock">Out of Stock</option>
          </select>
        </div>

        {isAdmin && !canReorder && (
          <Banner variant="warning" inline>
            Clear search / filter to reorder items by dragging
          </Banner>
        )}

        {isReordering && (
          <Banner variant="info" inline>
            Saving order...
          </Banner>
        )}

        {/* Category groups */}
        <div className={local.itemList}>
          {categoryGroups.length === 0 ? (
            <EmptyState title="No items found matching your criteria" />
          ) : (
            categoryGroups.map((group) => {
              const forceOpen = searchTerm.trim() !== '';
              const isCollapsed =
                !forceOpen && collapsed.has(group.category);
              return (
                <Accordion
                  key={group.category}
                  title={group.category}
                  forceOpen={forceOpen}
                  defaultOpen={!isCollapsed}
                  meta={
                    <span className={local.categoryCount}>
                      {group.items.length}
                    </span>
                  }
                >
                  {group.items.map((item) => {
                    const isDragging = draggedId === item.id;
                    const isDropTarget =
                      dragOverId === item.id && draggedId !== item.id;
                    return (
                      <div
                        key={item.id}
                        className={[
                          local.itemRow,
                          isDragging ? local.dragging : '',
                          isDropTarget ? local.dropTarget : '',
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
                        onDragEnd={canReorder ? handleDragEnd : undefined}
                      >
                        {canReorder && (
                          <div className={local.dragHandle}>
                            <span className={local.dragDots} />
                          </div>
                        )}

                        <div className={local.itemInfo}>
                          <img
                            src={item.img}
                            alt={item.name}
                            className={`${local.itemImage} ${
                              !item.inStock ? local.itemImageDim : ''
                            }`}
                          />
                          <div className={local.itemName}>
                            {item.name}
                            {item.discount && item.discount > 0 && (
                              <Badge tone="warning" size="sm">
                                -{item.discount}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className={local.itemStatus}>
  <Button
    size="sm"
    variant={item.inStock ? 'ghost' : 'danger'}
    onClick={() => handleToggle(item.id)}
  >
    {item.inStock ? 'Mark Out of Stock' : 'Restock'}
  </Button>

  {isAdmin && (
    <Button
      size="sm"
      variant="info"
      onClick={() => handleEditClick(item)}
    >
      Edit
    </Button>
  )}
</div>
                      </div>
                    );
                  })}
                </Accordion>
              );
            })
          )}
        </div>
      </Modal>

      {/* ============ Add new item modal (admin only) ============ */}
      {isAdmin && (
        <Modal
          key={`add-item-${schemaVersion}`}
          isOpen={isAddingNew}
          onClose={handleCancelNewItem}
          title={`Add New ${labels.item}`}
          size="lg"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={handleCancelNewItem}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveNewItem} loading={isSaving}>
                Add {labels.item}
              </Button>
            </>
          }
        >
          <div className={local.editForm}>
            {formError && (
              <Banner variant="error" onDismiss={() => setFormError('')}>
                {formError}
              </Banner>
            )}
            {formSuccess && (
              <Banner variant="success">{formSuccess}</Banner>
            )}

            {enabledFields.map((field) => (
              <DynamicField
                key={`${field.key}-${field.label}-${field.type}`}
                field={field}
                value={(newItemForm as Record<string, unknown>)[field.key]}
                onChange={(v) => {
                  setNewItemForm(
                    (prev) =>
                      applyDiscountMutex({
                        ...prev,
                        [field.key]: v,
                      }) as MenuItemFormValue,
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
                        setNewItemForm((prev) => ({
                          ...prev,
                          img: url ? [url] : [],
                        }))
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
          </div>
        </Modal>
      )}

      {/* ============ Edit item modal (admin only) ============ */}
      {isAdmin && (
        <Modal
          key={`edit-item-${editingItem?.id ?? 0}-${schemaVersion}`}
          isOpen={!!editingItem}
          onClose={handleCancelEdit}
          title={`Edit ${labels.item}`}
          size="lg"
          footer={
            <>
              <Button
                variant="danger"
                onClick={handleDeleteItem}
                disabled={isSaving}
                style={{ marginRight: 'auto' }}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} loading={isSaving}>
                Save Changes
              </Button>
            </>
          }
        >
          <div className={local.editForm}>
            {formError && (
              <Banner variant="error" onDismiss={() => setFormError('')}>
                {formError}
              </Banner>
            )}
            {formSuccess && (
              <Banner variant="success">{formSuccess}</Banner>
            )}

            {enabledFields.map((field) => (
              <DynamicField
                key={`${field.key}-${field.label}-${field.type}`}
                field={field}
                value={(editForm as Record<string, unknown>)[field.key]}
                onChange={(v) => {
                  setEditForm(
                    (prev) =>
                      applyDiscountMutex({
                        ...prev,
                        [field.key]: v,
                      }) as MenuItemFormValue,
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
                        setEditForm((prev) => ({
                          ...prev,
                          img: url ? [url] : [],
                        }))
                    : undefined
                }
                ingredientsInput={
                  field.key === 'ingredients' ? ingredientsInput : undefined
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
          </div>
        </Modal>
      )}

      {/* ============ Confirm stock toggle ============ */}
      <ConfirmDialog
        isOpen={!!confirmToggle}
        title={
          confirmToggle?.action === 'out'
            ? 'Mark Out of Stock'
            : 'Restock Item'
        }
        message={
          confirmToggle?.action === 'out'
            ? `Mark "${confirmToggle.name}" as Out of Stock?`
            : `Restock "${confirmToggle?.name}"?`
        }
        confirmText="Confirm"
        variant={confirmToggle?.action === 'out' ? 'warning' : 'primary'}
        onConfirm={confirmToggleStock}
        onCancel={() => setConfirmToggle(null)}
      />

      {/* ============ Confirm replace with samples ============ */}
      <ConfirmDialog
        isOpen={confirmReplace}
        title="Replace menu with samples?"
        message={
          <>
            This will <strong>delete all current {labels.items.toLowerCase()}</strong>{' '}
            and replace them with the default sample items for a{' '}
            <strong>{tenant?.storeCategory ?? 'restaurant'}</strong> store.
            <br />
            <br />
            This cannot be undone. Are you sure?
          </>
        }
        confirmText="Yes, replace menu"
        variant="danger"
        loading={isReplacing}
        onConfirm={handleConfirmReplaceSamples}
        onCancel={() => setConfirmReplace(false)}
      />

      {/* ============ Form builder (admin only) ============ */}
      {isAdmin && isFormBuilderOpen && (
        <FormBuilder onClose={() => setIsFormBuilderOpen(false)} />
      )}
    </>
  );
};

export default AdminPanel;