// src/components/Admin/HospitalPatientsBody.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import {
  Button,
  Input,
  Modal,
  FormField,
  Badge,
  IconButton,
  Sheet,
  Chip,
  Pagination,
  EmptyState,
  Select,
} from "../ui";
import { InlineSection } from "../Dashboard/inline";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  FilterIcon,
  CloseIcon,
} from "../../assets/svgs";
const patientsKey = (slug: string) => `pharmacy_patients_cache::${slug}`;
const writeCache = (key: string, list: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
};
interface HospitalPatientsBodyProps {
  onCountChange?: (n: number) => void;
}

const PAGE_SIZE = 12;
const GENDERS = ["Male", "Female", "Other"];

const emptyForm = {
  name: "",
  age_years: "",
  age_months: "",
  gender: "Male",
  phone: "",
  email: "",
  address: "",
};

export default function HospitalPatientsBody({
  onCountChange,
}: HospitalPatientsBodyProps = {}) {
  const { tenant } = useTenant();
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

const load = async () => {
  if (!tenant) return;
  setIsLoading(true);
  const data = await supabaseService.getHospitalPatients(tenant.slug);
  setPatients(data);
  writeCache(patientsKey(tenant.slug), data); // ← new
  setIsLoading(false);
};

  useEffect(() => {
    load();
  }, [tenant?.slug]);
  useEffect(() => {
    setPage(1);
  }, [search, filterGender]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIsModalOpen(true);
  };

  const openEditModal = (patient: any) => {
    setEditingId(patient.id);
    setForm({
  name: patient.name || "",
  age_years:
    patient.age_years !== undefined && patient.age_years !== null
      ? String(patient.age_years)
      : "",
  age_months:
    patient.age_months !== undefined && patient.age_months !== null
      ? String(patient.age_months)
      : "",
  gender: patient.gender || "Male",
  phone: patient.phone || "",
  email: patient.email || "",
  address: patient.address || "",
});
    setIsModalOpen(true);
  };

  const handleSave = async () => {
  if (!tenant || !form.name) return;
  setIsSaving(true);

  const payload = {
    name: form.name.trim(),
    age_years:
      form.age_years !== "" ? Number(form.age_years) || 0 : null,
    age_months:
      form.age_months !== "" ? Number(form.age_months) || 0 : null,
    gender: form.gender,
    phone: form.phone.trim(),
    email: form.email.trim(),
    address: form.address.trim(),
  };

  if (editingId) {
    await supabaseService.updateHospitalPatient(editingId, payload);
  } else {
    await supabaseService.addHospitalPatient(tenant.slug, payload);
  }

  setIsSaving(false);
  setIsModalOpen(false);
  setForm({ ...emptyForm });
  setEditingId(null);
  load();
};

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabaseService.deleteHospitalPatient(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const filteredPatients = useMemo(() => {
    let result = patients;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.phone || "").includes(q) ||
          (p.email || "").toLowerCase().includes(q) ||
          (p.address || "").toLowerCase().includes(q),
      );
    }
    if (filterGender !== "All") {
      result = result.filter((p) => p.gender === filterGender);
    }
    return result;
  }, [patients, search, filterGender]);

  useEffect(() => {
    if (onCountChange) onCountChange(filteredPatients.length);
  }, [filteredPatients.length, onCountChange]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPatients.length / PAGE_SIZE),
  );
  const paginatedPatients = filteredPatients.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
  if (!tenant) return;

  const onChanged = (e: Event) => {
    const detail = (e as CustomEvent).detail as { slug?: string } | undefined;
    if (detail?.slug !== tenant.slug) return;
    load();
  };

  window.addEventListener('hospital-patients:changed', onChanged);
  return () => {
    window.removeEventListener('hospital-patients:changed', onChanged);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tenant?.slug]);

  return (
    <>
      <InlineSection
        title={`Patients (${filteredPatients.length})`}
        actions={
          <Button
            size="sm"
            onClick={openAddModal}
            leftIcon={<PlusIcon width={16} height={16} fill="#fff" />}
          >
            Add Patient
          </Button>
        }
      >
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Search patient name, phone, email..."
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
            variant={filterGender !== "All" ? "primary" : "ghost"}
            onClick={() => setIsFilterOpen(true)}
            leftIcon={<FilterIcon width={14} height={14} fill="currentColor" />}
            rightIcon={
              filterGender !== "All" ? (
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
                  1
                </span>
              ) : undefined
            }
          >
            Filters
          </Button>
        </div>

        {isLoading ? (
          <p>Loading...</p>
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            title="No patients found"
            description="Add your first patient to get started."
          />
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              {paginatedPatients.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 16,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>
                        {p.name}
                      </h3>
                      <Badge tone="neutral" size="sm">
  {p.gender}
  {(() => {
    const y = Number(p.age_years) || 0;
    const m = Number(p.age_months) || 0;
    if (!y && !m) return "";
    const parts: string[] = [];
    if (y) parts.push(`${y}y`);
    if (m) parts.push(`${m}m`);
    return ` · ${parts.join(" ")}`;
  })()}
</Badge>
                      {p.phone && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          📞 {p.phone}
                        </p>
                      )}
                      {p.email && (
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 12,
                            color: "#94a3b8",
                          }}
                        >
                          ✉️ {p.email}
                        </p>
                      )}
                      {p.address && (
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 12,
                            color: "#94a3b8",
                          }}
                        >
                          📍 {p.address}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(p)}
                        title="Edit"
                      >
                        <EditIcon width={14} height={14} fill="currentColor" />
                      </IconButton>
                      <IconButton
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteTarget(p)}
                        title="Delete"
                      >
                        <TrashIcon width={14} height={14} fill="currentColor" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredPatients.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </InlineSection>

      {/* ADD / EDIT PATIENT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Patient" : "Add Patient"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              {editingId ? "Save Changes" : "Save Patient"}
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FormField label="Patient Name *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  }}
>
  <FormField label="Age (years)">
    <Input
      type="number"
      min="0"
      max="150"
      value={form.age_years}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 3);
        setForm({ ...form, age_years: v });
      }}
      placeholder="e.g. 2"
    />
  </FormField>

  <FormField label="Age (months)">
    <Input
      type="number"
      min="0"
      max="11"
      value={form.age_months}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 2);
        setForm({
          ...form,
          age_months: v === "" ? "" : String(Math.min(11, Number(v))),
        });
      }}
      placeholder="e.g. 4"
    />
  </FormField>
</div>

<FormField label="Gender">
  <Select
    value={form.gender}
    onChange={(e) => setForm({ ...form, gender: e.target.value })}
    options={GENDERS.map((g) => ({ value: g, label: g }))}
  />
</FormField>
          </div>

          <FormField label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField label="Address">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </FormField>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Patient"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Delete <strong>{deleteTarget?.name}</strong>?
        </p>
      </Modal>

      {/* FILTER SHEET */}
      <Sheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Patients"
        mobileFullScreen
        maxHeightVh={86}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setFilterGender("All")}
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
        <h4
          style={{
            margin: "0 0 10px",
            fontSize: 12,
            textTransform: "uppercase",
            color: "#666",
          }}
        >
          Gender
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["All", ...GENDERS].map((g) => (
            <Chip
              key={g}
              tone="primary"
              active={filterGender === g}
              onClick={() => setFilterGender(g)}
            >
              {g}
            </Chip>
          ))}
        </div>
      </Sheet>
    </>
  );
}
