// src/components/Admin/HospitalDoctorsBody.tsx
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
  Banner,
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

const DEFAULT_CATEGORIES = [
  "General Medicine",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
  "Cardiology",
];

interface HospitalDoctorsBodyProps {
  onCountChange?: (n: number) => void;
}

const STORAGE_KEY = "hospital_service_categories";

const readStoredCategories = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(saved);
    const cleaned = Array.isArray(parsed)
      ? parsed.filter(
          (c): c is string => typeof c === "string" && c.trim().length > 0,
        )
      : [];
    return cleaned.length > 0 ? cleaned : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

const PAGE_SIZE = 12;
const GENDERS = ["Male", "Female", "Other"];

const emptyForm = {
  name: "",
  age: "",
  gender: "Male",
  phone: "",
  email: "",
  address: "",
  experience: "",
  category: "",
};

export default function HospitalDoctorsBody({
  onCountChange,
}: HospitalDoctorsBodyProps = {}) {
  const { tenant } = useTenant();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [categoriesVersion, setCategoriesVersion] = useState(0);

  const refreshCategories = () => {
    setModalCategories(readStoredCategories());
    setCategoriesVersion((v) => v + 1);
  };

  const [modalCategories, setModalCategories] = useState<string[]>(() =>
    readStoredCategories(),
  );

  // Fresh filter list recomputed whenever categoriesVersion changes OR the filter sheet opens:
  const filterCategories = useMemo(
    () => ["All", ...readStoredCategories()],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isFilterOpen, categoriesVersion],
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        refreshCategories();
      }
    };
    const onFocus = () => refreshCategories();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const load = async () => {
    if (!tenant) return;
    setIsLoading(true);
    const data = await supabaseService.getHospitalDoctors(tenant.slug);
    setDoctors(data);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, [tenant?.slug]);
  useEffect(() => {
    setPage(1);
  }, [search, filterCat]);

  const openAddModal = () => {
    const fresh = readStoredCategories();
    setModalCategories(fresh);
    setCategoriesVersion((v) => v + 1);
    setEditingId(null);
    setForm({ ...emptyForm, category: fresh[0] || "" });
    setIsModalOpen(true);
  };

  const openEditModal = (doctor: any) => {
    const fresh = readStoredCategories();
    setModalCategories(fresh);
    setCategoriesVersion((v) => v + 1);
    setEditingId(doctor.id);
    setForm({
      name: doctor.name || "",
      age: doctor.age || "",
      gender: doctor.gender || "Male",
      phone: doctor.phone || "",
      email: doctor.email || "",
      address: doctor.address || "",
      experience: doctor.experience || "",
      category: doctor.category || fresh[0] || "",
    });
    setIsModalOpen(true);
  };

  const openFilterSheet = () => {
    refreshCategories();
    setIsFilterOpen(true);
  };

  const handleSave = async () => {
    if (!tenant || !form.name) return;
    setIsSaving(true);

    if (editingId) {
      await supabaseService.updateHospitalDoctor(editingId, form);
    } else {
      await supabaseService.addHospitalDoctor(tenant.slug, form);
    }

    setIsSaving(false);
    setIsModalOpen(false);
    setForm({ ...emptyForm });
    setEditingId(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabaseService.deleteHospitalDoctor(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const filteredDoctors = useMemo(() => {
    let result = doctors;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.phone || "").includes(q) ||
          (d.email || "").toLowerCase().includes(q) ||
          (d.category || "").toLowerCase().includes(q),
      );
    }
    if (filterCat !== "All") {
      result = result.filter((d) => d.category === filterCat);
    }
    return result;
  }, [doctors, search, filterCat]);

  useEffect(() => {
    if (onCountChange) onCountChange(filteredDoctors.length);
  }, [filteredDoctors.length, onCountChange]);

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / PAGE_SIZE));
  const paginatedDoctors = filteredDoctors.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <>
      <InlineSection
        title={`Doctors (${filteredDoctors.length})`}
        actions={
          <Button
            size="sm"
            onClick={openAddModal}
            leftIcon={<PlusIcon width={16} height={16} fill="#fff" />}
          >
            Add Doctor
          </Button>
        }
      >
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Search doctor name, phone, specialty..."
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
            variant={filterCat !== "All" ? "primary" : "ghost"}
            onClick={openFilterSheet}
            leftIcon={<FilterIcon width={14} height={14} fill="currentColor" />}
            rightIcon={
              filterCat !== "All" ? (
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
        ) : filteredDoctors.length === 0 ? (
          <EmptyState
            title="No doctors found"
            description="Add your first doctor to get started."
          />
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {paginatedDoctors.map((d) => (
                <div
                  key={d.id}
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
                        Dr. {d.name}
                      </h3>
                      <Badge tone="info" size="sm">
                        {d.category || "No category"}
                      </Badge>
                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        {d.experience ? `${d.experience} yrs exp . ` : ""}
                        {d.gender}
                        {d.age ? ` . Age ${d.age}` : ""}
                      </p>
                      {d.phone && (
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 12,
                            color: "#94a3b8",
                          }}
                        >
                          📞 {d.phone}
                        </p>
                      )}
                      {d.email && (
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 12,
                            color: "#94a3b8",
                          }}
                        >
                          ✉️ {d.email}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(d)}
                        title="Edit"
                      >
                        <EditIcon width={14} height={14} fill="currentColor" />
                      </IconButton>
                      <IconButton
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteTarget(d)}
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
              totalItems={filteredDoctors.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </InlineSection>

      {/* ADD / EDIT DOCTOR MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Doctor" : "Add Doctor"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={isSaving}>
              {editingId ? "Save Changes" : "Save Doctor"}
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FormField label="Doctor Name *">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Dr. Anmol Sharma"
            />
          </FormField>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <FormField label="Age">
              <Input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </FormField>
            <FormField label="Gender">
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                }}
              >
                {GENDERS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Specialty / Category">
            {modalCategories.length === 0 ? (
              <Banner variant="warning" inline>
                No categories found. Please add categories in the Services tab
                first.
              </Banner>
            ) : (
              <Select
                value={
                  modalCategories.includes(form.category)
                    ? form.category
                    : modalCategories[0]
                }
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={modalCategories.map((c) => ({ value: c, label: c }))}
              />
            )}
          </FormField>

          <FormField label="Years of Experience">
            <Input
              type="number"
              value={form.experience}
              onChange={(e) => setForm({ ...form, experience: e.target.value })}
            />
          </FormField>
          <FormField label="Phone (Optional)">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Email (Optional)">
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
        title="Delete Doctor"
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
          Delete <strong>Dr. {deleteTarget?.name}</strong>?
        </p>
      </Modal>

      {/* FILTER SHEET */}
      <Sheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Doctors"
        mobileFullScreen
        maxHeightVh={86}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFilterCat("All")} block>
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
          Specialty
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {filterCategories.map((c) => (
            <Chip
              key={c}
              tone="primary"
              active={filterCat === c}
              onClick={() => setFilterCat(c)}
            >
              {c}
            </Chip>
          ))}
        </div>
      </Sheet>
    </>
  );
}
