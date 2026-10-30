// src/components/Admin/PharmacyStockBody.tsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import { searchMedicineApi, ApiMedicineResult } from "../../utils/medicineApi";
import {
  Button,
  Input,
  Modal,
  FormField,
  IconButton,
  Chip,
  Pagination,
  Sheet,
  DropdownMenu,
  DropdownItem,
  ConfirmDialog,
} from "../ui";
import { InlineSection } from "../Dashboard/inline";
import {
  PlusIcon,
  SearchIcon,
  CloseIcon,
  FilterIcon,
  KebabIcon,
  DownloadIcon,
  CopyIcon,
  EditIcon,
  TrashIcon,
} from "../../assets/svgs";
import local from "./Pharmacy.module.scss";
const stockKey = (slug: string) => `pharmacy_stock_cache::${slug}`;

const writeCache = (key: string, list: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

interface PharmacyStockBodyProps {
  embedded?: boolean;
  onCountChange?: (n: number) => void;
}

export interface MedicineStock {
  id: string;
  name: string;
  composition: string;
  manufacturer: string;
  hsn_code: string;
  pack_size: string;
  pack_of: number;
  unit: string;
  batch_no: string;
  expiry_date: string;
  mrp: number;
  price: number;
  stock_qty: number;
  created_at?: string;
}

const emptyMed = {
  name: "",
  composition: "",
  manufacturer: "",
  hsnCode: "",
  packSize: "",
  packOf: 1,
  unit: "",
  batchNo: "",
  expiryDate: "",
  mrp: 0,
  price: 0,
  stockPacks: 0,
  stockLoose: 0, // ← NEW
  stockQty: 0,
};

const UNIT_OPTIONS = [
  "tablet",
  "capsule",
  "ml",
  "mg",
  "gm",
  "g",
  "strip",
  "bottle",
  "tube",
  "sachet",
  "drop",
  "inhaler",
  "patch",
  "injection",
];

/** Parse "Strip of 10 tablets" → { packOf: 10, unit: "tablet" } */
function parsePackString(pack: string): { packOf: number; unit: string } {
  if (!pack) return { packOf: 1, unit: "" };
  const lower = pack.toLowerCase();

  const match = lower.match(
  /(\d+(?:\.\d+)?)\s*(tablets?|capsules?|ml|mg|gm|g|strips?|bottles?|tubes?|sachets?|drops?|inhalers?|patches?|injections?)/,
);
  if (!match) return { packOf: 1, unit: "" };

  const packOf = Number(match[1]) || 1;
  let unit = match[2].replace(/s$/, "");
  if (unit === "g") unit = "gm";
  if (!UNIT_OPTIONS.includes(unit)) unit = "";

  return { packOf, unit };
}

const COUNTABLE_UNITS = new Set(["tablet", "capsule", "strip", "sachet"]);
const normUnit = (u: string) =>
  (u || "").toLowerCase().trim().replace(/s$/, "");
const isCountable = (unit: string) => COUNTABLE_UNITS.has(normUnit(unit));

/** Format stock_qty (in units) as "3 pack + 5 tablet" style */
function formatStockDisplay(
  stockQty: number,
  packOf: number,
  unit: string,
): { primary: string; breakdown: string | null } {
  const qty = Math.max(0, Number(stockQty) || 0);
  const po = Math.max(1, Number(packOf) || 1);
  const u = normUnit(unit) || "unit";
  const plural = (n: number) => `${u}${n !== 1 ? "s" : ""}`;

  // Non-countable units (ml, mg, gm) or packOf === 1 → plain qty
  if (!isCountable(u) || po === 1) {
    return { primary: `${qty} ${plural(qty)}`, breakdown: null };
  }

  const packs = Math.floor(qty / po);
  const loose = qty % po;

  const parts: string[] = [];
  if (packs > 0) parts.push(`${packs} pack${packs !== 1 ? "s" : ""}`);
  if (loose > 0) parts.push(`${loose} ${plural(loose)}`);
  if (parts.length === 0) parts.push(`0 ${plural(0)}`);

  return {
    primary: parts.join(" + "),
    breakdown: `(${qty} ${plural(qty)})`,
  };
}

const PAGE_SIZE = 12;

type StockStatus = "all" | "inStock" | "lowStock" | "outOfStock";
type ExpiryFilter = "all" | "expired" | "in3d" | "in7d" | "in30d";
type DatePreset = "all" | "today" | "thisWeek" | "thisMonth" | "custom";

interface StockFilters {
  status: StockStatus;
  expiry: ExpiryFilter;
  type: string; // "all" | unit name
  packOf: string; // "all" | numeric string
  minPrice: string;
  maxPrice: string;
  minMrp: string;
  maxMrp: string;
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
}

const EMPTY_FILTERS: StockFilters = {
  status: "all",
  expiry: "all",
  type: "all",
  packOf: "all",
  minPrice: "",
  maxPrice: "",
  minMrp: "",
  maxMrp: "",
  datePreset: "all",
  customFrom: "",
  customTo: "",
};

const PharmacyStockBody: React.FC<PharmacyStockBodyProps> = ({
  embedded = false,
  onCountChange,
}) => {
  const { tenant } = useTenant();
  const [stock, setStock] = useState<MedicineStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<MedicineStock | null>(null);

  // Import State
  const [importConflicts, setImportConflicts] = useState<any[]>([]);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<StockFilters>(EMPTY_FILTERS);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<StockFilters>(EMPTY_FILTERS);

  // Form State
  const [form, setForm] = useState({ ...emptyMed });

  // API Suggestions
  const [suggestions, setSuggestions] = useState<ApiMedicineResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStock = async () => {
    if (!tenant) return;
    setIsLoading(true);
    const data = await supabaseService.getMedicineStock(tenant.slug);
    setStock(data || []);
    // Mirror into localStorage so BillingBody can read it offline.
    writeCache(stockKey(tenant.slug), data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    setForm({ ...form, name: q });

    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    const res = await searchMedicineApi(q);
    setSuggestions(res);
    setIsSearching(false);
  };

  const selectSuggestion = (s: ApiMedicineResult) => {
    const parsed = parsePackString(s.packSize || "");
    setForm({
      ...form,
      name: s.name,
      composition: s.composition,
      manufacturer: s.manufacturer,
      packSize: s.packSize || form.packSize,
      packOf: parsed.packOf || form.packOf || 1,
      unit: parsed.unit || form.unit,
    });
    setSearchQuery(s.name);
    setSuggestions([]);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setForm({ ...emptyMed });
    setSearchQuery("");
    setSuggestions([]);
    setIsModalOpen(true);
  };

  const handleEdit = (item: MedicineStock) => {
    const parsed = parsePackString(item.pack_size || "");
    const packOf = Math.max(1, Number(item.pack_of) || parsed.packOf || 1);
    const unit = (item.unit || "").trim() || parsed.unit || "";

    const stockQty = Math.max(0, Number(item.stock_qty) || 0);
    const countable = isCountable(unit);

    // Split stock_qty into packs + loose units.
    // - If packOf === 1, everything is "packs" (1 unit = 1 pack).
    // - If countable, packs = floor(total / packOf), loose = total % packOf.
    // - If non-countable (ml/mg/gm), we don't split - treat as one big
    //   "pack" that equals the whole amount so the UI stays simple.
    let stockPacks = stockQty;
    let stockLoose = 0;

    if (packOf > 1 && countable) {
      stockPacks = Math.floor(stockQty / packOf);
      stockLoose = stockQty % packOf;
    }

    setEditingId(item.id);
    setForm({
      name: item.name,
      composition: item.composition || "",
      manufacturer: item.manufacturer || "",
      hsnCode: item.hsn_code || "",
      packSize: item.pack_size || "",
      packOf,
      unit,
      batchNo: item.batch_no || "",
      expiryDate: item.expiry_date || "",
      mrp: item.mrp || 0,
      price: item.price || 0,
      stockPacks,
      stockLoose,
      stockQty,
    });
    setSearchQuery(item.name);
    setSuggestions([]);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!tenant || !form.name) {
      alert("Medicine name is required");
      return;
    }

    setIsSaving(true);

    const packOf = Math.max(1, Number(form.packOf) || 1);
    const packs = Math.max(0, Math.floor(Number(form.stockPacks) || 0));

    const countable = isCountable(form.unit);
    const looseRaw = Math.max(0, Math.floor(Number(form.stockLoose) || 0));
    // Loose units can't exceed a full pack.
    const loose = packOf > 1 && countable ? Math.min(looseRaw, packOf - 1) : 0;

    // What gets stored on the server, in units.
    const stockUnits =
      packOf > 1 && countable ? packs * packOf + loose : packs * packOf; // non-countable: treat entered qty as single packs

    const payload = {
      name: form.name,
      composition: form.composition,
      manufacturer: form.manufacturer,
      hsn_code: form.hsnCode,
      pack_size: form.packSize,
      pack_of: packOf,
      unit: form.unit || null,
      batch_no: form.batchNo,
      expiry_date: form.expiryDate || null,
      mrp: form.mrp,
      price: form.price,
      stock_qty: stockUnits,
    };

    let success = false;

    if (editingId) {
      success = await supabaseService.editMedicineStock(
        tenant.slug,
        editingId,
        payload,
      );
      if (success) {
        setStock((prev) =>
          prev.map((s) =>
            s.id === editingId ? ({ ...s, ...payload } as MedicineStock) : s,
          ),
        );
      }
    } else {
      const newItem = await supabaseService.addMedicineStock(
        tenant.slug,
        payload,
      );
      if (newItem) {
        success = true;
        setStock((prev) => [newItem, ...prev]);
      }
    }

    setIsSaving(false);

    if (success) {
      setIsModalOpen(false);
      setForm({ ...emptyMed });
      setSearchQuery("");
      setSuggestions([]);
      setEditingId(null);
    } else {
      alert("Failed to save medicine. Please check the console.");
    }
  };

  const handleDelete = async () => {
    if (!tenant || !deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleteTarget(null);

    const ok = await supabaseService.deleteMedicineStock(tenant.slug, targetId);

    if (ok) {
      setStock((prev) => prev.filter((s) => s.id !== targetId));
    } else {
      alert(
        "Failed to delete medicine. It may have already been removed or you do not have permission.",
      );
      loadStock();
    }
  };

  const handleExport = () => {
    const exportData = filteredStock.map((s) => ({
      name: s.name,
      composition: s.composition,
      manufacturer: s.manufacturer,
      hsn_code: s.hsn_code,
      pack_size: s.pack_size,
      pack_of: s.pack_of,
      unit: s.unit,
      batch_no: s.batch_no,
      expiry_date: s.expiry_date,
      mrp: s.mrp,
      price: s.price,
      stock_qty: s.stock_qty,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pharmacy-stock-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error("Invalid format");

        const conflicts: any[] = [];
        const newItems: any[] = [];

        parsed.forEach((item: any) => {
          const existing = stock.find(
            (s) =>
              s.name.toLowerCase() === item.name?.toLowerCase() &&
              s.batch_no?.toLowerCase() === item.batch_no?.toLowerCase(),
          );
          if (existing) {
            conflicts.push({ imported: item, existing });
          } else {
            newItems.push(item);
          }
        });

        if (conflicts.length > 0) {
          setImportConflicts(conflicts);
          setImportConflicts((prev: any) => {
            (prev as any).newItems = newItems;
            return prev;
          });
          setIsImportConfirmOpen(true);
        } else {
          processImport(newItems, [], false);
        }
      } catch (err) {
        alert(
          "Failed to import file. Please ensure it is a valid JSON export.",
        );
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const processImport = async (
    newItems: any[],
    conflicts: any[],
    replaceConflicts: boolean,
  ) => {
    if (!tenant) return;
    setIsImportConfirmOpen(false);
    setIsLoading(true);

    for (const item of newItems) {
      const payload = buildPayload(item);
      await supabaseService.addMedicineStock(tenant.slug, payload);
    }

    if (replaceConflicts) {
      for (const c of conflicts) {
        const payload = buildPayload(c.imported);
        await supabaseService.editMedicineStock(
          tenant.slug,
          c.existing.id,
          payload,
        );
      }
    }

    await loadStock();
    setIsLoading(false);
    setImportConflicts([]);
    alert(`Import complete.`);
  };

  const buildPayload = (item: any) => ({
    name: item.name,
    composition: item.composition || "",
    manufacturer: item.manufacturer || "",
    hsn_code: item.hsn_code || "",
    pack_size: item.pack_size || "",
    pack_of: item.pack_of || 1,
    unit: item.unit || null,
    batch_no: item.batch_no || "",
    expiry_date: item.expiry_date || null,
    mrp: item.mrp || 0,
    price: item.price || 0,
    stock_qty: item.stock_qty || 0,
  });

  // ---- helpers ----
  const daysUntilExpiry = (dateStr?: string | null): number | null => {
    if (!dateStr) return null;
    const t = new Date(dateStr).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const filtersActive =
    filters.status !== "all" ||
    filters.expiry !== "all" ||
    filters.type !== "all" ||
    filters.packOf !== "all" ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.minMrp !== "" ||
    filters.maxMrp !== "" ||
    filters.datePreset !== "all";

  const filteredStock = useMemo(() => {
    let result = stock;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.composition?.toLowerCase().includes(q) ||
          s.manufacturer?.toLowerCase().includes(q) ||
          s.batch_no?.toLowerCase().includes(q),
      );
    }

    // Stock status
    if (filters.status === "inStock")
      result = result.filter((s) => Number(s.stock_qty) > 0);
    else if (filters.status === "lowStock")
      result = result.filter(
        (s) => Number(s.stock_qty) > 0 && Number(s.stock_qty) < 10,
      );
    else if (filters.status === "outOfStock")
      result = result.filter((s) => Number(s.stock_qty) === 0);

    // Expiry
    if (filters.expiry !== "all") {
      result = result.filter((s) => {
        const d = daysUntilExpiry(s.expiry_date);
        if (d === null) return false;
        if (filters.expiry === "expired") return d < 0;
        if (filters.expiry === "in3d") return d >= 0 && d <= 3;
        if (filters.expiry === "in7d") return d >= 0 && d <= 7;
        if (filters.expiry === "in30d") return d >= 0 && d <= 30;
        return true;
      });
    }

    // Unit type
    if (filters.type !== "all") {
      const t = normUnit(filters.type);
      result = result.filter((s) => normUnit(s.unit) === t);
    }

    // Pack of
    if (filters.packOf !== "all" && filters.packOf.trim() !== "") {
      const target = Number(filters.packOf);
      if (Number.isFinite(target)) {
        result = result.filter(
          (s) => Math.max(1, Number(s.pack_of) || 1) === target,
        );
      }
    }

    // Price range
    if (filters.minPrice)
      result = result.filter(
        (s) => Number(s.price) >= Number(filters.minPrice),
      );
    if (filters.maxPrice)
      result = result.filter(
        (s) => Number(s.price) <= Number(filters.maxPrice),
      );

    // MRP range
    if (filters.minMrp)
      result = result.filter((s) => Number(s.mrp) >= Number(filters.minMrp));
    if (filters.maxMrp)
      result = result.filter((s) => Number(s.mrp) <= Number(filters.maxMrp));

    // Added date
    if (filters.datePreset !== "all" && filters.datePreset !== "custom") {
      const now = new Date();
      let fromDate = new Date();
      if (filters.datePreset === "today") fromDate.setHours(0, 0, 0, 0);
      else if (filters.datePreset === "thisWeek") {
        const day = fromDate.getDay();
        fromDate.setDate(fromDate.getDate() - day + (day === 0 ? -6 : 1));
        fromDate.setHours(0, 0, 0, 0);
      } else if (filters.datePreset === "thisMonth") {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      result = result.filter((s) => {
        if (!s.created_at) return false;
        return new Date(s.created_at).getTime() >= fromDate.getTime();
      });
    } else if (filters.datePreset === "custom") {
      result = result.filter((s) => {
        if (!s.created_at) return false;
        const time = new Date(s.created_at).getTime();
        if (
          filters.customFrom &&
          time < new Date(`${filters.customFrom}T00:00:00`).getTime()
        )
          return false;
        if (
          filters.customTo &&
          time > new Date(`${filters.customTo}T23:59:59`).getTime()
        )
          return false;
        return true;
      });
    }

    return result;
  }, [stock, searchQuery, filters]);

  // ---- severity ordering ----
  // 2 = danger (expired OR out of stock)
  // 1 = warning (0 < packs <= 5, where "packs" is total units / packOf)
  // 0 = normal
  const severityOf = (s: MedicineStock): 0 | 1 | 2 => {
    const days = daysUntilExpiry(s.expiry_date);
    const qty = Math.max(0, Number(s.stock_qty) || 0);
    const packOf = Math.max(1, Number(s.pack_of) || 1);
    const countable = isCountable(s.unit);
    const packs = countable && packOf > 1 ? Math.floor(qty / packOf) : qty;

    if (qty === 0) return 2;
    if (days !== null && days < 0) return 2;
    if (packs > 0 && packs <= 5) return 1;
    return 0;
  };

  // Classify a row so we know which specific cells to tint.
  const expiryTone = (s: MedicineStock): "danger" | null => {
    const d = daysUntilExpiry(s.expiry_date);
    return d !== null && d < 0 ? "danger" : null;
  };

  const qtyTone = (s: MedicineStock): "danger" | "warning" | null => {
    const qty = Math.max(0, Number(s.stock_qty) || 0);
    if (qty === 0) return "danger";
    const packOf = Math.max(1, Number(s.pack_of) || 1);
    const countable = isCountable(s.unit);
    const packs = countable && packOf > 1 ? Math.floor(qty / packOf) : qty;
    return packs > 0 && packs <= 5 ? "warning" : null;
  };

  const orderedStock = useMemo(() => {
    const list = [...filteredStock];
    list.sort((a, b) => {
      const sa = severityOf(a);
      const sb = severityOf(b);
      if (sa !== sb) return sb - sa; // danger first, warning next
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [filteredStock]);

  // Paginate over the ordered list.
  const totalPages = Math.max(1, Math.ceil(orderedStock.length / PAGE_SIZE));
  const paginatedStock = orderedStock.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (onCountChange) onCountChange(orderedStock.length);
  }, [orderedStock.length, onCountChange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.expiry !== "all") count++;
    if (filters.type !== "all") count++;
    if (filters.packOf !== "all") count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.minMrp || filters.maxMrp) count++;
    if (filters.datePreset !== "all") count++;
    return count;
  }, [filters]);

  const openFilterSheet = () => {
    setDraftFilters(filters);
    setIsFilterSheetOpen(true);
  };

  return (
    <>
      <InlineSection
        title={`Pharmacy Stock (${filteredStock.length})`}
        embedded={embedded}
        actions={
          <div className={local.stockHeaderActions}>
            <Button
              size="sm"
              variant={activeFilterCount > 0 ? "primary" : "ghost"}
              onClick={openFilterSheet}
              leftIcon={
                <FilterIcon width={14} height={14} fill="currentColor" />
              }
            >
              Filters
              {activeFilterCount > 0 && (
                <span className={local.filterCount}>{activeFilterCount}</span>
              )}
            </Button>

            <DropdownMenu
              trigger={({ toggle }) => (
                <IconButton
                  variant="ghost"
                  size="md"
                  aria-label="Stock settings"
                  onClick={toggle}
                >
                  <KebabIcon width={20} height={20} fill="#0F172A" />
                </IconButton>
              )}
            >
              {({ close }) => (
                <>
                  <DropdownItem
                    onClick={() => {
                      close();
                      handleExport();
                    }}
                  >
                    <span className={local.dropdownRow}>
                      <DownloadIcon
                        width={16}
                        height={16}
                        fill="currentColor"
                      />
                      Export All
                    </span>
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      close();
                      fileInputRef.current?.click();
                    }}
                  >
                    <span className={local.dropdownRow}>
                      <CopyIcon width={16} height={16} fill="currentColor" />
                      Import Items
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
          onChange={handleImport}
        />

        <div className={local.stockSearchRow}>
          <div className={local.stockSearchInputWrap}>
            <Input
              placeholder="Search medicines by name, composition, or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<SearchIcon width={16} height={16} fill="#b3b3b3" />}
              rightIcon={
                searchQuery ? (
                  <IconButton
                    variant="ghost"
                    size="xs"
                    aria-label="Clear search"
                    onClick={() => setSearchQuery("")}
                  >
                    <CloseIcon width={14} height={14} fill="#4d4d4d" />
                  </IconButton>
                ) : undefined
              }
            />
          </div>
        </div>

        <div className={local.quickFiltersRow}>
          <Chip
            tone="primary"
            active={filters.status === "inStock"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                status: f.status === "inStock" ? "all" : "inStock",
              }))
            }
          >
            In stock
          </Chip>
          <Chip
            tone="primary"
            active={filters.status === "outOfStock"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                status: f.status === "outOfStock" ? "all" : "outOfStock",
              }))
            }
          >
            Out of stock
          </Chip>
          <Chip
            tone="primary"
            active={filters.status === "lowStock"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                status: f.status === "lowStock" ? "all" : "lowStock",
              }))
            }
          >
            Low stock
          </Chip>
          <Chip
            tone="primary"
            active={filters.expiry === "expired"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                expiry: f.expiry === "expired" ? "all" : "expired",
              }))
            }
          >
            Expired
          </Chip>
          <Chip
            tone="primary"
            active={filters.expiry === "in3d"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                expiry: f.expiry === "in3d" ? "all" : "in3d",
              }))
            }
          >
            In 3 days
          </Chip>
          <Chip
            tone="primary"
            active={filters.expiry === "in7d"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                expiry: f.expiry === "in7d" ? "all" : "in7d",
              }))
            }
          >
            In 7 days
          </Chip>
          <Chip
            tone="primary"
            active={filters.expiry === "in30d"}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                expiry: f.expiry === "in30d" ? "all" : "in30d",
              }))
            }
          >
            In 1 month
          </Chip>

          <Button
            size="sm"
            variant={activeFilterCount > 0 ? "primary" : "ghost"}
            onClick={openFilterSheet}
            leftIcon={<FilterIcon width={14} height={14} fill="currentColor" />}
          >
            More
            {activeFilterCount > 0 && (
              <span className={local.filterCount}>{activeFilterCount}</span>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className={local.loadingState}>Loading stock...</div>
        ) : filteredStock.length === 0 ? (
          <p>No medicines found matching your criteria.</p>
        ) : (
          <>
            <div className={local.stockTableWrap}>
              <table className={local.table}>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    {/* <th>Manufacturer</th> */}
                    <th>HSN</th>
                    <th>Pack Of</th>
                    <th>Batch No</th>
                    <th>Expiry Date</th>
                    <th>Qty in Stock</th>
                    <th>MRP</th>
                    <th>Sale Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStock.map((s) => {
                    const packOf = Math.max(1, Number(s.pack_of) || 1);
                    const display = formatStockDisplay(
                      s.stock_qty,
                      packOf,
                      s.unit,
                    );
                    const low = s.stock_qty > 0 && s.stock_qty < 10;

                    const expiryDanger = expiryTone(s) === "danger";
                    const qtyDanger = qtyTone(s) === "danger";
                    const qtyWarning = qtyTone(s) === "warning";

                    return (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.name}</strong>
                          {s.composition && (
                            <>
                              <br />
                              <small className={local.mutedSmall}>
                                {s.composition}
                                <br />
                                <strong>{s.manufacturer || ""}</strong>
                              </small>
                            </>
                          )}
                        </td>
                        {/* <td>{s.manufacturer || "-"}</td> */}
                        <td>{s.hsn_code || "-"}</td>
                        <td>
                          {s.pack_of && s.unit
                            ? `${packOf} ${normUnit(s.unit)}${
                                packOf !== 1 ? "s" : ""
                              }`
                            : s.pack_size || "-"}
                        </td>
                        <td>{s.batch_no || "-"}</td>
                        <td
                          className={
                            expiryDanger ? local.cellDangerExpiry : undefined
                          }
                        >
                          {s.expiry_date || "-"}
                        </td>
                        <td className={
          qtyDanger
            ? local.cellDangerQty
            : qtyWarning
              ? local.cellWarningQty
              : undefined
        }>
                          <span
                            className={low ? local.lowStock : ""}
                            style={{ fontWeight: 600 }}
                          >
                            {display.primary}
                          </span>
                          {display.breakdown && (
                            <small className={local.stockBreakdown}>
                              {" "}
                              {display.breakdown}
                            </small>
                          )}
                        </td>
                        <td>Rs {s.mrp}</td>
                        <td>Rs {s.price}</td>
                        <td>
                          <DropdownMenu
                            trigger={({ toggle }) => (
                              <IconButton
                                variant="ghost"
                                size="sm"
                                onClick={toggle}
                              >
                                <KebabIcon width={16} height={16} fill="#666" />
                              </IconButton>
                            )}
                          >
                            {({ close }) => (
                              <>
                                <DropdownItem
                                  onClick={() => {
                                    close();
                                    handleEdit(s);
                                  }}
                                >
                                  <span className={local.dropdownRow}>
                                    <EditIcon
                                      width={14}
                                      height={14}
                                      fill="currentColor"
                                    />
                                    Edit
                                  </span>
                                </DropdownItem>
                                <DropdownItem
                                  tone="danger"
                                  onClick={() => {
                                    close();
                                    setDeleteTarget(s);
                                  }}
                                >
                                  <span className={local.dropdownRow}>
                                    <TrashIcon
                                      width={14}
                                      height={14}
                                      fill="currentColor"
                                    />
                                    Delete
                                  </span>
                                </DropdownItem>
                              </>
                            )}
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredStock.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}

        <div className={local.addMedicineFab}>
          <Button
            onClick={handleAddNew}
            leftIcon={<PlusIcon width={18} height={18} fill="#fff" />}
            className={local.addMedicineFabBtn}
          >
            Add Medicine
          </Button>
        </div>
      </InlineSection>

      {/* Add / Edit Medicine Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (isSaving) return;
          setIsModalOpen(false);
        }}
        title={editingId ? "Edit Medicine" : "Add Medicine to Stock"}
        size="lg"
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
              {editingId ? "Save Changes" : "Save Medicine"}
            </Button>
          </>
        }
      >
        <div className={local.formGrid}>
          <div className={local.medNameWrap}>
            <FormField label="Medicine Name *">
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="e.g., Paracetamol or Calpol"
                autoFocus
              />
            </FormField>
            {isSearching && (
              <small className={local.searchingHint}>Searching...</small>
            )}
            {suggestions.length > 0 && (
              <ul className={local.suggestions}>
                {suggestions.map((s, i) => (
                  <li key={i} onClick={() => selectSuggestion(s)}>
                    <strong>{s.name}</strong>
                    <div>{s.composition}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <FormField label="Composition / Generic Name">
            <Input
              value={form.composition}
              onChange={(e) =>
                setForm({ ...form, composition: e.target.value })
              }
            />
          </FormField>

          <div className={local.grid2}>
            <FormField label="HSN Code">
              <Input
                value={form.hsnCode}
                onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                placeholder="e.g. 3004"
              />
            </FormField>
            <FormField label="Manufacturer">
              <Input
                value={form.manufacturer}
                onChange={(e) =>
                  setForm({ ...form, manufacturer: e.target.value })
                }
                placeholder="e.g. Cipla"
              />
            </FormField>
          </div>

          {/* Pack Of + Unit */}
          <div className={local.grid2}>
            <FormField label="Pack Of">
              <Input
                type="number"
                min="1"
                value={form.packOf || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    packOf: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                placeholder="e.g. 10"
              />
            </FormField>
            <FormField label="Unit">
              <Input
                list="unit-options"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="tablet / ml / mg / gm"
              />
              <datalist id="unit-options">
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </FormField>
          </div>

          <div className={local.grid2}>
            <FormField label="Batch No">
              <Input
                value={form.batchNo}
                onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
              />
            </FormField>
            <FormField label="Expiry Date">
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm({ ...form, expiryDate: e.target.value })
                }
              />
            </FormField>
          </div>

          <div className={local.grid3}>
            <FormField label="MRP (Rs)">
              <Input
                type="number"
                value={form.mrp || ""}
                onChange={(e) =>
                  setForm({ ...form, mrp: Number(e.target.value) })
                }
              />
            </FormField>
            <FormField label="Selling Price">
              <Input
                type="number"
                value={form.price || ""}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
                placeholder="Price per pack"
              />
              {form.packOf > 1 && form.price > 0 && (
                <small className={local.stockQtyHint}>
                  = Rs {(form.price / form.packOf).toFixed(2)} /{" "}
                  {normUnit(form.unit) || "unit"}
                </small>
              )}
            </FormField>
            <FormField
              label={
                form.packOf > 1
                  ? `Qty in Stock (packs + loose ${normUnit(form.unit) || "units"})`
                  : `Qty in Stock${form.unit ? ` (${normUnit(form.unit)}s)` : ""}`
              }
            >
              {form.packOf > 1 && isCountable(form.unit) ? (
                <>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stockPacks || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          stockPacks: Math.max(
                            0,
                            Math.floor(Number(e.target.value) || 0),
                          ),
                        })
                      }
                      placeholder="Packs"
                    />
                    <span style={{ fontWeight: 600, color: "#94a3b8" }}>+</span>
                    <Input
                      type="number"
                      min="0"
                      max={form.packOf - 1}
                      step="1"
                      value={form.stockLoose || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          stockLoose: Math.max(
                            0,
                            Math.min(
                              Number(e.target.value) || 0,
                              form.packOf - 1,
                            ),
                          ),
                        })
                      }
                      placeholder={`Loose ${normUnit(form.unit) || "units"}`}
                    />
                  </div>
                  <small className={local.stockQtyHint}>
                    ={" "}
                    {(Number(form.stockPacks) || 0) * form.packOf +
                      (Number(form.stockLoose) || 0)}{" "}
                    {normUnit(form.unit)}s in stock
                  </small>
                </>
              ) : (
                <>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.stockPacks || ""}
                    onChange={(e) =>
                      setForm({ ...form, stockPacks: Number(e.target.value) })
                    }
                    placeholder="e.g., 3"
                  />
                  {form.packOf > 1 && form.unit && (
                    <small className={local.stockQtyHint}>
                      ={" "}
                      {Math.round((Number(form.stockPacks) || 0) * form.packOf)}{" "}
                      {normUnit(form.unit)}s in stock
                    </small>
                  )}
                </>
              )}
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Medicine"
        message={
          <>
            Are you sure you want to permanently delete{" "}
            <strong>{deleteTarget?.name}</strong> (Batch:{" "}
            {deleteTarget?.batch_no}) from stock? This cannot be undone.
          </>
        }
        confirmText="Yes, Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Import Conflict Confirmation */}
      <ConfirmDialog
        isOpen={isImportConfirmOpen}
        title="Duplicate Medicines Found"
        message={
          <>
            <p>
              Found <strong>{importConflicts.length}</strong> medicine(s) that
              already exist in your stock (matching name and batch).
            </p>
            <p>
              Do you want to <strong>replace</strong> the existing stock with
              the imported data, or skip these duplicates?
            </p>
          </>
        }
        confirmText="Replace Existing"
        cancelText="Skip Duplicates"
        variant="warning"
        onConfirm={() =>
          processImport(
            (importConflicts as any).newItems || [],
            importConflicts,
            true,
          )
        }
        onCancel={() =>
          processImport(
            (importConflicts as any).newItems || [],
            importConflicts,
            false,
          )
        }
      />

      {/* Filter Sheet */}
      <Sheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filter Stock"
        mobileFullScreen
        maxHeightVh={86}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDraftFilters(EMPTY_FILTERS)}
              block
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                setFilters(draftFilters);
                setIsFilterSheetOpen(false);
              }}
              block
            >
              Apply Filters
            </Button>
          </>
        }
      >
        <section className={local.filterSection}>
          <h4 className={local.filterSectionHeading}>MRP Range (Rs)</h4>
          <div className={local.dateRangeGrid}>
            <FormField label="Min MRP">
              <Input
                type="number"
                value={draftFilters.minMrp}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, minMrp: e.target.value })
                }
              />
            </FormField>
            <FormField label="Max MRP">
              <Input
                type="number"
                value={draftFilters.maxMrp}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, maxMrp: e.target.value })
                }
              />
            </FormField>
          </div>
        </section>

        <section className={local.filterSection}>
  <h4 className={local.filterSectionHeading}>Medicine type</h4>
  <div className={local.chipRow}>
    <Chip
      tone="primary"
      active={draftFilters.type === "all"}
      onClick={() =>
        setDraftFilters({ ...draftFilters, type: "all" })
      }
    >
      All
    </Chip>

    {Array.from(
      new Set(
        stock
          .map((s) => normUnit(s.unit))
          .filter((u) => u.length > 0),
      ),
    )
      .sort()
      .map((u) => (
        <Chip
          key={u}
          tone="primary"
          active={draftFilters.type === u}
          onClick={() =>
            setDraftFilters({
              ...draftFilters,
              type: draftFilters.type === u ? "all" : u,
            })
          }
        >
          {u.charAt(0).toUpperCase() + u.slice(1)}
        </Chip>
      ))}
  </div>
</section>

        <section className={local.filterSection}>
          <h4 className={local.filterSectionHeading}>Pack of</h4>
          <FormField label="Units per pack">
            <Input
              type="number"
              min="1"
              placeholder="e.g. 10"
              value={draftFilters.packOf === "all" ? "" : draftFilters.packOf}
              onChange={(e) =>
                setDraftFilters({
                  ...draftFilters,
                  packOf: e.target.value === "" ? "all" : e.target.value,
                })
              }
            />
          </FormField>
        </section>
      </Sheet>
    </>
  );
};

export default PharmacyStockBody;
