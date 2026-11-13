// src/components/Admin/HospitalIpdHistory.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
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
import { IPD_DISCHARGE_LABELS, IpdBill, IpdDischargeType } from "../../types";
import HospitalIpdPrintLayout from "./HospitalIpdPrintLayout";
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

  const [printFlow, setPrintFlow] = useState<
    | { step: "closed" }
    | { step: "pickDischarge"; bill: IpdBill }
    | { step: "askPaid"; bill: IpdBill; discharge: IpdDischargeType | null }
    | { step: "confirmed"; bill: IpdBill; discharge: IpdDischargeType | null }
  >({ step: "closed" });

  const [pendingDischarge, setPendingDischarge] =
    useState<IpdDischargeType | null>(null);
  const [isSavingDischarge, setIsSavingDischarge] = useState(false);

  const [dischargeForPrint, setDischargeForPrint] =
    useState<IpdDischargeType | null>(null);

  useEffect(() => {
    if (printFlow.step !== "confirmed") return;
    const t = window.setTimeout(() => {
      triggerPrint();
      setPrintFlow({ step: "closed" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [printFlow.step]);

  const triggerPrint = () => {
    if (!printRef.current) return;
    printReceiptNode(printRef.current, {
      title: `ipd-${selectedBill?.bill_no ?? "history"}`,
      pageSize: "A4 portrait",
    });
  };

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !tenant) return;
    let cancelled = false;
    setIsLoading(true);
    supabaseService
      .getIpdBills(tenant.slug)
      .then((list) => {
        if (cancelled) return;
        setBills(list);
      })
      .catch((err) => {
        console.warn("[ipd-history] load failed:", err);
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
    bills.forEach((b) => {
      if (b.patient_name) patients.add(b.patient_name);
    });
    return { patients: Array.from(patients).sort() };
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
    let invalid = 0;

    bills.forEach((b) => {
      const raw = b.created_at;
      const t = raw ? new Date(raw).getTime() : NaN;

      if (!Number.isFinite(t)) {
        invalid += 1;
        return;
      }

      // Normalize to local midnight so a `date`-only value like
      // "2026-11-04" lands on the same calendar day the user sees,
      // not 05:30 IST on that day.
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
    if (filters.discharge !== "all") c++; // ← new
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
  };

  const handlePrintClick = (bill: IpdBill) => {
    // Already has a discharge type → go straight to the paid prompt.
    if (bill.discharge_type) {
      if (!bill.is_paid) {
        setPrintFlow({ step: "askPaid", bill, discharge: bill.discharge_type });
        return;
      }
      setSelectedBill(bill);
      setDischargeForPrint(bill.discharge_type);
      window.setTimeout(() => triggerPrint(), 80);
      return;
    }
    // No discharge type yet → pick it first.
    setPendingDischarge(null);
    setPrintFlow({ step: "pickDischarge", bill });
  };

  const confirmDischargeAndPrint = async () => {
    if (printFlow.step !== "pickDischarge") return;
    if (!pendingDischarge) return;

    const bill = printFlow.bill;
    setIsSavingDischarge(true);

    await supabaseService.updateIpdBillDischargeType(bill.id, pendingDischarge);

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

    setIsSavingDischarge(false);

    if (!bill.is_paid) {
      // Chain into the paid prompt.
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

    // Sync all three UI surfaces with the new values
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

  const handleExportAll = () => {
    if (filteredBills.length === 0) return;
    // Simple CSV export - avoids introducing another PDF lib
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
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

      {/* Filter Sheet */}
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

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`IPD Bill - ${selectedBill?.bill_no}`}
        size="lg"
        mobileFullScreen
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            <Button onClick={() => handlePrintClick(selectedBill!)}>
              Print Bill
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

      <Modal
        isOpen={printFlow.step === "pickDischarge"}
        onClose={() => setPrintFlow({ step: "closed" })}
        title={`Print bill - ${printFlow.step === "pickDischarge" ? printFlow.bill.bill_no : ""}`}
        size="sm"
        disableBackdropClose={true}
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

      <Modal
        isOpen={printFlow.step === "askPaid"}
        onClose={() => setPrintFlow({ step: "closed" })}
        title={`Is this bill paid? - ${
          printFlow.step === "askPaid" ? printFlow.bill.bill_no : ""
        }`}
        size="sm"
        disableBackdropClose={true}
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

      {/* Hidden A4 print for reprint */}
      <div className={local.printHiddenContainer}>
        {selectedBill && (
          <HospitalIpdPrintLayout
            ref={printRef}
            tenant={tenant}
            billNo={selectedBill.bill_no}
            patient={{
              name: selectedBill.patient_name,
              age: selectedBill.age || "",
              gender: selectedBill.gender || "",
              address: selectedBill.address || "",
            }}
            dates={{
              from: selectedBill.date_from || "",
              to: selectedBill.date_to || "",
            }}
            items={selectedBill.items || []}
            total={selectedBill.total_amount}
            advance={selectedBill.advance}
            remaining={selectedBill.remaining}
            isPaid={selectedBill.is_paid}
            footerHeading={selectedBill.footer_heading}
            footerInfo={selectedBill.footer_info}
            disclaimer={selectedBill.disclaimer}
            dischargeType={
              dischargeForPrint ?? selectedBill.discharge_type ?? null
            }
          />
        )}
      </div>
    </>
  );
};

export default HospitalIpdHistory;
