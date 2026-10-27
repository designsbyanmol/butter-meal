// src/components/Admin/HospitalAppointmentsBody.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { useAuth } from "../../hooks/useAuth";
import { supabaseService } from "../../services/supabase.service";
import { Button, Tabs, Badge, EmptyState, Chip, IconButton } from "../ui";
import { InlineSection } from "../Dashboard/inline";
import { ClockIcon } from "../../assets/svgs";
import HospitalAppointmentHistory from "./HospitalAppointmentHistory";

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
    //     admin hid the category — appointments keep it alive)
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

    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
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
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          marginBottom: 16,
          paddingBottom: 8,
        }}
      >
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
              catFilter !== "All" &&
              catFilter.toLowerCase() === c.toLowerCase()
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
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
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
                style={{
                  padding: 16,
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: "#fff",
                  opacity: isDone && !isAdmin ? 0.7 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
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
                    <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>
                      {a.patient_name}
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                      {a.phone} | {a.doctor_name || "No doctor assigned"}
                    </p>
                    {(a.age || a.gender) && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {a.age ? `Age ${a.age}` : ""}
                        {a.age && a.gender ? " - " : ""}
                        {a.gender || ""}
                      </p>
                    )}
                    {a.address && (
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 12,
                          color: "#94a3b8",
                        }}
                      >
                        {a.address}
                      </p>
                    )}
                    {a.status === "resolved" && (
                      <Badge tone="success" size="sm">
                        Completed
                      </Badge>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      flexDirection: "column",
                    }}
                  >
                    {!isAdmin && tab === "new" && (
                      <div style={{ display: "flex", gap: 8 }}>
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
                      <div style={{ display: "flex", gap: 8 }}>
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
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => updateStatus(a.id, "resolved")}
                      >
                        Resolve
                      </Button>
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