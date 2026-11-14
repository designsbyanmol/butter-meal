// src/components/Admin/HospitalOpdHistory.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import {
  Modal,
  Button,
  Input,
  EmptyState,
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
import { printReceiptNode } from "../../utils/printReceipt";
import { OpdBill, OpdDefaults } from "../../types";
import HospitalOpdPrintLayout from "./HospitalOpdPrintLayout";
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

interface FilterState {
  patient: string;
  billNo: string;
  phone: string;
  doctor: string;
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
}

const EMPTY_FILTERS: FilterState = {
  patient: "",
  billNo: "",
  phone: "",
  doctor: "",
  datePreset: "all",
  customFrom: "",
  customTo: "",
};

const DEFAULT_OPD: OpdDefaults = {
  facilities: [],
  footerHeading: "Best Wishes",
  footerInfo: "Take healthy diet and be sure to maintain hygine.",
  disclaimer: "Prepared under the observation.",
  vitals: { bp: "", spo2: "", pulse: "", temp: "", weight: "" },
};

const HospitalOpdHistory: React.FC<Props> = ({ isOpen, onClose }) => {
  const { tenant } = useTenant();
  const [bills, setBills] = useState<OpdBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedBill, setSelectedBill] = useState<OpdBill | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [opdDefaults, setOpdDefaults] = useState<OpdDefaults>(DEFAULT_OPD);
  const printRef = useRef<HTMLDivElement>(null);

  // Load OPD-wide print defaults once per open.
  useEffect(() => {
    if (!isOpen || !tenant) return;
    let cancelled = false;
    supabaseService
      .getHospitalOpdSettings(tenant.slug)
      .then((d) => {
        if (cancelled) return;
        setOpdDefaults(d ?? DEFAULT_OPD);
      })
      .catch(() => {
        if (!cancelled) setOpdDefaults(DEFAULT_OPD);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, tenant?.slug]);

  useEffect(() => {
    if (!isOpen || !tenant) return;
    let cancelled = false;
    setIsLoading(true);
    supabaseService
      .getOpdBills(tenant.slug)
      .then((list) => {
        if (cancelled) return;
        setBills(list);
      })
      .catch((err) => {
        console.warn("[opd-history] load failed:", err);
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
    const doctors = new Set<string>();
    bills.forEach((b) => {
      if (b.patient_name) patients.add(b.patient_name);
      if (b.doctor_name && b.doctor_name.trim()) {
        doctors.add(b.doctor_name.trim()); // ← new
      }
    });
    return {
      patients: Array.from(patients).sort(),
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

    let todayCount = 0;
    let yesterdayCount = 0;
    let monthCount = 0;
    let invalid = 0;

    bills.forEach((b) => {
      const raw = b.created_at;
      const t = raw ? new Date(raw).getTime() : NaN;

      if (!Number.isFinite(t)) {
        invalid += 1;
        return;
      }

      const dayStart = startOfDay(new Date(t)).getTime();

      if (dayStart === todayStart) todayCount += 1;
      if (dayStart === yesterdayStart) yesterdayCount += 1;
      if (t >= monthStart && t <= todayEnd) monthCount += 1;
    });

    if (invalid > 0) {
      console.warn(
        `[opd-history] ${invalid} bill(s) had missing/invalid created_at ` +
          `- they will not contribute to today/yesterday counts.`,
      );
    }

    return { todayCount, yesterdayCount, monthCount };
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

    if (filters.phone.trim()) {
      const q = filters.phone.replace(/\D/g, "");
      if (q) {
        result = result.filter((b) =>
          String(b.phone || "")
            .replace(/\D/g, "")
            .includes(q),
        );
      }
    }

    if (filters.doctor.trim()) {
      const q = filters.doctor.trim().toLowerCase();
      result = result.filter((b) =>
        String(b.doctor_name || "")
          .toLowerCase()
          .includes(q),
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
    let c = 0;
    if (filters.patient.trim()) c++;
    if (filters.billNo.trim()) c++;
    if (filters.phone.trim()) c++; // ← new
    if (filters.doctor.trim()) c++;
    if (filters.datePreset !== "all") c++;
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

  const openDetails = (bill: OpdBill) => {
    setSelectedBill(bill);
    setIsDetailsOpen(true);
  };

  const handlePrintHistoryBill = () => {
    if (!printRef.current) return;
    printReceiptNode(printRef.current, {
      title: `opd-${selectedBill?.bill_no ?? "history"}`,
      pageSize: "A4 portrait",
    });
  };

  const handleExportAll = () => {
    if (filteredBills.length === 0) return;
    const header = [
      "Bill No",
      "Date",
      "Patient",
      "Phone",
      "Age",
      "Gender",
      "Address",
      "Doctor",
    ].join(",");
    const rows = filteredBills.map((b) =>
      [
        b.bill_no,
        new Date(b.created_at).toLocaleDateString("en-IN"),
        b.patient_name,
        b.phone || "",
        b.age || "",
        b.gender || "",
        b.address || "",
        b.doctor_name || "",
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
    a.download = `opd-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printLayoutProps =
    selectedBill && tenant
      ? {
          tenant,
          billNo: selectedBill.bill_no,
          patient: {
            name: selectedBill.patient_name,
            phone: selectedBill.phone,
            age: selectedBill.age || "",
            gender: selectedBill.gender || "",
            address: selectedBill.address || "",
          },
          doctorName: selectedBill.doctor_name || "",
          department: selectedBill.department || "", // ← add
          serviceName: selectedBill.service_name || "", // ← add
          price: Number(selectedBill.price) || 0, // ← add
          vitals: opdDefaults.vitals,
          facilities: opdDefaults.facilities,
          footerHeading: opdDefaults.footerHeading,
          footerInfo: opdDefaults.footerInfo,
          disclaimer: opdDefaults.disclaimer,
        }
      : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="OPD Bill History"
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
            <span className={local.statLabelToday}>Today's OPD</span>
            <div className={local.statValueToday}>{stats.todayCount}</div>
          </Card>
          <Card padding="sm" className={local.statCardYesterday}>
            <span className={local.statLabelYesterday}>Yesterday</span>
            <div className={local.statValueYesterday}>
              {stats.yesterdayCount}
            </div>
          </Card>
          <Card padding="sm" className={local.statCardMonth}>
            <span className={local.statLabelMonth}>This Month</span>
            <div className={local.statValueMonth}>{stats.monthCount}</div>
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
            title="No OPD bills found"
            description={
              search || activeFilters > 0
                ? "Try adjusting your filters or search query."
                : "Created OPD bills will appear here."
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
                    <th>Phone</th>
                    <th>Doctor</th>
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
                      <td>{bill.patient_name}</td>
                      <td>{bill.phone || "-"}</td>
                      <td>{bill.doctor_name || "-"}</td>
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
        title="Filter OPD History"
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
                list="opd-suggest-patients"
              />
              <datalist id="opd-suggest-patients">
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
            <FormField label="Phone">
              <Input
                type="tel"
                inputMode="numeric"
                value={draftFilters.phone}
                onChange={(e) =>
                  setDraftFilters({
                    ...draftFilters,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                placeholder="Search by phone..."
              />
            </FormField>
            <FormField label="Doctor">
              <Input
                value={draftFilters.doctor}
                onChange={(e) =>
                  setDraftFilters({
                    ...draftFilters,
                    doctor: e.target.value,
                  })
                }
                placeholder="Search by doctor name..."
                list="opd-suggest-doctors"
              />
              <datalist id="opd-suggest-doctors">
                {suggestions.doctors.map((d) => (
                  <option key={d} value={d} />
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

      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`OPD Bill - ${selectedBill?.bill_no}`}
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
                  {selectedBill.patient_name}
                  {selectedBill.age && ` · Age ${selectedBill.age}`}
                  {selectedBill.gender && ` · ${selectedBill.gender}`}
                  {selectedBill.phone && ` · ${selectedBill.phone}`}
                  {selectedBill.address && (
                    <span className={local.billHeaderSub}>
                      {selectedBill.address}
                    </span>
                  )}
                </span>
              </div>
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Doctor</span>
                <span className={local.billHeaderValue}>
                  {selectedBill.doctor_name || "-"}
                </span>
              </div>
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Created</span>
                <span className={local.billHeaderValue}>
                  {new Date(selectedBill.created_at).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <div className={local.printHiddenContainer}>
        {printLayoutProps && (
          <HospitalOpdPrintLayout ref={printRef} {...printLayoutProps} />
        )}
      </div>
    </>
  );
};

export default HospitalOpdHistory;
