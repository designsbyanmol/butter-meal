// src/components/Admin/PatientPicker.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { FormField, Input, Select } from '../ui';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';

export interface PatientValue {
  name: string;
  ageYears: string;
  ageMonths: string;
  gender: string;
  address: string;
}

export const emptyPatient = (): PatientValue => ({
  name: '',
  ageYears: '',
  ageMonths: '',
  gender: '',
  address: '',
});

const GENDERS = ['Male', 'Female', 'Other'];

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
      .filter((p) => String(p.name || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [patients, value.name]);

  const selectPatient = (p: any) => {
    onChange({
      name: p.name || '',
      ageYears:
        p.age_years !== undefined && p.age_years !== null
          ? String(p.age_years)
          : '',
      ageMonths:
        p.age_months !== undefined && p.age_months !== null
          ? String(p.age_months)
          : '',
      gender: p.gender || '',
      address: p.address || '',
    });
    setSuggestionsOpen(false);
  };

  return (
    <>
      <div style={{ position: 'relative' }}>
        <FormField label="Patient Name *">
          <Input
            value={value.name}
            onChange={(e) => {
              onChange({ ...value, name: e.target.value });
              setSuggestionsOpen(true);
            }}
            onFocus={() => value.name && setSuggestionsOpen(true)}
            onBlur={() =>
              setTimeout(() => setSuggestionsOpen(false), 180)
            }
            placeholder="Search or type patient name..."
          />
        </FormField>

        {suggestionsOpen && filtered.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100,
              marginTop: 4,
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {filtered.map((p) => (
              <div
                key={p.id}
                onMouseDown={() => selectPatient(p)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: 13,
                }}
              >
                <strong>{p.name}</strong>
                {p.phone && (
                  <span style={{ color: '#64748b', marginLeft: 8 }}>
                    {p.phone}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <FormField label="Age (years)">
          <Input
            type="number"
            min="0"
            max="150"
            value={value.ageYears}
            onChange={(e) =>
              onChange({
                ...value,
                ageYears: e.target.value.replace(/\D/g, '').slice(0, 3),
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
              const v = e.target.value.replace(/\D/g, '').slice(0, 2);
              onChange({
                ...value,
                ageMonths:
                  v === '' ? '' : String(Math.min(11, Number(v))),
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
            { value: '', label: '- Select -' },
            ...GENDERS.map((g) => ({ value: g, label: g })),
          ]}
        />
      </FormField>

      <FormField label="Address">
        <Input
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
        />
      </FormField>
    </>
  );
};