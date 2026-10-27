// src/components/Admin/HospitalServicesBody.tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import { HOSPITAL_SERVICES_SEED } from "../../data/hospitalServices";
import {
  Button,
  Input,
  Modal,
  FormField,
  Badge,
  IconButton,
  DropdownMenu,
  DropdownItem,
  ConfirmDialog,
  Banner,
  Textarea,
  Sheet,
  Chip,
  Pagination,
  Accordion,
  Select
} from "../ui";
import { InlineSection } from "../Dashboard/inline";
import ImageUpload from "./ImageUpload";
import {
  PlusIcon,
  EditIcon,
  KebabIcon,
  DownloadIcon,
  CopyIcon,
  SettingsIcon,
  TrashIcon,
  SearchIcon,
  FilterIcon,
  CloseIcon,
} from "../../assets/svgs";
import local from "./Pharmacy.module.scss";

interface HospitalServicesBodyProps {
  onCountChange?: (n: number) => void;
}

const DEFAULT_CATEGORIES = [
  "General Medicine",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "Cardiology",
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAYS_FULL = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const CATEGORY_PAGE_SIZE = 12;
const STORAGE_KEY = "hospital_service_categories";
const REMOVED_STORAGE_KEY = "hospital_service_categories_removed";

const readStoredCategories = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter(
          (c): c is string => typeof c === "string" && c.trim().length > 0,
        )
      : [];
  } catch {
    return [];
  }
};

const readRemovedCategories = (): Set<string> => {
  try {
    const raw = localStorage.getItem(REMOVED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(
      Array.isArray(arr)
        ? arr.filter((c): c is string => typeof c === "string")
        : [],
    );
  } catch {
    return new Set();
  }
};

const mergeCategories = (fromDB: string[], removed: Set<string>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (c: string) => {
    const t = c.trim();
    if (!t) return;
    if (removed.has(t)) return;
    if (seen.has(t)) return;
    seen.add(t);
    result.push(t);
  };

  readStoredCategories().forEach(push);
  fromDB.forEach(push);

  if (result.length === 0) {
    DEFAULT_CATEGORIES.forEach(push);
  }

  return result;
};

type AvailabilityFilter = "all" | "todayAvailable" | "todayUnavailable";

export default function HospitalServicesBody({
  onCountChange,
}: HospitalServicesBodyProps = {}) {
  const { tenant } = useTenant();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterAvailability, setFilterAvailability] =
    useState<AvailabilityFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<any>({
    name: "",
    category: "",
    price: 500,
    image: "",
    description: "",
    daily_limits: {
      mon: 40,
      tue: 40,
      wed: 40,
      thu: 40,
      fri: 40,
      sat: 20,
      sun: 0,
    },
  });
  const [isSaving, setIsSaving] = useState(false);

  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [draftCategories, setDraftCategories] = useState<string[]>([]);

  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{
    index: number;
    name: string;
  } | null>(null);

  // Service that the user wants to delete
const [deleteServiceTarget, setDeleteServiceTarget] = useState<{
  id: string;
  name: string;
} | null>(null);
const [isDeletingService, setIsDeletingService] = useState(false);

  // ◀── NEW: drag state for Manage Categories reordering
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedCatOver, setDraggedCatOver] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showSampleConfirm, setShowSampleConfirm] = useState(false);
  const [importConflicts, setImportConflicts] = useState<any[]>([]);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingImportNewItems, setPendingImportNewItems] = useState<any[]>([]);

  const load = async () => {
    if (!tenant) return;
    setIsLoading(true);
    const [svc, cats] = await Promise.all([
      supabaseService.getHospitalServices(tenant.slug),
      supabaseService.getHospitalServiceCategories(tenant.slug),
    ]);
    setServices(svc);
    setDbCategories(cats);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]);

  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterAvailability]);

  const [dbCategories, setDbCategories] = useState<
    { name: string; sort_order: number; hidden: boolean }[]
  >([]);

  const removedCategories = useMemo(
    () => new Set(dbCategories.filter((c) => c.hidden).map((c) => c.name)),
    [dbCategories],
  );

  // Visible list = DB-ordered, plus DB-defaults fallback when empty
  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    const push = (name: string) => {
      const n = (name || "").trim();
      if (!n) return;
      if (removedCategories.has(n)) return;
      if (seen.has(n)) return;
      seen.add(n);
      result.push(n);
    };

    dbCategories
      .filter((c) => !c.hidden)
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((c) => push(c.name));

    // Any category used on a service but not yet in the category table
    services.forEach((s) => push(s.category));

    if (result.length === 0) {
      DEFAULT_CATEGORIES.forEach(push);
    }

    return result;
  }, [dbCategories, services, removedCategories]);

  const categoriesFromDB = allCategories;

  const handleSave = async () => {
    if (!tenant || !form.name) return;
    setIsSaving(true);

    const payload = {
      ...form,
      description: form.description || "",
      price: Number(form.price) || 0,
      category: form.category || allCategories[0] || "General",
      daily_limits: Object.fromEntries(
        DAYS.map((d) => [d, Number(form.daily_limits?.[d]) || 0]),
      ),
    };

    if (form.id) {
      await supabaseService.updateHospitalService(
        tenant.slug,
        form.id,
        payload,
      );
    } else {
      await supabaseService.addHospitalService(tenant.slug, payload);
    }

    setIsSaving(false);
    setIsModalOpen(false);
    load();
  };

  const handleExport = () => {
    const exportData = services.map((s) => ({
      name: s.name,
      category: s.category,
      price: s.price,
      image: s.image,
      description: s.description,
      daily_limits: s.daily_limits,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hospital-services-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const processImport = async (
    newItems: any[],
    conflicts: any[],
    replaceConflicts: boolean,
  ) => {
    if (!tenant) return;
    setIsImportConfirmOpen(false);
    setIsImporting(true);
    let successCount = 0;
    for (const item of newItems) {
      const ok = await supabaseService.addHospitalService(tenant.slug, item);
      if (ok) successCount++;
    }
    if (replaceConflicts) {
      for (const c of conflicts) {
        const ok = await supabaseService.updateHospitalService(
          tenant.slug,
          c.existing.id,
          c.imported,
        );
        if (ok) successCount++;
      }
    }
    setIsImporting(false);
    load();
    alert(`Import complete. ${successCount} items processed.`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error("Invalid format");
        const newItems: any[] = [];
        const conflicts: any[] = [];
        parsed.forEach((item: any) => {
          const existing = services.find(
            (s) =>
              s.name.toLowerCase() === item.name?.toLowerCase() &&
              s.category.toLowerCase() === item.category?.toLowerCase(),
          );
          if (existing) conflicts.push({ imported: item, existing });
          else newItems.push(item);
        });
        if (conflicts.length > 0) {
          setPendingImportNewItems(newItems);
          setImportConflicts(conflicts);
          setIsImportConfirmOpen(true);
        } else {
          processImport(newItems, [], false);
        }
      } catch {
        alert("Failed to import JSON.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleImportSample = async () => {
    setShowSampleConfirm(false);
    if (!tenant) return;
    const newItems: any[] = [];
    const conflicts: any[] = [];
    HOSPITAL_SERVICES_SEED.forEach((item: any) => {
      const existing = services.find(
        (s) =>
          s.name.toLowerCase() === item.name?.toLowerCase() &&
          s.category.toLowerCase() === item.category?.toLowerCase(),
      );
      if (existing) conflicts.push({ imported: item, existing });
      else newItems.push(item);
    });
    if (conflicts.length > 0) {
      setPendingImportNewItems(newItems);
      setImportConflicts(conflicts);
      setIsImportConfirmOpen(true);
    } else {
      processImport(newItems, [], false);
    }
  };

  const confirmDeleteService = async () => {
  if (!tenant || !deleteServiceTarget) return;
  setIsDeletingService(true);

  const ok = await supabaseService.deleteHospitalService(
    tenant.slug,
    deleteServiceTarget.id,
  );

  setIsDeletingService(false);

  if (!ok) {
    alert("Failed to delete service. Please try again.");
    return;
  }

  setDeleteServiceTarget(null);

  // Optimistic removal from the local list so the row disappears
  // instantly even before the next `load()` round-trip.
  setServices((prev) =>
    prev.filter((s) => s.id !== deleteServiceTarget.id),
  );

  // Belt-and-braces: refresh from DB to keep everything in sync
  // (also catches any related rows the backend may have cleaned up).
  load();
};

  const openAddModal = () => {
    const fresh = mergeCategories(categoriesFromDB, removedCategories);
    setForm({
      name: "",
      category: fresh[0] || "",
      price: 500,
      image: "",
      description: "",
      daily_limits: {
        mon: 40,
        tue: 40,
        wed: 40,
        thu: 40,
        fri: 40,
        sat: 20,
        sun: 0,
      },
    });
    setIsModalOpen(true);
  };

  const openEditCategories = () => {
    setDraftCategories(
      allCategories.length > 0 ? [...allCategories] : [...DEFAULT_CATEGORIES],
    );
    setIsLabelModalOpen(true);
  };

  const addCategory = () => setDraftCategories([...draftCategories, ""]);

  const removeCategory = (index: number) =>
    setDraftCategories(draftCategories.filter((_, i) => i !== index));

  const confirmDeleteCategory = () => {
    if (!deleteCategoryTarget) return;
    setDraftCategories((prev) =>
      prev.filter((_, i) => i !== deleteCategoryTarget.index),
    );
    setDeleteCategoryTarget(null);
  };

  const updateCategory = (index: number, val: string) => {
    const next = [...draftCategories];
    next[index] = val;
    setDraftCategories(next);
  };

  // ◀── NEW: reorder the draft list (drag and drop)
  const reorderDraftCategories = (from: number, to: number) => {
    if (from === to) return;
    setDraftCategories((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleCatDragStart = (index: number) => {
    setDraggedCatIndex(index);
  };
  const handleCatDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCatOver !== index) setDraggedCatOver(index);
  };
  const handleCatDragEnd = () => {
    if (draggedCatIndex !== null && draggedCatOver !== null) {
      reorderDraftCategories(draggedCatIndex, draggedCatOver);
    }
    setDraggedCatIndex(null);
    setDraggedCatOver(null);
  };

  const saveCategories = async () => {
  if (!tenant) return;

  const cleaned = draftCategories.map((c) => c.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    alert("You must have at least one category.");
    return;
  }

  // Categories that used to be visible somewhere (either in the category
  // table, or on a service) but are gone from this draft → hide them.
  const previouslyVisible = new Set<string>([
    ...dbCategories.filter((c) => !c.hidden).map((c) => c.name),
    ...services.map((s) => s.category).filter(Boolean),
  ]);
  const cleanedSet = new Set(cleaned);
  const newlyRemoved = Array.from(previouslyVisible).filter(
    (c) => !cleanedSet.has(c),
  );

  const payload = [
    // Every category the draft currently holds, in its dragged order
    ...cleaned.map((name, i) => ({
      name,
      sort_order: i,
      hidden: false,
    })),
    // Preserve hidden categories that are still absent from the draft
    ...dbCategories
      .filter((c) => c.hidden && !cleanedSet.has(c.name))
      .map((c) => ({
        name: c.name,
        sort_order: c.sort_order,
        hidden: true,
      })),
    // Convert any formerly service-only categories that were just deleted
    // into hidden entries so a reload doesn't resurrect them from `services`.
    ...newlyRemoved
      .filter((name) => !dbCategories.some((c) => c.name === name))
      .map((name) => ({
        name,
        sort_order: 999,
        hidden: true,
      })),
  ];

  const ok = await supabaseService.saveHospitalServiceCategories(
    tenant.slug,
    payload,
  );
  if (!ok) {
    alert("Failed to save categories. Please try again.");
    return;
  }

  const cats = await supabaseService.getHospitalServiceCategories(tenant.slug);
  setDbCategories(cats);
  setIsLabelModalOpen(false);
};

  const todayStr = DAYS_FULL[new Date().getDay()];

  const filteredServices = useMemo(() => {
    let result = services;

    // Hide services whose category was removed
    if (removedCategories.size > 0) {
    result = result.filter((s) => !removedCategories.has(s.category));
  }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q),
      );
    }
    if (filterCategory !== "All") {
      result = result.filter((s) => s.category === filterCategory);
    }
    if (filterAvailability === "todayAvailable") {
      result = result.filter(
        (s) => Number(s.daily_limits?.[todayStr] ?? 0) > 0,
      );
    } else if (filterAvailability === "todayUnavailable") {
      result = result.filter(
        (s) => Number(s.daily_limits?.[todayStr] ?? 0) === 0,
      );
    }
    return result;
  }, [
    services,
    search,
    filterCategory,
    filterAvailability,
    todayStr,
    removedCategories,
  ]);

  useEffect(() => {
    if (onCountChange) onCountChange(filteredServices.length);
  }, [filteredServices.length, onCountChange]);

  const groupedServices = useMemo(() => {
    const groups: { category: string; items: any[] }[] = [];
    allCategories.forEach((cat) => {
      const items = filteredServices.filter((s) => s.category === cat);
      if (items.length > 0) groups.push({ category: cat, items });
    });
    return groups;
  }, [filteredServices, allCategories]);

  const totalCategoryPages = Math.max(
    1,
    Math.ceil(groupedServices.length / CATEGORY_PAGE_SIZE),
  );
  const paginatedCategories = groupedServices.slice(
    (page - 1) * CATEGORY_PAGE_SIZE,
    page * CATEGORY_PAGE_SIZE,
  );

  const activeFilters = useMemo(() => {
    let c = 0;
    if (filterCategory !== "All") c++;
    if (filterAvailability !== "all") c++;
    return c;
  }, [filterCategory, filterAvailability]);

  return (
    <>
      <InlineSection
        title={`Hospital Services & Limits (${filteredServices.length})`}
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button
              size="sm"
              onClick={openAddModal}
              leftIcon={<PlusIcon width={16} height={16} fill="#fff" />}
            >
              Add Service
            </Button>
            <DropdownMenu
              trigger={({ toggle }) => (
                <IconButton variant="ghost" size="md" onClick={toggle}>
                  <KebabIcon width={20} height={20} fill="#0F172A" />
                </IconButton>
              )}
            >
              {({ close }) => (
                <>
                  <DropdownItem
                    onClick={() => {
                      close();
                      openEditCategories();
                    }}
                  >
                    Edit Categories
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      close();
                      handleExport();
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <DownloadIcon
                        width={16}
                        height={16}
                        fill="currentColor"
                      />{" "}
                      Export All
                    </span>
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      close();
                      handleImportClick();
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <CopyIcon width={16} height={16} fill="currentColor" />{" "}
                      Import More
                    </span>
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      close();
                      setShowSampleConfirm(true);
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <SettingsIcon
                        width={16}
                        height={16}
                        fill="currentColor"
                      />{" "}
                      Import Sample Data
                    </span>
                  </DropdownItem>
                </>
              )}
            </DropdownMenu>
          </div>
        }
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept=".json"
          onChange={handleImportFile}
        />

        {isImporting && (
          <Banner variant="info">Importing services, please wait...</Banner>
        )}

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Input
              placeholder="Search services by name, category, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon width={16} height={16} fill="#b3b3b3" />}
              rightIcon={
                search ? (
                  <IconButton
                    variant="ghost"
                    size="xs"
                    onClick={() => setSearch("")}
                  >
                    <CloseIcon width={14} height={14} fill="#4d4d4d" />
                  </IconButton>
                ) : undefined
              }
            />
          </div>
          <Button
            variant={activeFilters > 0 ? "primary" : "ghost"}
            onClick={() => setIsFilterOpen(true)}
            leftIcon={<FilterIcon width={14} height={14} fill="currentColor" />}
            rightIcon={
              activeFilters > 0 ? (
                <span
                  style={{
                    background: "#fff",
                    padding: "0 6px",
                    borderRadius: 999,
                    fontSize: 11,
                    color: "#1e7e34",
                    fontWeight: 800,
                  }}
                >
                  {activeFilters}
                </span>
              ) : undefined
            }
          >
            Filters
          </Button>
        </div>

        {isLoading ? (
          <p>Loading services...</p>
        ) : groupedServices.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}
          >
            <p>No services found matching your filters.</p>
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setFilterCategory("All");
                setFilterAvailability("all");
              }}
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {paginatedCategories.map((group) => (
                <Accordion
                  key={group.category}
                  title={group.category}
                  meta={
                    <Badge tone="neutral" size="sm">
                      {group.items.length} services
                    </Badge>
                  }
                >
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          padding: 12,
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          background: "#fff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                          }}
                        >
                          {item.image && (
                            <img
                              src={item.image}
                              alt=""
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 6,
                                objectFit: "cover",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div>
                            <strong style={{ fontSize: 14, display: "block" }}>
                              {item.name}
                            </strong>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#166534",
                                fontWeight: 600,
                                marginBottom: 4,
                              }}
                            >
                              Rs {item.price}
                            </div>
                            {item.description && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#666",
                                  marginBottom: 6,
                                  lineHeight: 1.4,
                                }}
                              >
                                {item.description}
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: 10,
                                color: "#64748b",
                                display: "flex",
                                gap: 4,
                                flexWrap: "wrap",
                              }}
                            >
                              {DAYS.map((d) => {
                                const limit = item.daily_limits?.[d] ?? 0;
                                return (
                                  <span
                                    key={d}
                                    style={{
                                      padding: "2px 4px",
                                      borderRadius: 3,
                                      background:
                                        limit === 0 ? "#fee2e2" : "#f1f5f9",
                                      color:
                                        limit === 0 ? "#dc2626" : "#475569",
                                      fontWeight: limit === 0 ? 700 : 500,
                                    }}
                                  >
                                    {d.substring(0, 1).toUpperCase()}:
                                    {limit === 0 ? "OFF" : limit}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div
  style={{
    display: "flex",
    gap: 6,
    flexShrink: 0,
    alignItems: "center",
  }}
>
  <Button
    size="sm"
    variant="ghost"
    onClick={() => {
      setForm(item);
      setIsModalOpen(true);
    }}
    leftIcon={
      <EditIcon width={14} height={14} fill="currentColor" />
    }
  >
    Edit
  </Button>
  <IconButton
    variant="danger"
    size="sm"
    aria-label={`Delete ${item.name}`}
    title="Delete service"
    shape="square"
    onClick={() =>
      setDeleteServiceTarget({
        id: item.id,
        name: item.name,
      })
    }
  >
    <TrashIcon width={14} height={14} fill="currentColor" />
  </IconButton>
</div>
                      </div>
                    ))}
                  </div>
                </Accordion>
              ))}
            </div>

            {totalCategoryPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalCategoryPages}
                totalItems={groupedServices.length}
                pageSize={CATEGORY_PAGE_SIZE}
                onChange={setPage}
              />
            )}
          </>
        )}
      </InlineSection>

      {/* Add/Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSaving) setIsModalOpen(false);
        }}
        title={form.id ? "Edit Service" : "Add Service"}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              Save Service
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FormField label="Problem / Service Name *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
            />
          </FormField>

          <FormField label="Category">
            {allCategories.length === 0 ? (
              <Banner variant="warning" inline>
                No categories yet. Add one via Edit Categories.
              </Banner>
            ) : (
              <Select
      value={
        allCategories.includes(form.category)
          ? form.category
          : allCategories[0]
      }
      onChange={(e) => setForm({ ...form, category: e.target.value })}
      options={allCategories.map((c) => ({ value: c, label: c }))}
    />
            )}
          </FormField>

          <FormField label="Consultation Fee (Rs)">
            <Input
              type="number"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
          </FormField>

          <ImageUpload
            currentImage={form.image || ""}
            onImageUploaded={(url) => setForm({ ...form, image: url })}
            label="Service Image"
            folder="hospital-services"
            maxDimension={800}
            maxFileSizeMB={2}
          />

          <h4 style={{ margin: "10px 0 0", fontSize: 14 }}>Daily Limits</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            {DAYS.map((d) => {
              const val = form.daily_limits?.[d] ?? 0;
              return (
                <FormField key={d} label={d.toUpperCase()}>
                  <Input
                    type="number"
                    value={val}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        daily_limits: {
                          ...form.daily_limits,
                          [d]: Number(e.target.value),
                        },
                      })
                    }
                  />
                  {val === 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#dc2626",
                        fontWeight: 700,
                        marginTop: 2,
                        display: "block",
                      }}
                    >
                      OFF
                    </span>
                  )}
                </FormField>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* =============================================
          Manage Categories — draggable list
          ============================================= */}
      <Modal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        title="Manage Categories"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsLabelModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveCategories()}>
              Save Categories
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
            Add, remove, rename, or drag to reorder categories. The order here
            determines how they appear on the booking page.
          </p>

          {draftCategories.length === 0 && (
            <Banner variant="warning" inline>
              No categories yet. Add one below.
            </Banner>
          )}

          {draftCategories.map((cat, idx) => {
            const isDragging = draggedCatIndex === idx;
            const isOver = draggedCatOver === idx && draggedCatIndex !== idx;
            return (
              <div
                key={idx}
                draggable
                onDragStart={() => handleCatDragStart(idx)}
                onDragOver={(e) => handleCatDragOver(e, idx)}
                onDragEnd={handleCatDragEnd}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-end",
                  padding: 8,
                  borderRadius: 8,
                  border: isOver
                    ? "1px solid #1d4ed8"
                    : "1px solid transparent",
                  background: isDragging ? "#eff6ff" : "transparent",
                  opacity: isDragging ? 0.6 : 1,
                  transition: "background 0.12s ease, border-color 0.12s ease",
                }}
              >
                {/* Drag handle */}
                <div
                  title="Drag to reorder"
                  style={{
                    cursor: "grab",
                    color: "#94a3b8",
                    fontSize: 16,
                    padding: "0 4px 10px",
                    userSelect: "none",
                    lineHeight: 1,
                  }}
                >
                  ⋮⋮
                </div>

                <div style={{ flex: 1 }}>
                  <FormField label={`Category ${idx + 1}`}>
                    <Input
                      value={cat}
                      onChange={(e) => updateCategory(idx, e.target.value)}
                    />
                  </FormField>
                </div>

                <IconButton
                  variant="danger"
                  size="md"
                  onClick={() =>
                    setDeleteCategoryTarget({
                      index: idx,
                      name: cat || `Category ${idx + 1}`,
                    })
                  }
                  aria-label="Remove category"
                >
                  <TrashIcon width={16} height={16} fill="currentColor" />
                </IconButton>
              </div>
            );
          })}

          <Button
            variant="ghost"
            onClick={addCategory}
            leftIcon={<PlusIcon width={14} height={14} fill="currentColor" />}
          >
            Add Category
          </Button>
        </div>
      </Modal>

      {/* Filter Sheet */}
      <Sheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Services"
        mobileFullScreen
        maxHeightVh={86}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setFilterCategory("All");
                setFilterAvailability("all");
              }}
              block
            >
              Reset
            </Button>
            <Button onClick={() => setIsFilterOpen(false)} block>
              Apply
            </Button>
          </>
        }
      >
        <section style={{ marginBottom: 22 }}>
          <h4
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              textTransform: "uppercase",
              color: "#666",
            }}
          >
            Category
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["All", ...allCategories].map((c) => (
              <Chip
                key={c}
                tone="primary"
                active={filterCategory === c}
                onClick={() => setFilterCategory(c)}
              >
                {c}
              </Chip>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 22 }}>
          <h4
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              textTransform: "uppercase",
              color: "#666",
            }}
          >
            Availability Today
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { key: "all", label: "All" },
              { key: "todayAvailable", label: "Available Today" },
              { key: "todayUnavailable", label: "Unavailable Today (OFF)" },
            ].map((o) => (
              <Chip
                key={o.key}
                tone="primary"
                active={filterAvailability === o.key}
                onClick={() =>
                  setFilterAvailability(o.key as AvailabilityFilter)
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </section>
      </Sheet>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showSampleConfirm}
        title="Import Sample Data?"
        message="This will add the 36 default hospital services. If a service already exists, you will be asked to replace or skip."
        confirmText="Yes, Import Samples"
        variant="primary"
        onConfirm={handleImportSample}
        onCancel={() => setShowSampleConfirm(false)}
      />
      <ConfirmDialog
        isOpen={isImportConfirmOpen}
        title="Duplicate Services Found"
        message={
          <>
            <p>
              Found <strong>{importConflicts.length}</strong> service(s) that
              already exist in this category.
            </p>
            <p>
              Do you want to <strong>replace</strong> the existing services with
              the imported data, or skip these duplicates?
            </p>
          </>
        }
        confirmText="Replace Existing"
        cancelText="Skip Duplicates"
        variant="warning"
        onConfirm={() =>
          processImport(pendingImportNewItems, importConflicts, true)
        }
        onCancel={() =>
          processImport(pendingImportNewItems, importConflicts, false)
        }
      />
      <ConfirmDialog
        isOpen={!!deleteCategoryTarget}
        title="Delete Category?"
        message={
          <>
            Remove <strong>"{deleteCategoryTarget?.name}"</strong> from the
            category list?
            <br />
            <br />
            This also hides the category and every service inside it from both
            the admin listing and the customer booking page. Services are not
            deleted from the database unless you re-import or manage them
            separately.
          </>
        }
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDeleteCategory}
        onCancel={() => setDeleteCategoryTarget(null)}
      />

      <ConfirmDialog
  isOpen={!!deleteServiceTarget}
  title="Delete Service?"
  message={
    <>
      Permanently delete <strong>"{deleteServiceTarget?.name}"</strong>?
      <br />
      <br />
      This will remove the service from the admin listing and from the
      customer booking page. This cannot be undone.
    </>
  }
  confirmText="Yes, Delete"
  cancelText="Cancel"
  variant="danger"
  loading={isDeletingService}
  onConfirm={() => void confirmDeleteService()}
  onCancel={() => {
    if (isDeletingService) return;
    setDeleteServiceTarget(null);
  }}
/>
    </>
  );
}
