// src/components/Admin/PharmacyBillingHistory.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import {
  filterByRetention,
  pruneLocalBills,
} from "../../utils/historyRetention";
import { HISTORY_RETENTION_MONTHS } from "../../config/retention";
import { downloadPharmacyHistoryPdf } from "../../utils/pharmacyHistoryPdf";
import {
  Modal,
  Button,
  Input,
  EmptyState,
  Badge,
  IconButton,
  Sheet,
  Chip,
  FormField,
  Pagination,
  Card,
  Banner,
} from "../ui";
import {
  SearchIcon,
  FilterIcon,
  CloseIcon,
  DownloadIcon,
} from "../../assets/svgs";
import { formatRupees } from "../../utils/subscription";
import { printReceiptNode } from "../../utils/printReceipt";
import local from "./Pharmacy.module.scss";

interface BillHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "thisYear"
  | "custom";

const PAGE_SIZE = 12;
const billsKey = (slug: string) => `billing_history::${slug}`;

const normalizeBill = (b: any): any => {
  const num = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const fallbackId = [
    "bill",
    String(b.bill_no || b.billNo || ""),
    String(b.created_at || b.createdAt || ""),
    String(b.patient_name || b.customerName || ""),
  ].join("::");
  return {
    ...b,
    id: b.id ? String(b.id) : fallbackId,
    subtotal: num(b.subtotal),
    discount: num(b.discount),
    additional_discount_pct: num(b.additional_discount_pct),
    additional_discount: num(b.additional_discount),
    gst_percent: num(b.gst_percent),
    gst_amount: num(b.gst_amount),
    taxable_value: num(b.taxable_value),
    final_amount: num(b.final_amount),
    items: Array.isArray(b.items) ? b.items : [],
  };
};

const readCache = (key: string): any[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadAllBills = async (slug: string): Promise<any[]> => {
  pruneLocalBills(slug);

  void supabaseService
    .pruneOldHistoryOnServer(HISTORY_RETENTION_MONTHS)
    .catch(() => {});

  const localBills = readCache(billsKey(slug));

  let remoteBills: any[] = [];
  try {
    remoteBills = (await supabaseService.getPharmacyBills(slug)) ?? [];
  } catch (err) {
    console.warn("[pharmacy-history] supabase fetch failed:", err);
  }

  // Compose a unique key: prefer the bill number, fall back to the
  // row id, and append created_at so duplicates never collide.
  const keyOf = (b: any): string => {
    const billNo = String(b.bill_no || b.billNo || "").trim();
    const id = String(b.id || "").trim();
    const createdAt = String(b.created_at || b.createdAt || "");
    const base = billNo || id || "bill";
    return `${base}::${createdAt}`;
  };

  // Local wins on a true duplicate (same key), otherwise keep both.
  const byKey = new Map<string, any>();

  // Remote first so a same-key local row can override it.
  for (const b of remoteBills) {
    byKey.set(keyOf(b), b);
  }
  for (const b of localBills) {
    byKey.set(keyOf(b), b);
  }

  return filterByRetention(Array.from(byKey.values()), "created_at");
};

const DATE_OPTIONS: { key: DatePreset; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "thisYear", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const computeRange = (preset: DatePreset, from: string, to: string) => {
  const now = new Date();
  switch (preset) {
    case "all":
      return { from: null, to: null };
    case "today":
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return {
        from: startOfDay(y).toISOString(),
        to: endOfDay(y).toISOString(),
      };
    }
    case "thisWeek": {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      return {
        from: startOfDay(start).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    }
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: startOfDay(start).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    }
    case "thisYear": {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        from: startOfDay(start).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    }
    case "custom": {
      return {
        from: from ? new Date(`${from}T00:00:00`).toISOString() : null,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : null,
      };
    }
    default:
      return { from: null, to: null };
  }
};

interface FilterState {
  patient: string;
  phone: string;
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
}

const EMPTY_FILTERS: FilterState = {
  patient: "",
  phone: "",
  datePreset: "all",
  customFrom: "",
  customTo: "",
};

const normUnit = (u: string) =>
  (u || "").toLowerCase().trim().replace(/s$/, "");
const COUNTABLE_UNITS = new Set(["tablet", "capsule", "strip", "sachet"]);

function historyQtyLabel(it: any): string {
  const packOf = Math.max(1, Number(it.packOf) || Number(it.pack_of) || 1);
  const qty = Math.max(0, Number(it.qty) || 0);
  const extra = Math.max(0, Number(it.extraUnits) || 0);
  const u = normUnit(it.unit) || "unit";
  const countable = COUNTABLE_UNITS.has(u);
  if (countable && packOf > 1) {
    const parts: string[] = [];
    if (qty > 0) parts.push(`${qty} pack${qty !== 1 ? "s" : ""}`);
    if (extra > 0) parts.push(`${extra} ${u}${extra !== 1 ? "s" : ""}`);
    return parts.length ? parts.join(" + ") : "0";
  }
  if (qty > 0) return `${qty} pack${qty !== 1 ? "s" : ""}`;
  return "0";
}

function historyPackLabel(it: any): string {
  const packOf = Math.max(1, Number(it.packOf) || Number(it.pack_of) || 1);
  const u = normUnit(it.unit);
  if (packOf > 1 && u) return `${packOf} ${u}s`;
  return it.pack || `${packOf} pack`;
}

const PharmacyBillingHistory: React.FC<BillHistoryProps> = ({
  isOpen,
  onClose,
}) => {
  const { tenant } = useTenant();
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !tenant) return;
    let cancelled = false;
    setIsLoading(true);

    loadAllBills(tenant.slug)
      .then((list) => {
        if (cancelled) return;
        setBills(list.map(normalizeBill));
      })
      .catch((err) => {
        console.warn("[pharmacy-history] load failed:", err);
        if (!cancelled) setBills([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, tenant?.slug]);

  const suggestions = useMemo(() => {
    const patients = new Set<string>();
    const phones = new Set<string>();
    const doctors = new Set<string>();
    bills.forEach((b) => {
      if (b.patient_name) patients.add(b.patient_name);
      if (b.phone) phones.add(b.phone);
      if (b.doctor_name) doctors.add(b.doctor_name);
    });
    return {
      patients: Array.from(patients).sort(),
      phones: Array.from(phones).sort(),
      doctors: Array.from(doctors).sort(),
    };
  }, [bills]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const todayEnd = endOfDay(now).getTime();

    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayStart = startOfDay(y).getTime();
    const yesterdayEnd = endOfDay(y).getTime();

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let todayTotal = 0;
    let yesterdayTotal = 0;
    let monthTotal = 0;

    bills.forEach((b) => {
      const time = new Date(b.created_at).getTime();
      const amt = Number(b.final_amount) || 0;
      if (time >= todayStart && time <= todayEnd) todayTotal += amt;
      if (time >= yesterdayStart && time <= yesterdayEnd) yesterdayTotal += amt;
      if (time >= monthStart && time <= todayEnd) monthTotal += amt;
    });

    return { todayTotal, yesterdayTotal, monthTotal };
  }, [bills]);

  const filteredBills = useMemo(() => {
    let result = bills;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          String(b.bill_no || "")
            .toLowerCase()
            .includes(q) ||
          String(b.patient_name || "")
            .toLowerCase()
            .includes(q) ||
          String(b.phone || "")
            .toLowerCase()
            .includes(q) ||
          String(b.doctor_name || "")
            .toLowerCase()
            .includes(q),
      );
    }

    if (filters.patient.trim()) {
      result = result.filter((b) =>
        String(b.patient_name || "")
          .toLowerCase()
          .includes(filters.patient.toLowerCase()),
      );
    }
    if (filters.phone.trim()) {
      result = result.filter((b) =>
        String(b.phone || "").includes(filters.phone),
      );
    }

    const { from, to } = computeRange(
      filters.datePreset,
      filters.customFrom,
      filters.customTo,
    );
    if (from || to) {
      result = result.filter((b) => {
        const time = new Date(b.created_at).getTime();
        if (from && time < new Date(from).getTime()) return false;
        if (to && time > new Date(to).getTime()) return false;
        return true;
      });
    }

    return [...result].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [bills, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE));
  const paginatedBills = filteredBills.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const activeFilters = useMemo(() => {
    let count = 0;
    if (filters.patient.trim()) count++;
    if (filters.phone.trim()) count++;
    if (filters.datePreset !== "all") count++;
    return count;
  }, [filters]);

  const openFilterSheet = () => {
    setDraftFilters(filters);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
  };

  const openDetails = (bill: any) => {
    setSelectedBill(bill);
    setIsDetailsOpen(true);
  };

  const handlePrintHistoryBill = () => {
    if (!printRef.current) return;
    printReceiptNode(printRef.current, {
      title: `bill-${selectedBill?.bill_no ?? "history"}`,
      pageSize: "A5 landscape",
    });
  };

const handleExportAll = () => {
  if (!tenant || filteredBills.length === 0) return;
  downloadPharmacyHistoryPdf({
    rows: filteredBills.map((b) => ({
      id: b.id,
      bill_no: b.bill_no,
      patient_name: b.patient_name,
      phone: b.phone,
      address: b.address,
      ageYears: b.age_years ?? b.patient_age_years ?? null,
      ageMonths: b.age_months ?? b.patient_age_months ?? null,
      gender: b.gender ?? b.patient_gender ?? null,
      doctor_name: b.doctor_name,
      items: b.items || [],
      subtotal: Number(b.subtotal) || 0,
      discount: Number(b.discount) || 0,
      additional_discount_pct: Number(b.additional_discount_pct) || 0,
      additional_discount: Number(b.additional_discount) || 0,
      gst_percent: Number(b.gst_percent) || 0,
      gst_amount: Number(b.gst_amount) || 0,
      taxable_value: Number(b.taxable_value) || 0,
      final_amount: Number(b.final_amount) || 0,
      created_at: b.created_at,
    })),
    storeName: tenant.displayName,
    fromIso:
      filteredBills.length > 0
        ? filteredBills[filteredBills.length - 1].created_at
        : null,
    toIso:
      filteredBills.length > 0 ? filteredBills[0].created_at : null,
  });
};

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Pharmacy Bill History"
        size="xl"
        mobileFullScreen
        footer={
          <>
            <Button variant="ghost" onClick={onClose} block>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleExportAll}
              disabled={filteredBills.length === 0}
              leftIcon={
                <DownloadIcon width={14} height={14} fill="currentColor" />
              }
            >
              Export All
            </Button>
          </>
        }
      >
        <Banner
            variant="warning"
            inline
          >
            Please export regularly for not loosing data.
          </Banner>
        <div className={local.statsGrid}>
          <Card padding="sm" className={local.statCardToday}>
            <span className={local.statLabelToday}>Today's Sale</span>
            <div className={local.statValueToday}>
              {formatRupees(stats.todayTotal)}
            </div>
          </Card>
          <Card padding="sm" className={local.statCardYesterday}>
            <span className={local.statLabelYesterday}>Yesterday</span>
            <div className={local.statValueYesterday}>
              {formatRupees(stats.yesterdayTotal)}
            </div>
          </Card>
          <Card padding="sm" className={local.statCardMonth}>
            <span className={local.statLabelMonth}>This Month</span>
            <div className={local.statValueMonth}>
              {formatRupees(stats.monthTotal)}
            </div>
          </Card>
        </div>

        <div className={local.searchBarRow}>
          <div className={local.searchBarInputWrap}>
            <Input
              placeholder="Search by bill no, patient, phone, doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon width={16} height={16} fill="#b3b3b3" />}
              rightIcon={
                search ? (
                  <IconButton
                    variant="ghost"
                    size="xs"
                    aria-label="Clear search"
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
            onClick={openFilterSheet}
            leftIcon={<FilterIcon width={14} height={14} fill="currentColor" />}
            rightIcon={
              activeFilters > 0 ? (
                <span className={local.filterCount}>{activeFilters}</span>
              ) : undefined
            }
          >
            Filters
          </Button>
        </div>

        {isLoading ? (
          <p>Loading history...</p>
        ) : filteredBills.length === 0 ? (
          <EmptyState
            title="No bills found"
            description={
              search || activeFilters > 0
                ? "Try adjusting your filters or search query."
                : "Created bills will appear here."
            }
            action={
              (search || activeFilters > 0) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setFilters(EMPTY_FILTERS);
                  }}
                >
                  Clear all filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className={local.tableWrap}>
              <table className={local.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bill No</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBills.map((bill, index) => (
                    <tr key={`${bill.id || bill.bill_no || "bill"}::${index}`}>
                      <td>
                        {new Date(bill.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <strong>{bill.bill_no}</strong>
                      </td>
                      <td>
                        {bill.patient_name}
                        {bill.phone && (
                          <>
                            <br />
                            <small className={local.mutedSmall}>
                              {bill.phone}
                            </small>
                          </>
                        )}
                      </td>
                      <td>{bill.doctor_name || "-"}</td>
                      <td>
                        <Badge tone="neutral" size="sm">
                          {bill.items?.length || 0} meds
                        </Badge>
                      </td>
                      <td className={local.amountCell}>
                        {formatRupees(bill.final_amount)}
                      </td>
                      <td>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => openDetails(bill)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredBills.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </Modal>

      <Sheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Bill History"
        mobileFullScreen
        maxHeightVh={86}
        footer={
          <>
            <Button variant="ghost" onClick={resetFilters} block>
              Reset
            </Button>
            <Button onClick={applyFilters} block>
              Apply
            </Button>
          </>
        }
      >
        <section className={local.filterSection}>
          <h4 className={local.filterSectionHeading}>Patient Details</h4>
          <div className={local.filterFieldStack}>
            <FormField label="Patient Name">
              <Input
                value={draftFilters.patient}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, patient: e.target.value })
                }
                placeholder="Search patient name..."
                list="suggest-patients"
              />
              <datalist id="suggest-patients">
                {suggestions.patients.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Phone Number">
              <Input
                value={draftFilters.phone}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, phone: e.target.value })
                }
                placeholder="Search phone..."
                list="suggest-phones"
              />
              <datalist id="suggest-phones">
                {suggestions.phones.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </FormField>
          </div>
        </section>

        <section className={local.filterSection}>
          <h4 className={local.filterSectionHeading}>Date Range</h4>
          <div className={local.chipRow}>
            {DATE_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                tone="primary"
                active={draftFilters.datePreset === o.key}
                onClick={() =>
                  setDraftFilters({ ...draftFilters, datePreset: o.key })
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>

          {draftFilters.datePreset === "custom" && (
            <div className={local.dateRangeGrid}>
              <FormField label="From">
                <Input
                  type="date"
                  value={draftFilters.customFrom}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      customFrom: e.target.value,
                    })
                  }
                />
              </FormField>
              <FormField label="To">
                <Input
                  type="date"
                  value={draftFilters.customTo}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      customTo: e.target.value,
                    })
                  }
                />
              </FormField>
            </div>
          )}
        </section>
      </Sheet>

      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Bill Details - ${selectedBill?.bill_no}`}
        size="lg"
        mobileFullScreen
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            <Button onClick={handlePrintHistoryBill}>Print Bill</Button>
          </>
        }
      >
        {selectedBill && (
          <div>
            <div className={local.billHeader}>
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Patient</span>
                <span className={local.billHeaderValue}>
                  {selectedBill.patient_name || "—"}
                  {selectedBill.phone && (
                    <span className={local.billHeaderSub}>
                      {selectedBill.phone}
                    </span>
                  )}
                  {selectedBill.address || "—"}
                </span>
              </div>
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Doctor</span>
                <span className={local.billHeaderValue}>
                  {selectedBill.doctor_name || "N/A"}
                </span>
              </div>
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Date</span>
                <span className={local.billHeaderValue}>
                  {new Date(selectedBill.created_at).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className={local.tableWrap}>
              <table className={local.table}>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Pack Of</th>
                    <th>Batch</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.items?.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td>{it.name}</td>
                      <td>{historyPackLabel(it)}</td>
                      <td>{it.batch}</td>
                      <td>{historyQtyLabel(it)}</td>
                      <td>{formatRupees(it.price)}</td>
                      <td>{formatRupees(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`${local.totals} ${local.detailsTotals}`}>
              <div className={local.totalRow}>
                <span>Subtotal:</span>
                <span>{formatRupees(selectedBill.subtotal)}</span>
              </div>
              <div className={local.totalRow}>
                <span>Total Discount:</span>
                <span>-{formatRupees(selectedBill.discount)}</span>
              </div>
              {Number(selectedBill.additional_discount) > 0 && (
                <div className={local.totalRow}>
                  <span>
                    Additional Discount
                    {Number(selectedBill.additional_discount_pct) > 0
                      ? ` (${Number(selectedBill.additional_discount_pct)}%)`
                      : ""}
                    :
                  </span>
                  <span>-{formatRupees(selectedBill.additional_discount)}</span>
                </div>
              )}
              {Number(selectedBill.gst_amount) > 0 && (
                <div className={local.totalRow}>
                  <span>GST ({Number(selectedBill.gst_percent)}%):</span>
                  <span>{formatRupees(selectedBill.gst_amount)}</span>
                </div>
              )}
              <div className={`${local.totalRow} ${local.grandTotal}`}>
                <span>Final Amount:</span>
                <span>{formatRupees(selectedBill.final_amount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden A5 print */}
      <div className={local.printHiddenContainer}>
        {selectedBill && (
          <div ref={printRef} className={local.printPage}>
            <div className={local.printHeader}>
              <div className={local.printLeft}>
                <h2 className={local.printTitle}>
                  {tenant?.displayName || "Hospital Name"}
                </h2>
                {tenant?.storeTagline && (
                  <p className={local.printTagline}>{tenant.storeTagline}</p>
                )}
                {tenant?.storeAddress && (
                  <p className={local.printAddress}>{tenant.storeAddress}</p>
                )}
                {tenant?.whatsappPhone && (
                  <p className={local.printContact}>
                    Contact: {tenant.whatsappPhone}
                  </p>
                )}
              </div>
              <div className={local.printRight}>
                <h3>GST BILL</h3>
                {tenant?.gstNo && (
                  <p>
                    <strong>GSTIN:</strong> {tenant.gstNo}
                  </p>
                )}
                <p>Bill No.: {selectedBill.bill_no}</p>
                <p>
                  Date:{" "}
                  {new Date(selectedBill.created_at).toLocaleDateString(
                    "en-IN",
                  )}
                </p>
                <p>
                  Time:{" "}
                  {new Date(selectedBill.created_at).toLocaleTimeString(
                    "en-IN",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    },
                  )}
                </p>
              </div>
            </div>

            <div className={local.printPatientBar}>
              <p>
                <strong>Patient:</strong> {selectedBill.patient_name} (
                {selectedBill.phone})
              </p>
              <p>
                <strong>Address:</strong> {selectedBill.address}
              </p>
              <p>
                <strong>Doctor:</strong> {selectedBill.doctor_name}
              </p>
            </div>

            <table className={local.printTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicines</th>
                  <th>HSN</th>
                  <th>Pack</th>
                  <th>Batch</th>
                  <th>Exp</th>
                  <th>Qty (pack × loose)</th>
                  <th>MRP</th>
                  <th>Disc</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedBill.items?.map((it: any, index: number) => {
                  const packOf = Math.max(
                    1,
                    Number(it.packOf) || Number(it.pack_of) || 1,
                  );
                  const u = normUnit(it.unit) || "unit";
                  const countable = COUNTABLE_UNITS.has(u);
                  const qty = Math.max(0, Number(it.qty) || 0);
                  const extra = Math.max(0, Number(it.extraUnits) || 0);
                  const qtyCell =
                    countable && packOf > 1
                      ? `${qty} pk + ${extra} ${u}${extra !== 1 ? "s" : ""}`
                      : `${qty} pk`;

                  return (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{it.name}</td>
                      <td>{it.hsn}</td>
                      <td>{packOf > 1 ? `${packOf} ${u}s` : it.pack}</td>
                      <td>{it.batch}</td>
                      <td>{it.exp}</td>
                      <td>{qtyCell}</td>
                      <td>{Number(it.mrp || it.price || 0).toFixed(2)}</td>
                      <td>{it.discountPct}%</td>
                      <td>{Number(it.amount).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={local.printFooter}>
              <div className={local.printTerms}>
                <h4>Terms and conditions</h4>
                <div className={local.printTermsBody}>
                  {selectedBill.terms ||
                    `1. Goods once sold will not be taken back.\n2. Keep medicines out of reach of children.`}
                </div>
              </div>
              <div className={local.printTotals}>
                <p>Subtotal: {formatRupees(selectedBill.subtotal)}</p>
                <p>Discount: -{formatRupees(selectedBill.discount)}</p>
                {Number(selectedBill.additional_discount) > 0 && (
                  <p>
                    Additional Discount
                    {Number(selectedBill.additional_discount_pct) > 0
                      ? ` (${Number(selectedBill.additional_discount_pct)}%)`
                      : ""}
                    : -{formatRupees(selectedBill.additional_discount)}
                  </p>
                )}
                {Number(selectedBill.gst_amount) > 0 && (
                  <>
                    <p>
                      Taxable value:{" "}
                      {formatRupees(selectedBill.taxable_value || 0)}
                    </p>
                    <p>
                      GST ({Number(selectedBill.gst_percent)}%):{" "}
                      {formatRupees(selectedBill.gst_amount)}
                    </p>
                  </>
                )}
                <h3>Final Amount: {formatRupees(selectedBill.final_amount)}</h3>
              </div>
            </div>
            <div className={local.printGetWell}>Get Well Soon by Dozzelo</div>
          </div>
        )}
      </div>
    </>
  );
};

export default PharmacyBillingHistory;
