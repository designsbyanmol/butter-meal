// src/components/Admin/HospitalIpdHistory.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
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
import {
  IpdBill,
  IpdDischargeType,
  IPD_DISCHARGE_LABELS,
  HospitalParticular,
} from "../../types";
import HospitalIpdPrintLayout from "./HospitalIpdPrintLayout";
import HospitalIpdBilling from "./HospitalIpdBilling";
import local from "./Pharmacy.module.scss";

interface Props {
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
    case "custom":
      return {
        from: from ? new Date(`${from}T00:00:00`).toISOString() : null,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : null,
      };
    default:
      return { from: null, to: null };
  }
};

type DischargeFilter =
  | "all" // no filter
  | "none" // discharge_type IS NULL (not discharged)
  | IpdDischargeType;

interface FilterState {
  patient: string;
  billNo: string;
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
  discharge: DischargeFilter;
}

const EMPTY_FILTERS: FilterState = {
  patient: "",
  billNo: "",
  datePreset: "all",
  customFrom: "",
  customTo: "",
  discharge: "all",
};

type PrintFlow =
  | { step: "closed" }
  | { step: "pickDischarge"; bill: IpdBill }
  | { step: "askPaid"; bill: IpdBill; discharge: IpdDischargeType | null }
  | {
      step: "confirmed";
      bill: IpdBill;
      discharge: IpdDischargeType | null;
    };

const HospitalIpdHistory: React.FC<Props> = ({ isOpen, onClose }) => {
  const { tenant } = useTenant();

  const [bills, setBills] = useState<IpdBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedBill, setSelectedBill] = useState<IpdBill | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [printFlow, setPrintFlow] = useState<PrintFlow>({ step: "closed" });
  const [pendingDischarge, setPendingDischarge] =
    useState<IpdDischargeType | null>(null);
  const [isSavingDischarge, setIsSavingDischarge] = useState(false);
  const [dischargeForPrint, setDischargeForPrint] =
    useState<IpdDischargeType | null>(null);

  const [editingBill, setEditingBill] = useState<IpdBill | null>(null);
  const [particulars, setParticulars] = useState<HospitalParticular[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  // ── Loader (used by mount effect AND by edit-save refresh) ──
  const load = useCallback(async () => {
    if (!tenant) return;
    setIsLoading(true);
    try {
      const list = await supabaseService.getIpdBills(tenant.slug);
      setBills(list);
    } catch (err) {
      console.warn("[ipd-history] load failed:", err);
      setBills([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.slug]);

  const BILL_QUERY_KEY = "bill";

const readBillIdFromUrl = (): string | null => {
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get(BILL_QUERY_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
};

const writeBillIdToUrl = (billId: string | null) => {
  try {
    const url = new URL(window.location.href);
    if (billId) url.searchParams.set(BILL_QUERY_KEY, billId);
    else url.searchParams.delete(BILL_QUERY_KEY);
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* ignore */
  }
};

  useEffect(() => {
    if (!isOpen) return;
    void load();
  }, [isOpen, load]);


  // Reopen the details modal if ?bill=<id> is in the URL and the
// bill is present in the loaded list. Runs whenever `bills` changes,
// so it works on the first load and on any subsequent reload/refetch.
const didRestoreRef = useRef(false);
useEffect(() => {
  if (didRestoreRef.current) return;
  if (isLoading) return;
  if (!isOpen) return;

  const id = readBillIdFromUrl();
  if (!id) {
    didRestoreRef.current = true;
    return;
  }

  const bill = bills.find((b) => String(b.id) === id);
  if (bill) {
    setSelectedBill(bill);
    setIsDetailsOpen(true);
  } else {
    // Bill no longer exists (deleted, or outside retention window).
    // Drop the URL param so a further reload doesn't try again.
    writeBillIdToUrl(null);
  }
  didRestoreRef.current = true;
}, [bills, isLoading, isOpen]);

  // Load particulars once per open so the edit form can render chips.
  useEffect(() => {
    if (!isOpen || !tenant) return;
    let cancelled = false;
    supabaseService
      .getHospitalParticulars(tenant.slug)
      .then((list) => {
        if (!cancelled) setParticulars(list);
      })
      .catch(() => {
        if (!cancelled) setParticulars([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, tenant?.slug]);

  // ── Derived print bill + discharge ──
  // When a print flow is in progress, prefer its bill (so we print the
  // bill the user actually asked to print). Fall back to selectedBill
  // for a plain reprint-from-details path.
  const printBill =
    (printFlow.step !== "closed" &&
      printFlow.step !== "pickDischarge" &&
      printFlow.bill) ||
    selectedBill;

  const printDischarge =
    (printFlow.step === "askPaid" || printFlow.step === "confirmed"
      ? printFlow.discharge
      : null) ??
    dischargeForPrint ??
    printBill?.discharge_type ??
    null;

  // ── Trigger print on the correct DOM node ──
  const triggerPrint = useCallback(() => {
    if (!printRef.current) return;
    const title = printBill?.bill_no
      ? `ipd-${printBill.bill_no}`
      : "ipd-history";
    printReceiptNode(printRef.current, {
      title,
      pageSize: "A4 portrait",
    });
  }, [printBill?.bill_no]);

  // Fire the actual print on the frame *after* the confirmed state
  // commits, so the DOM has been updated with `printBill` + `printDischarge`.
  useEffect(() => {
    if (printFlow.step !== "confirmed") return;
    const raf = requestAnimationFrame(() => {
      triggerPrint();
      setPrintFlow({ step: "closed" });
      setDischargeForPrint(null);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printFlow.step]);

  // ── Suggestions ──
  const suggestions = useMemo(() => {
    const patients = new Set<string>();
    bills.forEach((b) => {
      if (b.patient_name) patients.add(b.patient_name);
    });
    return { patients: Array.from(patients).sort() };
  }, [bills]);

  // ── Stats ──
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
    let invalid = 0;

    bills.forEach((b) => {
      const raw = b.created_at;
      const t = raw ? new Date(raw).getTime() : NaN;

      if (!Number.isFinite(t)) {
        invalid += 1;
        return;
      }

      const dayStart = startOfDay(new Date(t)).getTime();
      const amt = Number(b.total_amount) || 0;

      if (dayStart === todayStart) todayTotal += amt;
      if (dayStart === yesterdayStart) yesterdayTotal += amt;
      if (t >= monthStart && t <= todayEnd) monthTotal += amt;
    });

    if (invalid > 0) {
      console.warn(
        `[ipd-history] ${invalid} bill(s) had missing/invalid created_at - ` +
          `they will not contribute to today/yesterday totals.`,
      );
    }

    return { todayTotal, yesterdayTotal, monthTotal };
  }, [bills]);

  // ── Filtered list ──
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
    if (filters.billNo.trim()) {
      result = result.filter((b) =>
        String(b.bill_no || "").includes(filters.billNo),
      );
    }

    if (filters.discharge !== "all") {
      result = result.filter((b) => {
        if (filters.discharge === "none") {
          return !b.discharge_type;
        }
        return b.discharge_type === filters.discharge;
      });
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
    let c = 0;
    if (filters.patient.trim()) c++;
    if (filters.billNo.trim()) c++;
    if (filters.datePreset !== "all") c++;
    if (filters.discharge !== "all") c++;
    return c;
  }, [filters]);

  const openFilterSheet = () => {
    setDraftFilters(filters);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFilterOpen(false);
  };

  const resetFilters = () => setDraftFilters(EMPTY_FILTERS);

const openDetails = (bill: IpdBill) => {
  setSelectedBill(bill);
  setIsDetailsOpen(true);
  writeBillIdToUrl(String(bill.id));
};

const closeDetails = () => {
  setIsDetailsOpen(false);
  setSelectedBill(null);
  writeBillIdToUrl(null);
};

  // ── Print flow ──
  const handlePrintClick = (bill: IpdBill | null) => {
    if (!bill) return;

    if (bill.discharge_type) {
      if (!bill.is_paid) {
        setPrintFlow({
          step: "askPaid",
          bill,
          discharge: bill.discharge_type,
        });
        return;
      }
      setPrintFlow({
        step: "confirmed",
        bill,
        discharge: bill.discharge_type,
      });
      return;
    }

    setPendingDischarge(null);
    setPrintFlow({ step: "pickDischarge", bill });
  };

  const confirmDischargeAndPrint = async () => {
    if (printFlow.step !== "pickDischarge" || !pendingDischarge) return;

    const bill = printFlow.bill;
    setIsSavingDischarge(true);

    try {
      const ok = await supabaseService.updateIpdBillDischargeType(
        bill.id,
        pendingDischarge,
      );
      if (!ok) {
        alert("Could not save the discharge type. Please retry.");
        return;
      }

      setBills((prev) =>
        prev.map((b) =>
          b.id === bill.id ? { ...b, discharge_type: pendingDischarge } : b,
        ),
      );
      setSelectedBill((prev) =>
        prev && prev.id === bill.id
          ? { ...prev, discharge_type: pendingDischarge }
          : prev,
      );

      if (!bill.is_paid) {
        setPrintFlow({
          step: "askPaid",
          bill,
          discharge: pendingDischarge,
        });
        return;
      }

      setDischargeForPrint(pendingDischarge);
      setPrintFlow({
        step: "confirmed",
        bill,
        discharge: pendingDischarge,
      });
    } finally {
      setIsSavingDischarge(false);
    }
  };

  const handleMarkPaidAndPrint = async () => {
    if (printFlow.step !== "askPaid") return;
    const bill = printFlow.bill;
    const discharge = printFlow.discharge;

    const ok = await supabaseService.updateIpdBillPaid(bill.id, {
      advance: bill.total_amount,
      remaining: 0,
      is_paid: true,
    });
    if (!ok) {
      alert("Could not mark the bill as paid. Please retry.");
      return;
    }

    const patched: IpdBill = {
      ...bill,
      advance: bill.total_amount,
      remaining: 0,
      is_paid: true,
      discharge_type: discharge ?? bill.discharge_type,
    };

    setBills((prev) => prev.map((b) => (b.id === bill.id ? patched : b)));
    setSelectedBill((prev) => (prev && prev.id === bill.id ? patched : prev));

    setDischargeForPrint(discharge ?? bill.discharge_type ?? null);
    setPrintFlow({ step: "confirmed", bill: patched, discharge });
  };

  const handlePrintWithoutPaying = () => {
    if (printFlow.step !== "askPaid") return;
    const { bill, discharge } = printFlow;
    setDischargeForPrint(discharge ?? bill.discharge_type ?? null);
    setPrintFlow({ step: "confirmed", bill, discharge });
  };

  // ── CSV export ──
  const handleExportAll = () => {
    if (filteredBills.length === 0) return;
    const header = [
      "Bill No",
      "Date",
      "Patient",
      "Age",
      "Gender",
      "Address",
      "From",
      "To",
      "Total",
      "Advance",
      "Remaining",
      "Paid",
    ].join(",");
    const rows = filteredBills.map((b) =>
      [
        b.bill_no,
        new Date(b.created_at).toLocaleDateString("en-IN"),
        b.patient_name,
        b.age || "",
        b.gender || "",
        b.address || "",
        b.date_from || "",
        b.date_to || "",
        b.total_amount,
        b.advance,
        b.remaining,
        b.is_paid ? "Yes" : "No",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ipd-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseHistory = () => {
  writeBillIdToUrl(null);
  onClose();
};

  return (
    <>
      {/* ───── Main history modal ───── */}
      <Modal
        isOpen={isOpen}
        onClose={handleCloseHistory}
        title="IPD Bill History"
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
              Export CSV
            </Button>
          </>
        }
      >
        <Banner variant="warning" inline>
          Please export regularly for not loosing data.
        </Banner>

        <div className={local.statsGrid}>
          <Card padding="sm" className={local.statCardToday}>
            <span className={local.statLabelToday}>Today's IPD</span>
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
              placeholder="Search by bill no, patient..."
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
            title="No IPD bills found"
            description={
              search || activeFilters > 0
                ? "Try adjusting your filters or search query."
                : "Created IPD bills will appear here."
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
                    <th>From - To</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBills.map((bill, index) => (
                    <tr key={`${bill.id || bill.bill_no}::${index}`}>
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
                        <div>
                          {bill.discharge_type ? (
                            <Badge tone="success" size="sm">
                              {IPD_DISCHARGE_LABELS[bill.discharge_type]}
                            </Badge>
                          ) : (
                            <Badge tone="neutral" size="sm">
                              Not discharged
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        {bill.date_from || "-"} → {bill.date_to || "-"}
                      </td>
                      <td className={local.amountCell}>
                        {formatRupees(bill.total_amount)}
                      </td>
                      <td>
                        <Badge
                          tone={bill.is_paid ? "success" : "warning"}
                          size="sm"
                        >
                          {bill.is_paid ? "Yes" : "No"}
                        </Badge>
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

      {/* ───── Filter sheet ───── */}
      <Sheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter IPD History"
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
          <h4 className={local.filterSectionHeading}>Discharge Type</h4>
          <div className={local.chipRow}>
            <Chip
              tone="primary"
              active={draftFilters.discharge === "all"}
              onClick={() =>
                setDraftFilters({ ...draftFilters, discharge: "all" })
              }
            >
              All
            </Chip>
            <Chip
              tone="primary"
              active={draftFilters.discharge === "none"}
              onClick={() =>
                setDraftFilters({ ...draftFilters, discharge: "none" })
              }
            >
              Not Discharged
            </Chip>
            {(Object.keys(IPD_DISCHARGE_LABELS) as IpdDischargeType[]).map(
              (key) => (
                <Chip
                  key={key}
                  tone="primary"
                  active={draftFilters.discharge === key}
                  onClick={() =>
                    setDraftFilters({ ...draftFilters, discharge: key })
                  }
                >
                  {IPD_DISCHARGE_LABELS[key]}
                </Chip>
              ),
            )}
          </div>
        </section>

        <section className={local.filterSection}>
          <h4 className={local.filterSectionHeading}>Patient Details</h4>
          <div className={local.filterFieldStack}>
            <FormField label="Patient Name">
              <Input
                value={draftFilters.patient}
                onChange={(e) =>
                  setDraftFilters({
                    ...draftFilters,
                    patient: e.target.value,
                  })
                }
                placeholder="Search patient name..."
                list="ipd-suggest-patients"
              />
              <datalist id="ipd-suggest-patients">
                {suggestions.patients.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Bill No">
              <Input
                value={draftFilters.billNo}
                onChange={(e) =>
                  setDraftFilters({
                    ...draftFilters,
                    billNo: e.target.value,
                  })
                }
                placeholder="Search bill no..."
              />
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
                  setDraftFilters({
                    ...draftFilters,
                    datePreset: o.key,
                  })
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

      {/* ───── Details modal ───── */}
      <Modal
  isOpen={isDetailsOpen}
  onClose={closeDetails}
  title={`IPD Bill - ${selectedBill?.bill_no}`}
  size="lg"
  mobileFullScreen
  footer={
    <>
      <Button variant="ghost" onClick={closeDetails}>
        Close
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          if (!selectedBill) return;
          setEditingBill(selectedBill);
          setIsDetailsOpen(false);
          writeBillIdToUrl(null);
        }}
        disabled={!selectedBill}
        style={{ marginRight: "auto" }}
      >
        Edit
      </Button>
      <Button onClick={() => handlePrintClick(selectedBill)}>
        Print &amp; Close
      </Button>
    </>
  }
>
        {selectedBill && (
          <div>
            <div className={local.billHeader}>
              {selectedBill.discharge_type && (
                <div className={local.billHeaderItem}>
                  <span className={local.billHeaderLabel}>Discharge Type</span>
                  <span className={local.billHeaderValue}>
                    {IPD_DISCHARGE_LABELS[selectedBill.discharge_type]}
                  </span>
                </div>
              )}
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Patient</span>
                <span className={local.billHeaderValue}>
                  {selectedBill.patient_name}
                  {selectedBill.age && ` · Age ${selectedBill.age}`}
                  {selectedBill.gender && ` · ${selectedBill.gender}`}
                  {selectedBill.address && (
                    <span className={local.billHeaderSub}>
                      {selectedBill.address}
                    </span>
                  )}
                </span>
              </div>
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Dates</span>
                <span className={local.billHeaderValue}>
                  {selectedBill.date_from || "-"} →{" "}
                  {selectedBill.date_to || "-"}
                </span>
              </div>
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Created</span>
                <span className={local.billHeaderValue}>
                  {new Date(selectedBill.created_at).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className={local.tableWrap}>
              <table className={local.table}>
                <thead>
                  <tr>
                    <th>Particular</th>
                    <th>Charge/Day</th>
                    <th>Days</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.name}</td>
                      <td>{formatRupees(it.chargePerDay)}</td>
                      <td>{it.type === "per-day" ? it.days : "-"}</td>
                      <td>{formatRupees(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`${local.totals} ${local.detailsTotals}`}>
              <div className={local.totalRow}>
                <span>Total:</span>
                <span>{formatRupees(selectedBill.total_amount)}</span>
              </div>
              <div className={local.totalRow}>
                <span>Advance:</span>
                <span>-{formatRupees(selectedBill.advance)}</span>
              </div>
              <div className={local.totalRow}>
                <span>Remaining:</span>
                <span>{formatRupees(selectedBill.remaining)}</span>
              </div>
              <div className={`${local.totalRow} ${local.grandTotal}`}>
                <span>Paid:</span>
                <span>{selectedBill.is_paid ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ───── Pick discharge type ───── */}
      <Modal
        isOpen={printFlow.step === "pickDischarge"}
        onClose={() => setPrintFlow({ step: "closed" })}
        title={`Print bill - ${
          printFlow.step === "pickDischarge" ? printFlow.bill.bill_no : ""
        }`}
        size="sm"
        disableBackdropClose
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPrintFlow({ step: "closed" })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!pendingDischarge || isSavingDischarge}
              loading={isSavingDischarge}
              onClick={confirmDischargeAndPrint}
            >
              Save & print
            </Button>
          </>
        }
      >
        <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#475569" }}>
          Select the <strong>Primary Type of IPD Discharge</strong>. It will be
          printed on the bill.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(Object.keys(IPD_DISCHARGE_LABELS) as IpdDischargeType[]).map(
            (key) => (
              <Chip
                key={key}
                tone="primary"
                active={pendingDischarge === key}
                onClick={() => setPendingDischarge(key)}
              >
                {IPD_DISCHARGE_LABELS[key]}
              </Chip>
            ),
          )}
        </div>
      </Modal>

      {/* ───── Ask paid / unpaid ───── */}
      <Modal
        isOpen={printFlow.step === "askPaid"}
        onClose={() => setPrintFlow({ step: "closed" })}
        title={`Is this bill paid? - ${
          printFlow.step === "askPaid" ? printFlow.bill.bill_no : ""
        }`}
        size="sm"
        disableBackdropClose
        footer={
          <>
            <Button variant="ghost" onClick={handlePrintWithoutPaying}>
              No, print unpaid
            </Button>
            <Button variant="success" onClick={handleMarkPaidAndPrint}>
              Yes, mark paid &amp; print
            </Button>
          </>
        }
      >
        {printFlow.step === "askPaid" && (
          <>
            <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "#475569" }}>
              This bill is currently marked as <strong>unpaid</strong>. Total is{" "}
              <strong>{formatRupees(printFlow.bill.total_amount)}</strong>.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              If you mark it paid, the full total will be recorded as the
              advance, and the remaining balance will be set to ₹0. The bill in
              history will be updated.
            </p>
          </>
        )}
      </Modal>

      {/* ───── Hidden A4 print for the correct bill ───── */}
      <div className={local.printHiddenContainer}>
        {printBill && (
          <HospitalIpdPrintLayout
            ref={printRef}
            tenant={tenant}
            billNo={printBill.bill_no}
            patient={{
              name: printBill.patient_name,
              age: printBill.age || "",
              gender: printBill.gender || "",
              address: printBill.address || "",
            }}
            dates={{
              from: printBill.date_from || "",
              to: printBill.date_to || "",
            }}
            items={printBill.items || []}
            total={printBill.total_amount}
            advance={printBill.advance}
            remaining={printBill.remaining}
            isPaid={printBill.is_paid}
            footerHeading={printBill.footer_heading}
            footerInfo={printBill.footer_info}
            disclaimer={printBill.disclaimer}
            dischargeType={printDischarge}
          />
        )}
      </div>

      {/* ───── Edit modal — OUTSIDE printHiddenContainer ───── */}
      {editingBill && (
        <Modal
          isOpen={true}
          onClose={() => setEditingBill(null)}
          title={`Edit IPD Bill — ${editingBill.bill_no}`}
          size="xl"
          mobileFullScreen
          disableBackdropClose
          footer={null}
        >
          <HospitalIpdBilling
            particulars={particulars}
            editingBill={editingBill}
            onEditCancel={() => setEditingBill(null)}
            onEditSaved={() => {
              setEditingBill(null);
              void load();
            }}
            hideToolbarActions
          />
        </Modal>
      )}
    </>
  );
};

export default HospitalIpdHistory;
