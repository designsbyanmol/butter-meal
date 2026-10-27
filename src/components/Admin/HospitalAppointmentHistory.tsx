// src/components/Admin/HospitalAppointmentHistory.tsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "../ui";
import { SearchIcon, FilterIcon, CloseIcon } from "../../assets/svgs";
import { formatRupees } from "../../utils/subscription";

const PAGE_SIZE = 12;
const DEFAULT_CATEGORIES = [
  "General Medicine",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "Cardiology",
];

const getStoredCategories = (): string[] => {
  try {
    const saved = localStorage.getItem("hospital_service_categories");
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "thisMonth"
  | "thisYear"
  | "custom";
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface FilterState {
  patient: string;
  phone: string;
  address: string;
  doctor: string;
  category: string;
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
}

const EMPTY_FILTERS: FilterState = {
  patient: "",
  phone: "",
  address: "",
  doctor: "",
  category: "all",
  datePreset: "all",
  customFrom: "",
  customTo: "",
};

export default function HospitalAppointmentHistory({ isOpen, onClose }: Props) {
  const { tenant } = useTenant();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const categories = useMemo(() => ["All", ...getStoredCategories()], []);

  const load = async () => {
  if (!tenant) return;
  setIsLoading(true);
  const data = await supabaseService.getAllAppointmentsHistory(tenant.slug);
  // Only successful appointments in the history list
  setAppointments(data.filter((a: any) => a.status === 'resolved'));
  setIsLoading(false);
};

  useEffect(() => {
    if (isOpen) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenant?.slug]);

  // --- Filtering ---
  const filtered = useMemo(() => {
    let result = appointments;

    // Top Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          (a.patient_name || "").toLowerCase().includes(q) ||
          (a.phone || "").includes(q) ||
          (a.doctor_name || "").toLowerCase().includes(q) ||
          (a.category || "").toLowerCase().includes(q) ||
          (a.address || "").toLowerCase().includes(q),
      );
    }

    // Advanced Filters
    if (filters.patient.trim())
      result = result.filter((a) =>
        (a.patient_name || "")
          .toLowerCase()
          .includes(filters.patient.toLowerCase()),
      );
    if (filters.phone.trim())
      result = result.filter((a) => (a.phone || "").includes(filters.phone));
    if (filters.address.trim())
      result = result.filter((a) =>
        (a.address || "").toLowerCase().includes(filters.address.toLowerCase()),
      );
    if (filters.doctor.trim())
      result = result.filter((a) =>
        (a.doctor_name || "")
          .toLowerCase()
          .includes(filters.doctor.toLowerCase()),
      );
    if (filters.category !== "all")
      result = result.filter((a) => a.category === filters.category);

    // Date Range
    const { from, to } = computeRange(
      filters.datePreset,
      filters.customFrom,
      filters.customTo,
    );
    if (from || to) {
      result = result.filter((a) => {
        const time = new Date(a.booking_date).getTime();
        if (from && time < new Date(from).getTime()) return false;
        if (to && time > new Date(to).getTime()) return false;
        return true;
      });
    }

    return [...result].sort(
      (a, b) =>
        new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime(),
    );
  }, [appointments, search, filters]);

  // --- Calendar-scoped stats (Today / Month / Year) — NOT affected by filters ---
const calendarStats = useMemo(() => {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

  let todayTotal = 0;
  let todayCount = 0;
  let monthTotal = 0;
  let monthCount = 0;
  let yearTotal = 0;
  let yearCount = 0;

  appointments.forEach(a => {
    const bookingTime = new Date(`${a.booking_date}T12:00:00`).getTime();
    const amt = Number(a.price) || 0;

    if (bookingTime >= todayStart && bookingTime <= todayEnd) {
      todayTotal += amt;
      todayCount += 1;
    }
    if (bookingTime >= monthStart && bookingTime <= todayEnd) {
      monthTotal += amt;
      monthCount += 1;
    }
    if (bookingTime >= yearStart && bookingTime <= todayEnd) {
      yearTotal += amt;
      yearCount += 1;
    }
  });

  return {
    todayTotal,
    todayCount,
    monthTotal,
    monthCount,
    yearTotal,
    yearCount,
  };
}, [appointments]);

// --- "Total" stat — follows the current filters & search ---
const filteredStats = useMemo(() => {
  let total = 0;
  let count = 0;
  filtered.forEach(a => {
    total += Number(a.price) || 0;
    count += 1;
  });
  return { total, count };
}, [filtered]);

// --- "Total" stat — follows the current filters & search ---
const totalRevenue = useMemo(() => {
  let total = 0;
  filtered.forEach(a => {
    if (a.status !== 'resolved') return;
    total += Number(a.price) || 0;
  });
  return total;
}, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filters.patient.trim()) c++;
    if (filters.phone.trim()) c++;
    if (filters.address.trim()) c++;
    if (filters.doctor.trim()) c++;
    if (filters.category !== "all") c++;
    if (filters.datePreset !== "all") c++;
    return c;
  }, [filters]);

  const openFilterSheet = () => {
    setDraftFilters(filters);
    setIsFilterOpen(true);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Appointment History"
        size="xl"
        mobileFullScreen
        footer={
          <Button variant="ghost" onClick={onClose} block>
            Close
          </Button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
  <Card padding="sm" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Today</span>
    <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
      {formatRupees(calendarStats.todayTotal)}
    </div>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#166534', marginTop: 2 }}>
      {calendarStats.todayCount} success
    </div>
  </Card>

  <Card padding="sm" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Total</span>
    <div style={{ fontSize: 16, fontWeight: 800, color: '#334155', marginTop: 4 }}>
      {formatRupees(filteredStats.total)}
    </div>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginTop: 2 }}>
      {filteredStats.count} success
    </div>
  </Card>

  <Card padding="sm" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>This Month</span>
    <div style={{ fontSize: 16, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
      {formatRupees(calendarStats.monthTotal)}
    </div>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#1e40af', marginTop: 2 }}>
      {calendarStats.monthCount} success
    </div>
  </Card>

  <Card padding="sm" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>This Year</span>
    <div style={{ fontSize: 16, fontWeight: 800, color: '#7e22ce', marginTop: 4 }}>
      {formatRupees(calendarStats.yearTotal)}
    </div>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b21a8', marginTop: 2 }}>
      {calendarStats.yearCount} success
    </div>
  </Card>
</div>

        {/* 2. SEARCH & FILTER */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Input
              placeholder="Search by patient, phone, doctor, address..."
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
            variant={activeFiltersCount > 0 ? "primary" : "ghost"}
            onClick={openFilterSheet}
            leftIcon={<FilterIcon width={14} height={14} fill="currentColor" />}
            rightIcon={
              activeFiltersCount > 0 ? (
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
                  {activeFiltersCount}
                </span>
              ) : undefined
            }
          >
            Filters
          </Button>
        </div>

        {/* 3. TABLE */}
        {isLoading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="No appointments found" />
        ) : (
          <>
            <div
              style={{
                overflowX: "auto",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
    <th style={{ padding: 10 }}>Date</th>
    <th style={{ padding: 10 }}>Token</th>
    <th style={{ padding: 10 }}>Patient</th>
    <th style={{ padding: 10 }}>Category</th>
    <th style={{ padding: 10 }}>Doctor</th>
    <th style={{ padding: 10 }}>Price</th>
  </tr>
</thead>
<tbody>
  {paginated.map(a => (
    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: 10 }}>{new Date(a.booking_date).toLocaleDateString('en-IN')}</td>
      <td style={{ padding: 10 }}><strong>#{a.token_no}</strong></td>
      <td style={{ padding: 10 }}>
        {a.patient_name}<br />
        <small style={{ color: '#666' }}>{a.phone}</small>
      </td>
      <td style={{ padding: 10 }}>{a.category}</td>
      <td style={{ padding: 10 }}>{a.doctor_name || '-'}</td>
      <td style={{ padding: 10 }}>{formatRupees(Number(a.price) || 0)}</td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </Modal>

      {/* FILTER SHEET */}
      <Sheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter History"
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
                setIsFilterOpen(false);
              }}
              block
            >
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
            Patient Info
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <FormField label="Patient Name">
              <Input
                value={draftFilters.patient}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, patient: e.target.value })
                }
                placeholder="Name..."
              />
            </FormField>
            <FormField label="Phone">
              <Input
                value={draftFilters.phone}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, phone: e.target.value })
                }
                placeholder="Phone..."
              />
            </FormField>
            <FormField label="Address">
              <Input
                value={draftFilters.address}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, address: e.target.value })
                }
                placeholder="Area, City..."
              />
            </FormField>
            <FormField label="Doctor">
              <Input
                value={draftFilters.doctor}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, doctor: e.target.value })
                }
                placeholder="Doctor name..."
              />
            </FormField>
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
            Category
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c) => (
              <Chip
                key={c}
                tone="primary"
                active={draftFilters.category === c}
                onClick={() =>
                  setDraftFilters({ ...draftFilters, category: c })
                }
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
            Date Range
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 12,
              }}
            >
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
    </>
  );
}
