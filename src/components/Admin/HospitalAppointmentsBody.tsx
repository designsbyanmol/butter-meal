// src/components/Admin/HospitalAppointmentsBody.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { useAuth } from "../../hooks/useAuth";
import { supabaseService } from "../../services/supabase.service";
import { Button, Tabs, Badge, EmptyState, Chip, IconButton } from "../ui";
import { InlineSection } from "../Dashboard/inline";
import { ClockIcon } from "../../assets/svgs";
import HospitalAppointmentHistory from "./HospitalAppointmentHistory";
import local from "./HospitalAppointmentsBody.module.scss";

export default function HospitalAppointmentsBody() {
  const { tenant } = useTenant();
  const { isAdmin } = useAuth();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [tab, setTab] = useState("new");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ── Categories from DB (with graceful fallback) ──────────
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  // Selected category, persisted. "All" is the sentinel.
  const [catFilter, setCatFilter] = useState<string>(
    () => localStorage.getItem("hospital_admin_cat") || "All",
  );

  // ── Loaders ─────────────────────────────────────────────
  const loadAppointments = async () => {
    if (!tenant) return;
    const data = await supabaseService.getTodaysAppointments(tenant.slug);
    setAppointments(data);
  };

  const loadCategories = async () => {
    if (!tenant) return;
    const rows = await supabaseService.getHospitalServiceCategories(
      tenant.slug,
    );

    // Two sources, merged:
    // 1. Categories defined in the DB (visible ones only)
    // 2. Categories currently present on today's appointments
    //    (so nothing ever disappears from the chips just because
    //     admin hid the category - appointments keep it alive)
    const dbVisible = rows.filter((r) => !r.hidden).map((r) => r.name);

    setDbCategories(dbVisible);
  };

  useEffect(() => {
    loadAppointments();
    loadCategories();

    const interval = setInterval(() => {
      loadAppointments();
      loadCategories();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]);

  // ── Merge DB categories + categories seen on today's data ─
  const categories = useMemo(() => {
    const set = new Set<string>();
    dbCategories.forEach((c) => set.add(c));
    appointments.forEach((a) => {
      if (a.category) set.add(a.category);
    });

    // Case-insensitive unique sort, but preserve the first-seen
    // casing so the chip label matches the DB value the admin typed.
    const seen = new Set<string>();
    const unique = Array.from(set).filter((c) => {
      const k = c.trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    unique.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    return unique;
  }, [dbCategories, appointments]);

  // If the current filter no longer exists (admin hid/renamed it),
  // fall back to "All" so the UI doesn't get stuck on an empty tab.
  useEffect(() => {
    if (catFilter === "All") return;
    const exists = categories.some(
      (c) => c.toLowerCase() === catFilter.toLowerCase(),
    );
    if (!exists) {
      setCatFilter("All");
      localStorage.setItem("hospital_admin_cat", "All");
    }
  }, [categories, catFilter]);

  const updateStatus = async (
    id: string,
    status: string,
    payment_status?: string,
  ) => {
    const ok = await supabaseService.updateAppointmentStatus(
      id,
      status,
      payment_status,
    );
    if (ok) loadAppointments();
  };

const callInAppointment = async (id: string) => {
  // Optimistic — flip the button to "Called In" immediately.
  setAppointments((prev) =>
    prev.map((a) =>
      a.id === id ? { ...a, called_in: true } : a,
    ),
  );
  const ok = await supabaseService.callInAppointment(id);
  if (!ok) {
    // Roll back on failure.
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, called_in: false } : a,
      ),
    );
    return;
  }
  loadAppointments();
};

  const handleCatChange = (c: string) => {
    setCatFilter(c);
    localStorage.setItem("hospital_admin_cat", c);
  };

  // ── Match logic (case-insensitive, trim-tolerant) ────────
  const matchesCategory = (a: any): boolean => {
    if (catFilter === "All") return true;
    const target = catFilter.trim().toLowerCase();
    const actual = (a.category || "").trim().toLowerCase();
    return actual === target;
  };

  // ── Tabs ────────────────────────────────────────────────
  const staffTabs = [
    { key: "new", label: "New" },
    { key: "confirmed", label: "Confirmed" },
    { key: "failed", label: "Failed" },
  ];

const adminTabs = [
  { key: "new", label: "Waitlist (New)" },
  { key: "confirmed", label: "Active Queue" },
  { key: "hold", label: "Hold" },
  { key: "resolved", label: "Resolved" },
];
  const tabsToRender = isAdmin ? adminTabs : staffTabs;

  // ── Filtering ───────────────────────────────────────────
  const matchesTab = (a: any, tabKey: string): boolean => {
    if (!isAdmin) {
      if (tabKey === "new") return a.status === "new";
      if (tabKey === "confirmed") return a.payment_status === "confirmed";
      if (tabKey === "failed") return a.status === "failed";
      return false;
    }
    if (tabKey === "new") return a.status === "new";
    if (tabKey === "confirmed") return a.status === "confirmed";
    if (tabKey === "hold") return a.status === "hold";
    if (tabKey === "resolved") return a.status === "resolved";
    if (tabKey === "called") return a.status === "called";
    return false;
  };

  const filtered = appointments.filter(
    (a) => matchesCategory(a) && matchesTab(a, tab),
  );

  useEffect(() => {
    const validKeys = tabsToRender.map((t) => t.key);
    if (!validKeys.includes(tab)) {
      setTab(validKeys[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // ── Render ──────────────────────────────────────────────
  return (
    <InlineSection
      title="Appointments Dashboard"
      actions={
        isAdmin ? (
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            title="Appointment History"
          >
            <ClockIcon width={18} height={18} fill="#1e1e1e" />
          </IconButton>
        ) : undefined
      }
    >
      {/* Category Filter */}
      <div className={local.categoryFilter}>
        <Chip
          key="All"
          tone="primary"
          active={catFilter === "All"}
          onClick={() => handleCatChange("All")}
        >
          All
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c}
            tone="primary"
            active={
              catFilter !== "All" && catFilter.toLowerCase() === c.toLowerCase()
            }
            onClick={() => handleCatChange(c)}
          >
            {c}
          </Chip>
        ))}
      </div>

      {/* Role-Based Tabs */}
      <Tabs
        block
        items={tabsToRender.map((t) => {
          const count = appointments.filter(
            (a) => matchesCategory(a) && matchesTab(a, t.key),
          ).length;
          return { key: t.key, label: `${t.label} (${count})` };
        })}
        value={tab}
        onChange={setTab}
      />

      {/* List */}
      <div className={local.list}>
        {filtered.length === 0 ? (
          <EmptyState
            title={`No ${isAdmin ? "appointments" : "appointments to process"}`}
          />
        ) : (
          filtered.map((a) => {
            const isDone = a.status === "resolved" || a.status === "failed";
            return (
              <div
                key={a.id}
                className={`${local.card} ${isDone && !isAdmin ? local.done : ""}`}
              >
                <div className={local.cardInner}>
                  <div className={local.info}>
                    <div className={local.badgeRow}>
                      {a.called_in && (
  <Badge tone="success" size="sm">
    CALLED IN
  </Badge>
)}
                      <Badge tone="info">Token #{a.token_no}</Badge>
                      <Badge tone="neutral">{a.category}</Badge>
                      {a.payment_status === "confirmed" && (
                        <Badge tone="success">PAID</Badge>
                      )}
                      {a.payment_status === "pending" && (
                        <Badge tone="warning">PENDING</Badge>
                      )}
                      {a.payment_status === "rejected" && (
                        <Badge tone="danger">REJECTED</Badge>
                      )}
                    </div>
                    <h3 className={local.patientName}>{a.patient_name}</h3>
                    <p className={local.metaText}>
                      {a.phone} | {a.doctor_name || "No doctor assigned"}
                    </p>
                    {(a.age || a.gender) && (
                      <p className={local.demographics}>
                        {a.age ? `Age ${a.age}` : ""}
                        {a.age && a.gender ? " - " : ""}
                        {a.gender || ""}
                      </p>
                    )}
                    {a.address && <p className={local.address}>{a.address}</p>}
                    {a.status === "resolved" && (
                      <Badge tone="success" size="sm">
                        Completed
                      </Badge>
                    )}
                  </div>

                  <div className={local.actions}>
                    {!isAdmin && tab === "new" && (
                      <div className={local.actionGroup}>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() =>
                            updateStatus(a.id, "confirmed", "confirmed")
                          }
                        >
                          Confirm Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            updateStatus(a.id, "failed", "rejected")
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    )}

                    {isAdmin && tab === "confirmed" && (
  <div className={local.actionGroup}>
    <Button
      size="sm"
      variant={a.called_in ? "success" : "primary"}
      disabled={a.called_in === true}
      onClick={() => callInAppointment(a.id)}
    >
      {a.called_in ? "Called In" : "Call In"}
    </Button>
    <Button
      size="sm"
      variant="warning"
      onClick={() => updateStatus(a.id, "hold")}
    >
      Hold
    </Button>
    <Button
      size="sm"
      variant="success"
      onClick={() => updateStatus(a.id, "resolved")}
    >
      Resolve
    </Button>
  </div>
)}

                    {isAdmin && tab === "hold" && (
                      <div className={local.actionGroup}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => updateStatus(a.id, "called")}
                        >
                          Call In
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => updateStatus(a.id, "resolved")}
                        >
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isAdmin && (
        <HospitalAppointmentHistory
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </InlineSection>
  );
}
