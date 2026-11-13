// src/components/Admin/PatientPicker.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FormField, Input, Select } from "../ui";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import local from "./PatientPicker.module.scss";

export interface PatientValue {
  name: string;
  phone: string;
  ageYears: string;
  ageMonths: string;
  gender: string;
  address: string;
}

export const emptyPatient = (): PatientValue => ({
  name: "",
  phone: "",
  ageYears: "",
  ageMonths: "",
  gender: "",
  address: "",
});

const GENDERS = ["Male", "Female", "Other"];

interface PatientPickerProps {
  value: PatientValue;
  onChange: (next: PatientValue) => void;
}

export const PatientPicker: React.FC<PatientPickerProps> = ({
  value,
  onChange,
}) => {
  const { tenant } = useTenant();
  const [patients, setPatients] = useState<any[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    supabaseService
      .getHospitalPatients(tenant.slug)
      .then((list) => setPatients(list || []))
      .catch(() => setPatients([]));
  }, [tenant?.slug]);

  const filtered = useMemo(() => {
    const q = value.name.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter((p) =>
        String(p.name || "")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 6);
  }, [patients, value.name]);

  const selectPatient = (p: any) => {
    onChange({
      name: p.name || "",
      phone: p.phone || "", // ← new: auto-fill
      ageYears:
        p.age_years !== undefined && p.age_years !== null
          ? String(p.age_years)
          : "",
      ageMonths:
        p.age_months !== undefined && p.age_months !== null
          ? String(p.age_months)
          : "",
      gender: p.gender || "",
      address: p.address || "",
    });
    setSuggestionsOpen(false);
  };

  return (
    <div className={local.grid}>
      <div className={local.nameWrap}>
        <FormField label="Patient Name *">
          <Input
            value={value.name}
            onChange={(e) => {
              onChange({ ...value, name: e.target.value });
              setSuggestionsOpen(true);
            }}
            onFocus={() => value.name && setSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 180)}
            placeholder="Search or type patient name..."
          />
        </FormField>

        {/* Suggestions dropdown — unchanged */}
        {suggestionsOpen && filtered.length > 0 && (
          <div className={local.suggestions}>
            {filtered.map((p) => (
              <div
                key={p.id}
                onMouseDown={() => selectPatient(p)}
                className={local.suggestionRow}
              >
                <strong>{p.name}</strong>
                {p.phone && (
                  <span className={local.suggestionPhone}>{p.phone}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* NEW: phone, right under the name inside the same cell */}
      <FormField label="Phone">
        <Input
          type="tel"
          value={value.phone}
          onChange={(e) =>
            onChange({
              ...value,
              phone: e.target.value.replace(/\D/g, "").slice(0, 10),
            })
          }
          placeholder="10-digit mobile"
        />
      </FormField>

      <div className={local.ageGroup}>
        <FormField label="Age (years)">
          <Input
            type="number"
            min="0"
            max="150"
            value={value.ageYears}
            onChange={(e) =>
              onChange({
                ...value,
                ageYears: e.target.value.replace(/\D/g, "").slice(0, 3),
              })
            }
            placeholder="e.g. 2"
          />
        </FormField>
        <FormField label="Age (months)">
          <Input
            type="number"
            min="0"
            max="11"
            value={value.ageMonths}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 2);
              onChange({
                ...value,
                ageMonths: v === "" ? "" : String(Math.min(11, Number(v))),
              });
            }}
            placeholder="e.g. 4"
          />
        </FormField>
      </div>

      <FormField label="Gender">
        <Select
          value={value.gender}
          onChange={(e) => onChange({ ...value, gender: e.target.value })}
          options={[
            { value: "", label: "- Select -" },
            ...GENDERS.map((g) => ({ value: g, label: g })),
          ]}
        />
      </FormField>

      <FormField label="Address" className={local.address}>
        <Input
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
        />
      </FormField>
    </div>
  );
};
