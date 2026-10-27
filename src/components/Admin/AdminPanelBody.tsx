// src/components/Admin/AdminPanelBody.tsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MenuItem,
  CustomizationOption,
  DEFAULT_FORM_SCHEMA,
  normalizeOptions,
} from "../../types";
import { useMenu } from "../../hooks/useMenu";
import { useTenant } from "../../contexts/TenantContext";
import { usePlan } from "../../hooks/usePlan";
import { useAuth } from "../../hooks/useAuth";
import {
  Modal,
  ConfirmDialog,
  Button,
  Input,
  Banner,
  Accordion,
  Badge,
  EmptyState,
  Tabs,
  Chip,
} from "../ui";
import { getStoreLabels } from "../../utils/storeLabels";
import { getCategoryDefaults } from "../../data/storeDefaults";
import { menuService } from "../../services/menu.service";
import BadgeSelector from "./BadgeSelector";
import CustomizationEditor from "./CustomizationEditor";
import DynamicField from "./DynamicField";
import FormBuilder from "./FormBuilder";
import { InlineSection } from "../Dashboard/inline";
import AdminPanelSettingsMenu from "./AdminPanelSettingsMenu";
import ImportMenuListModal from "./ImportMenuListModal";
import PharmacyStockBody from "./PharmacyStockBody";
import HospitalServicesBody from './HospitalServicesBody';
import HospitalDoctorsBody from './HospitalDoctorsBody';
import HospitalPatientsBody from './HospitalPatientsBody';
import local from "./AdminPanel.module.scss";

type MenuItemFormValue = Omit<Partial<MenuItem>, "img"> & {
  img?: string | string[];
};

interface AdminPanelBodyProps {
  embedded?: boolean;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

const UNCATEGORIZED = "Uncategorized";
const ALL_CATEGORIES = "__all__";

const emptyNewItem: MenuItemFormValue = {
  name: "",
  desc: "",
  price: 0,
  costPrice: 0,
  discount: 0,
  img: [],
  category: "",
  isVeg: false,
  isSpicy: false,
  isGlutenFree: false,
  preparationTime: "",
  calories: 0,
  rating: 0,
  reviewCount: 0,
  ingredients: [],
  nutritionalInfo: {},
  attributes: {},
  customizationOptions: [],
  inStock: true,
};

const AdminPanelBody: React.FC<AdminPanelBodyProps> = ({
  embedded = false,
  onHeaderActionsChange,
}) => {
  const { tenant } = useTenant();
  const plan = usePlan();
  const { isAdmin } = useAuth();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;
  const labels = getStoreLabels(tenant?.storeCategory);

  const { items, toggleStock, updateItem, addItem, deleteItem, reorderItems } =
    useMenu();

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "inStock" | "outOfStock">("all");
  /** Currently selected category pill. `ALL_CATEGORIES` = no filter. */
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<MenuItemFormValue>({});
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>(
    {},
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [customizationOptions, setCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);
  const [ingredientsInput, setIngredientsInput] = useState("");

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemForm, setNewItemForm] =
    useState<MenuItemFormValue>(emptyNewItem);
  const [newCustomizationOptions, setNewCustomizationOptions] = useState<
    CustomizationOption[]
  >([]);
  const [newIngredientsInput, setNewIngredientsInput] = useState("");

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const [confirmToggle, setConfirmToggle] = useState<{
    itemId: number;
    action: "in" | "out";
    name: string;
  } | null>(null);

  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);

  const [isReplacing, setIsReplacing] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canReorder = isAdmin && searchTerm === "" && filter === "all";

  const schemaCategorySet = useMemo(() => {
    const catField = schema.fields.find((f) => f.key === "category");
    return new Set<string>(
      normalizeOptions(catField?.options)
        .map((o) => o.name.trim())
        .filter(Boolean),
    );
  }, [schema]);

  // ---------------------------------------------------------
  // Category capsule options
  //
  // Shows every category that is both in the schema AND has at
  // least one item. Plus an "All" pill at the front. Also includes
  // "Uncategorized" if there are items with no matching category,
  // so those items are still reachable via the filter.
  // ---------------------------------------------------------
  const categoryCapsules = useMemo(() => {
    const catField = schema.fields.find((f) => f.key === "category");
    const ordered = normalizeOptions(catField?.options)
      .map((o) => o.name.trim())
      .filter(Boolean);

    const used = new Set<string>();
    let hasUncategorized = false;

    items.forEach((item) => {
      const raw = (item.category ?? "").trim();
      if (!raw) {
        hasUncategorized = true;
        return;
      }
      if (!schemaCategorySet.has(raw)) {
        hasUncategorized = true;
        return;
      }
      used.add(raw);
    });

    const list = ordered.filter((c) => used.has(c));
    if (hasUncategorized) list.push(UNCATEGORIZED);
    return list;
  }, [items, schema, schemaCategorySet]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "inStock"
            ? item.inStock === true
            : filter === "outOfStock"
              ? item.inStock === false
              : true;

      let matchesCategory = true;
      if (activeCategory !== ALL_CATEGORIES) {
        const raw = (item.category ?? "").trim();
        const resolved =
          raw && schemaCategorySet.has(raw) ? raw : UNCATEGORIZED;
        matchesCategory = resolved === activeCategory;
      }

      return matchesSearch && matchesFilter && matchesCategory;
    });
  }, [items, searchTerm, filter, activeCategory, schemaCategorySet]);

  const inStockCount = items.filter((i) => i.inStock === true).length;
  const outOfStockCount = items.filter((i) => i.inStock === false).length;

  const categoryGroups = useMemo(() => {
    const catField = schema.fields.find((f) => f.key === "category");
    const order = normalizeOptions(catField?.options)
      .map((o) => o.name.trim())
      .filter(Boolean);

    const idx = new Map<string, number>();
    order.forEach((c, i) => idx.set(c, i));
    const UNCAT_IDX = Number.MAX_SAFE_INTEGER;

    const map = new Map<string, MenuItem[]>();
    filteredItems.forEach((item) => {
      const raw = (item.category ?? "").trim();
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

  // ---------------------------------------------------------
  // Default-collapse behaviour
  //
  // Every category group starts collapsed. This runs on every new
  // set of groups - so it works whether items were already loaded
  // or arrive later. Categories that the user has *explicitly
  // opened* stay open (tracked in `userOpened`).
  // ---------------------------------------------------------
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const userOpenedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const all = new Set(categoryGroups.map((g) => g.category));
    // Preserve any user-opened categories across filter/search changes.
    userOpenedRef.current.forEach((cat) => {
      if (all.has(cat)) all.delete(cat);
    });
    setCollapsed(all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Only rerun when the *set of categories* changes, not their
    // items. Using `categoryGroups.length` avoids firing on every
    // item update.
    categoryGroups.length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    categoryGroups.map((g) => g.category).join("|"),
  ]);

  const toggleCategory = (category: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
        userOpenedRef.current.add(category);
      } else {
        next.add(category);
        userOpenedRef.current.delete(category);
      }
      return next;
    });
  };

  const showTemporaryError = (message: string) => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setFormSuccess("");
    setFormError(message);
    errorTimeoutRef.current = setTimeout(() => {
      setFormError("");
      setInvalidFields({});
      errorTimeoutRef.current = null;
    }, 5000);
  };

  const showSuccess = (message: string, delayMs = 1200) => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setFormError("");
    setInvalidFields({});
    setFormSuccess(message);
    successTimeoutRef.current = setTimeout(() => {
      setFormSuccess("");
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

  const prettyField = (key: string): string => {
    const fromSchema = schema.fields.find((f) => f.key === key);
    if (fromSchema) return fromSchema.label;
    switch (key) {
      case "name":
        return "Name";
      case "price":
        return "Price";
      case "img":
        return "Image";
      default:
        return key;
    }
  };

  const validateRequired = (form: MenuItemFormValue) => {
    const errors: Record<string, boolean> = {};
    if (!form.name || form.name.trim() === "") errors.name = true;
    if (
      form.price === undefined ||
      form.price === null ||
      Number.isNaN(form.price) ||
      Number(form.price) <= 0
    ) {
      errors.price = true;
    }
    const hasImg = Array.isArray(form.img)
      ? form.img.some((s) => typeof s === "string" && s.trim() !== "")
      : !!(form.img && String(form.img).trim() !== "");
    if (!hasImg) errors.img = true;

    const count = Object.keys(errors).length;
    let message = "";
    if (count === 1) {
      message = `Please fill in the required field: ${prettyField(
        Object.keys(errors)[0],
      )}`;
    } else if (count > 1) {
      message = `Please fill in all required fields (${count} missing).`;
    }
    return { errors, message };
  };

  const handleToggle = (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setConfirmToggle({
      itemId,
      action: item.inStock ? "out" : "in",
      name: item.name,
    });
  };

  const confirmToggleStock = async () => {
    if (!confirmToggle) return;
    const { itemId } = confirmToggle;
    setConfirmToggle(null);
    await toggleStock(itemId);
  };

  const handleReplaceSamplesClick = () => {
    if (!isAdmin) return;
    if (!tenant) return;

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
      const inserted = await menuService.replaceWithSampleItems(defaults.items);

      if (inserted === 0) {
        showTemporaryError("No sample items were inserted. Please retry.");
      } else {
        showSuccess(
          `Menu replaced with ${inserted} sample ${labels.items.toLowerCase()}.`,
          2500,
        );
      }
    } catch (err) {
      console.error("Replace samples failed:", err);
      showTemporaryError("Failed to replace the menu. Please try again.");
    } finally {
      setIsReplacing(false);
    }
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingItem(item);
    setFormError("");
    setFormSuccess("");
    setInvalidFields({});
    setIsSaving(false);

    const sanitizedCategory =
      item.category && schemaCategorySet.has(item.category.trim())
        ? item.category
        : "";

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
          item.attributes?.[f.key] ?? "";
      });

    setEditForm(form);
    setIngredientsInput(item.ingredients?.join(", ") || "");
    setCustomizationOptions(item.customizationOptions || []);
  };

  const applyDiscountMutex = (
    patch: Record<string, any>,
  ): Record<string, any> => {
    if ("discount" in patch) {
      const d = Number(patch.discount) || 0;
      if (d > 0) patch.costPrice = 0;
    }
    if ("costPrice" in patch) {
      const c = Number(patch.costPrice) || 0;
      if (c > 0) patch.discount = 0;
    }
    return patch;
  };

  const cleanNumber = (v: any): number | undefined => {
    if (v === undefined || v === null || v === "" || Number.isNaN(v))
      return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const cleanString = (v: any): string | undefined => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    return s === "" ? undefined : s;
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
        if (value !== undefined && value !== null && value !== "") {
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
    const discount = rawDiscount > 0 && rawDiscount <= 100 ? rawDiscount : 0;
    const costPrice = discount > 0 ? undefined : cleanNumber(form.costPrice);

    const imgArray = Array.isArray(form.img)
      ? form.img.filter(Boolean)
      : typeof form.img === "string" && form.img
        ? [form.img]
        : [];

    const primaryImg = imgArray[0] ?? "";
    const gallery = imgArray.length > 1 ? imgArray : undefined;

    return {
      name: form.name!.trim(),
      desc: form.desc ?? "",
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
          (v) => v !== undefined && v !== null && String(v).trim() !== "",
        )
          ? form.nutritionalInfo
          : undefined,
      attributes:
        Object.keys(customAttributes).length > 0 ? customAttributes : undefined,
      customizationOptions:
        customOptions.length > 0 ? customOptions : undefined,
    };
  };

  const handleSaveEdit = async () => {
    if (!editingItem || isSaving) return;

    setFormError("");
    setFormSuccess("");
    setInvalidFields({});

    const { errors, message } = validateRequired(editForm);
    if (Object.keys(errors).length > 0) {
      setInvalidFields(errors);
      showTemporaryError(message);
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
        setIngredientsInput("");
      }, 900);
    } catch (err) {
      console.error("Save edit failed:", err);
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
      setIngredientsInput("");
    } catch {
      setFormError(`Failed to delete ${labels.item.toLowerCase()}`);
    }
  };

  const handleCancelEdit = () => {
    if (isSaving) return;
    setEditingItem(null);
    setFormError("");
    setFormSuccess("");
    setInvalidFields({});
    setIsSaving(false);
    setCustomizationOptions([]);
    setIngredientsInput("");
  };

  const handleAddNewItem = () => {
    setIsAddingNew(true);
    setFormError("");
    setFormSuccess("");
    setInvalidFields({});
    setIsSaving(false);
    setNewItemForm({ ...emptyNewItem, img: [] });
    setNewIngredientsInput("");
    setNewCustomizationOptions([]);
  };

  const handleSaveNewItem = async () => {
    if (isSaving) return;

    setFormError("");
    setFormSuccess("");
    setInvalidFields({});

    const { errors, message } = validateRequired(newItemForm);
    if (Object.keys(errors).length > 0) {
      setInvalidFields(errors);
      showTemporaryError(message);
      return;
    }

    setIsSaving(true);
    try {
      const cleaned = buildCleanedItem(newItemForm, newCustomizationOptions);
      const newItem: Omit<MenuItem, "id"> = {
        ...(cleaned as Omit<MenuItem, "id">),
        inStock: newItemForm.inStock !== undefined ? newItemForm.inStock : true,
      };
      await addItem(newItem);
      showSuccess(`${labels.item} added successfully!`);
      setTimeout(() => {
        setIsAddingNew(false);
        setNewIngredientsInput("");
        setNewCustomizationOptions([]);
      }, 900);
    } catch (err) {
      console.error("Save new item failed:", err);
      showTemporaryError(
        `Failed to add ${labels.item.toLowerCase()}. Please try again.`,
      );
      setIsSaving(false);
    }
  };

  const handleCancelNewItem = () => {
    if (isSaving) return;
    setIsAddingNew(false);
    setFormError("");
    setFormSuccess("");
    setInvalidFields({});
    setIsSaving(false);
    setNewIngredientsInput("");
    setNewCustomizationOptions([]);
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  };
  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
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
      console.error("Reorder failed:", err);
      setFormError("Failed to save the new order. Please try again.");
    } finally {
      setIsReordering(false);
    }
  };

  const enabledFields = schema.fields.filter(
    (f) => f.enabled && !f.platformOnly,
  );

  const schemaVersion = useMemo(
    () =>
      enabledFields
        .map((f) => `${f.key}:${f.label}:${f.type}:${f.enabled ? 1 : 0}`)
        .join("|"),
    [enabledFields],
  );

  const headerActions =
    isAdmin && plan.canEditFields ? (
      <div className={local.btnWrap}>
        <Button size="sm" onClick={handleAddNewItem}>
          + Add
        </Button>
        <AdminPanelSettingsMenu
          onEditLabels={() => setIsFormBuilderOpen(true)}
          onExport={() => menuService.exportItems()}
          onImport={() => setIsImportOpen(true)}
          onSampleImport={handleReplaceSamplesClick}
          sampleDisabled={isReplacing}
          exportDisabled={items.length === 0}
        />
      </div>
    ) : null;

  useEffect(() => {
    if (onHeaderActionsChange) onHeaderActionsChange(headerActions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAdmin,
    plan.canEditFields,
    items.length,
    isReplacing,
    onHeaderActionsChange,
  ]);

  const [showBanner, setShowBanner] = useState(true);

if (tenant?.storeCategory === 'hospital-pharmacy') {
    return <HospitalAdminView />;
  }

  return (
    <>
      <InlineSection
        title={`${labels.adminPanelTitle} (${items.length})`}
        actions={headerActions}
        embedded={embedded}
      >
        {showBanner && (
          <Banner
            variant="warning"
            inline
            onDismiss={() => setShowBanner(false)}
          >
            For changing the position of categories go to settings - edit item
            labels - categories
          </Banner>
        )}

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
              setFilter(e.target.value as "all" | "inStock" | "outOfStock")
            }
            className={local.filterSelect}
          >
            <option value="all">All {labels.items}</option>
            <option value="inStock">In Stock</option>
            <option value="outOfStock">Out of Stock</option>
          </select>
        </div>

        {/* ============ Category capsule filter ============ */}
        {categoryCapsules.length > 0 && (
          <div className={local.categoryPills}>
            <Chip
              tone="primary"
              active={activeCategory === ALL_CATEGORIES}
              onClick={() => setActiveCategory(ALL_CATEGORIES)}
            >
              All
            </Chip>
            {categoryCapsules.map((c) => (
              <Chip
                key={c}
                tone="primary"
                active={activeCategory === c}
                onClick={() =>
                  setActiveCategory((prev) => (prev === c ? ALL_CATEGORIES : c))
                }
              >
                {c}
              </Chip>
            ))}
          </div>
        )}

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

        <div className={local.itemList}>
          {categoryGroups.length === 0 ? (
            <EmptyState title="No items found matching your criteria" />
          ) : (
            categoryGroups.map((group) => {
              const forceOpen = searchTerm.trim() !== "";
              const isCollapsed = !forceOpen && collapsed.has(group.category);
              return (
                <Accordion
                  key={group.category}
                  title={group.category}
                  forceOpen={forceOpen}
                  defaultOpen={isCollapsed}
                  onToggle={(open) => {
                    // Keep local state in sync with user interaction
                    if (open && collapsed.has(group.category)) {
                      toggleCategory(group.category);
                    } else if (!open && !collapsed.has(group.category)) {
                      toggleCategory(group.category);
                    }
                  }}
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
                          isDragging ? local.dragging : "",
                          isDropTarget ? local.dropTarget : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
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
                        onDragLeave={canReorder ? handleDragLeave : undefined}
                        onDrop={
                          canReorder ? (e) => handleDrop(e, item.id) : undefined
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
                              !item.inStock ? local.itemImageDim : ""
                            }`}
                          />
                          <div className={local.itemName}>
                            {item.name}
                            {!!item.discount && item.discount > 0 && (
                              <Badge tone="warning" size="sm">
                                -{item.discount}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className={local.itemStatus}>
                          <Button
                            size="sm"
                            variant={item.inStock ? "ghost" : "danger"}
                            onClick={() => handleToggle(item.id)}
                          >
                            {item.inStock ? "Mark Out of Stock" : "Restock"}
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
      </InlineSection>

      <ImportMenuListModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onComplete={(result) => {
          showSuccess(
            `Imported ${result.added} new - replaced ${result.replaced}.`,
            2500,
          );
        }}
      />

      {isAdmin && (
        <Modal
          key={`add-item-${schemaVersion}`}
          isOpen={isAddingNew}
          onClose={handleCancelNewItem}
          disableBackdropClose={true}
          title={`Add New ${labels.item}`}
          mobileFullScreen
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
              <Banner variant="error" onDismiss={() => setFormError("")}>
                {formError}
              </Banner>
            )}
            {formSuccess && <Banner variant="success">{formSuccess}</Banner>}

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
                  field.key === "img"
                    ? (url) =>
                        setNewItemForm((prev) => ({
                          ...prev,
                          img: url ? [url] : [],
                        }))
                    : undefined
                }
                ingredientsInput={
                  field.key === "ingredients" ? newIngredientsInput : undefined
                }
                onIngredientsInputChange={
                  field.key === "ingredients"
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

      {isAdmin && (
        <Modal
          key={`edit-item-${editingItem?.id ?? 0}-${schemaVersion}`}
          isOpen={!!editingItem}
          onClose={handleCancelEdit}
          mobileFullScreen
          disableBackdropClose={true}
          title={`Edit ${labels.item}`}
          size="lg"
          footer={
            <>
              <Button
                variant="danger"
                onClick={handleDeleteItem}
                disabled={isSaving}
                style={{ marginRight: "auto" }}
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
              <Banner variant="error" onDismiss={() => setFormError("")}>
                {formError}
              </Banner>
            )}
            {formSuccess && <Banner variant="success">{formSuccess}</Banner>}

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
                  field.key === "img"
                    ? (url) =>
                        setEditForm((prev) => ({
                          ...prev,
                          img: url ? [url] : [],
                        }))
                    : undefined
                }
                ingredientsInput={
                  field.key === "ingredients" ? ingredientsInput : undefined
                }
                onIngredientsInputChange={
                  field.key === "ingredients" ? setIngredientsInput : undefined
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

      <ConfirmDialog
        isOpen={!!confirmToggle}
        title={
          confirmToggle?.action === "out" ? "Mark Out of Stock" : "Restock Item"
        }
        message={
          confirmToggle?.action === "out"
            ? `Are you sure "${confirmToggle.name}" is Out of Stock?`
            : `Are you sure "${confirmToggle?.name}" is in stock?`
        }
        confirmText="Confirm"
        variant={confirmToggle?.action === "out" ? "warning" : "primary"}
        onConfirm={confirmToggleStock}
        onCancel={() => setConfirmToggle(null)}
      />

      <ConfirmDialog
        isOpen={confirmReplace}
        title="Replace menu with samples?"
        message={
          <>
            This will{" "}
            <strong>delete all current {labels.items.toLowerCase()}</strong> and
            replace them with the default sample items for a{" "}
            <strong>{tenant?.storeCategory ?? "restaurant"}</strong> store.
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

      {isAdmin && isFormBuilderOpen && (
        <FormBuilder onClose={() => setIsFormBuilderOpen(false)} />
      )}
    </>
  );
};

export default AdminPanelBody;

const HospitalAdminView: React.FC = () => {
  const getInitialTab = ():
    | 'services'
    | 'pharmacy'
    | 'doctors'
    | 'patients' => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'patients' || tab === 'doctors' || tab === 'pharmacy')
      return tab;
    return 'pharmacy';
  };

  const [tab, setTab] = useState<
    'services' | 'pharmacy' | 'doctors' | 'patients'
  >(getInitialTab);

  const [counts, setCounts] = useState<{
    services: number;
    pharmacy: number;
    doctors: number;
    patients: number;
  }>({ services: 0, pharmacy: 0, doctors: 0, patients: 0 });

  const handleTabChange = (newTab: string) => {
    setTab(newTab as any);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', newTab);
    window.history.replaceState({}, '', url.toString());
  };

  const tabItems = [
    { key: 'services', label: `Services (${counts.services})` },
    { key: 'pharmacy', label: `Pharmacy (${counts.pharmacy})` },
    { key: 'doctors', label: `Doctors (${counts.doctors})` },
    { key: 'patients', label: `Patients (${counts.patients})` },
  ];

  // ◀── NEW: keep all tabs mounted, hide inactive ones with `display:none`.
  // Each child component loads its own data ONCE on mount and caches it
  // in local state. Switching tabs becomes a pure CSS toggle — no fetches.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs block items={tabItems} value={tab} onChange={handleTabChange} />

      <div style={{ display: tab === 'services' ? 'block' : 'none' }}>
        <HospitalServicesBody
          onCountChange={(n) =>
            setCounts((prev) => ({ ...prev, services: n }))
          }
        />
      </div>

      <div style={{ display: tab === 'pharmacy' ? 'block' : 'none' }}>
        <PharmacyStockBody
          embedded={true}
          onCountChange={(n) =>
            setCounts((prev) => ({ ...prev, pharmacy: n }))
          }
        />
      </div>

      <div style={{ display: tab === 'doctors' ? 'block' : 'none' }}>
        <HospitalDoctorsBody
          onCountChange={(n) =>
            setCounts((prev) => ({ ...prev, doctors: n }))
          }
        />
      </div>

      <div style={{ display: tab === 'patients' ? 'block' : 'none' }}>
        <HospitalPatientsBody
          onCountChange={(n) =>
            setCounts((prev) => ({ ...prev, patients: n }))
          }
        />
      </div>
    </div>
  );
};
