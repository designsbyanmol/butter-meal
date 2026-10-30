// src/components/Admin/PharmacyBillingBody.tsx
import React, { useMemo, useEffect, useState, useRef } from "react";
import { useTenant } from "../../contexts/TenantContext";
import {
  Button,
  Input,
  FormField,
  ConfirmDialog,
  Textarea,
  Select,
} from "../ui";
import { InlineSection } from "../Dashboard/inline";
import { printReceiptNode } from "../../utils/printReceipt";
import { formatRupees } from "../../utils/subscription";
import { startPharmacyBillSync } from "../../services/billSync";
import { supabaseService } from "../../services/supabase.service";
import PharmacyBillingHistory from "./PharmacyBillingHistory";
import local from "./Pharmacy.module.scss";

const TERMS_STORAGE_KEY = "hospital_bill_terms";

const DEFAULT_TERMS = `1. Goods once sold will not be taken back.
2. Keep medicines out of reach of children.`;

// ---------- Cache keys ----------
const stockKey = (slug: string) => `pharmacy_stock_cache::${slug}`;
const doctorKey = (slug: string) => `pharmacy_doctors_cache::${slug}`;
const patientKey = (slug: string) => `pharmacy_patients_cache::${slug}`;
const billsKey = (slug: string) => `billing_history::${slug}`;
const GENDERS = ["Male", "Female", "Other"];
const readCache = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const writeCache = (key: string, list: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* quota */
  }
};

// ---------- Draft ----------
const draftKey = (slug: string) => `pharmacy_billing_draft::${slug}`;

interface PharmacyDraft {
  items: BillItem[];
  patient: {
    name: string;
    phone: string;
    address: string;
    doctor: string;
    ageYears: string;
    ageMonths: string;
    gender: string;
  };
  billNo: string;
  additionalDiscountPct: number;
}

const emptyDraft = (): PharmacyDraft => ({
  items: [],
  patient: {
    name: "",
    phone: "",
    address: "",
    doctor: "",
    ageYears: "",
    ageMonths: "",
    gender: "",
  },
  billNo: `BILL-${Date.now().toString().slice(-6)}`,
  additionalDiscountPct: 0,
});

const readDraft = (slug: string): PharmacyDraft => {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyDraft();
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      patient: {
        name: String(parsed.patient?.name || ""),
        phone: String(parsed.patient?.phone || ""),
        address: String(parsed.patient?.address || ""),
        doctor: String(parsed.patient?.doctor || ""),
        ageYears: String(parsed.patient?.ageYears || ""),
        ageMonths: String(parsed.patient?.ageMonths || ""),
        gender: String(parsed.patient?.gender || ""),
      },
      billNo: String(
        parsed.billNo || `BILL-${Date.now().toString().slice(-6)}`,
      ),
      additionalDiscountPct: Number(parsed.additionalDiscountPct) || 0,
    };
  } catch {
    return emptyDraft();
  }
};

const writeDraft = (slug: string, draft: PharmacyDraft) => {
  try {
    localStorage.setItem(draftKey(slug), JSON.stringify(draft));
  } catch {
    /* ignore */
  }
};

const clearDraft = (slug: string) => {
  try {
    localStorage.removeItem(draftKey(slug));
  } catch {
    /* ignore */
  }
};

// ---------- Types ----------
interface BillItem {
  id: string;
  name: string;
  hsn: string;
  pack: string;
  packOf: number;
  unit: string;
  batch: string;
  exp: string;
  qty: number;
  extraUnits: number;
  mrp: number;
  price: number;
  discountPct: number;
  amount: number;
  availableStock: number;
}

const emptyItem: BillItem = {
  id: "",
  name: "",
  hsn: "",
  pack: "",
  packOf: 1,
  unit: "",
  batch: "",
  exp: "",
  qty: 0,
  extraUnits: 0,
  mrp: 0,
  price: 0,
  discountPct: 0,
  amount: 0,
  availableStock: 0,
};

const readStoredTerms = (): string => {
  try {
    const saved = localStorage.getItem(TERMS_STORAGE_KEY);
    return saved && saved.trim().length > 0 ? saved : DEFAULT_TERMS;
  } catch {
    return DEFAULT_TERMS;
  }
};

const COUNTABLE_UNITS = new Set(["tablet", "capsule", "strip", "sachet"]);
const normUnit = (u: string) =>
  (u || "").toLowerCase().trim().replace(/s$/, "");
const isCountable = (unit: string) => COUNTABLE_UNITS.has(normUnit(unit));

const unitPriceOf = (it: BillItem): number => {
  const packOf = it.packOf || 1;
  return packOf > 0 ? it.price / packOf : it.price;
};

// Sum of what each medicine already consumes across all rows.
const buildUsedByMedicine = (rows: BillItem[]): Map<string, number> => {
  const map = new Map<string, number>();
  rows.forEach((it) => {
    const name = (it.name || "").trim();
    if (!name) return;
    map.set(name, (map.get(name) ?? 0) + deductQty(it));
  });
  return map;
};

const lineBaseOf = (it: BillItem): number => {
  const up = unitPriceOf(it);
  return it.qty * it.price + (it.extraUnits || 0) * up;
};

const deductQty = (it: BillItem): number => {
  if (isCountable(it.unit) || it.packOf > 1) {
    return it.qty * (it.packOf || 1) + (it.extraUnits || 0);
  }
  return it.qty;
};

const totalUnitsOf = (it: BillItem): number =>
  it.qty * (it.packOf || 1) + (it.extraUnits || 0);

// ---------- Input helper ----------
const EmptyOnZeroInput: React.FC<{
  value: number;
  onValueChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
  title?: string;
  step?: number;
  placeholder?: string;
}> = ({
  value,
  onValueChange,
  min = 0,
  max,
  className,
  title,
  step = 1,
  placeholder,
}) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const display = focused ? draft : value === 0 ? "" : String(value);

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      title={title}
      className={className}
      placeholder={placeholder}
      value={display}
      onFocus={(e) => {
        setFocused(true);
        setDraft(value === 0 ? "" : String(value));
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw === "") {
          onValueChange(0);
          return;
        }
        let n = Number(raw);
        if (Number.isNaN(n)) return;
        if (n < min) n = min;
        if (max !== undefined && n > max) n = max;
        onValueChange(n);
      }}
      onBlur={() => {
        setFocused(false);
        if (draft === "" || Number.isNaN(Number(draft))) onValueChange(0);
      }}
    />
  );
};

// ---------- Main ----------
const PharmacyBillingBody: React.FC = () => {
  const { tenant } = useTenant();
  const slug = tenant?.slug ?? "";

  const [stock, setStock] = useState<any[]>(() =>
    readCache<any>(stockKey(slug)),
  );
  const [doctors, setDoctors] = useState<any[]>(() =>
    readCache<any>(doctorKey(slug)),
  );
  const [patients, setPatients] = useState<any[]>(() =>
    readCache<any>(patientKey(slug)),
  );

  const initialDraft = readDraft(slug);

  const [items, setItems] = useState<BillItem[]>(initialDraft.items);

  // Recompute the effective remaining stock for every row whenever
  // `items` changes. `usedByMedicine` sums what other rows consume,
  // so adding the same item twice correctly shows the reduced count.
  const usedByMedicine = useMemo(() => buildUsedByMedicine(items), [items]);

  // Cached stock lookup by name, from `stock`.
  const stockByName = useMemo(() => {
    const map = new Map<string, number>();
    stock.forEach((s) => {
      const name = String(s.name || "").trim();
      if (!name) return;
      map.set(name, Math.max(0, Number(s.stock_qty) || 0));
    });
    return map;
  }, [stock]);

  // For a given row, how many units of *its own* selection are consumed.
  const ownQtyForRow = (row: BillItem): number => deductQty(row);

  // Effective available stock for a row = total cached stock - what
  // OTHER rows consume. If the row's own selection exceeds the cache,
  // the row itself is still allowed (but the hint shows 0).
  const effectiveAvailableForRow = (row: BillItem): number => {
    const name = (row.name || "").trim();
    if (!name) return 0;
    const total = stockByName.get(name) ?? 0;
    const used = usedByMedicine.get(name) ?? 0;
    const othersUsed = Math.max(0, used - ownQtyForRow(row));
    return Math.max(0, total - othersUsed);
  };
  const [patient, setPatient] = useState(initialDraft.patient);
  const [billNo, setBillNo] = useState(initialDraft.billNo);
  const [terms, setTerms] = useState<string>(() => readStoredTerms());
  const [isTermsEditing, setIsTermsEditing] = useState(false);
  const [showUnlockTermsConfirm, setShowUnlockTermsConfirm] = useState(false);
  const [draftTerms, setDraftTerms] = useState<string>("");
  const [additionalDiscountPct, setAdditionalDiscountPct] = useState<number>(
    initialDraft.additionalDiscountPct,
  );
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);

  useEffect(() => {
    setStock(readCache<any>(stockKey(slug)));
    setDoctors(readCache<any>(doctorKey(slug)));
    setPatients(readCache<any>(patientKey(slug)));

    const d = readDraft(slug);
    setItems(d.items);
    setPatient(d.patient);
    setBillNo(d.billNo);
    setAdditionalDiscountPct(d.additionalDiscountPct);
  }, [slug]);

  // Persist terms.
  useEffect(() => {
    try {
      if (terms.trim().length > 0) {
        localStorage.setItem(TERMS_STORAGE_KEY, terms);
      }
    } catch {
      /* ignore */
    }
  }, [terms]);

  // Persist draft.
  useEffect(() => {
    if (!slug) return;
    writeDraft(slug, {
      items,
      patient,
      billNo,
      additionalDiscountPct,
    });
  }, [slug, items, patient, billNo, additionalDiscountPct]);

  // Sync local bills to Supabase on focus + hourly.
  useEffect(() => {
    if (!slug) return;
    return startPharmacyBillSync(slug);
  }, [slug]);

  // ---------- Patient suggestions ----------
  const handlePatientNameChange = (value: string) => {
    setPatient((prev) => ({ ...prev, name: value }));
    setShowPatientSuggestions(value.trim().length > 0);
  };

  const selectPatient = (p: any) => {
    setPatient({
      name: p.name,
      phone: p.phone || "",
      address: p.address || "",
      doctor: patient.doctor,
      ageYears:
        p.age_years !== undefined && p.age_years !== null
          ? String(p.age_years)
          : "",
      ageMonths:
        p.age_months !== undefined && p.age_months !== null
          ? String(p.age_months)
          : "",
      gender: p.gender || "",
    });
    setShowPatientSuggestions(false);
  };

  const filteredPatients =
    patient.name.trim().length > 0
      ? patients
          .filter((p) =>
            String(p.name || "")
              .toLowerCase()
              .includes(patient.name.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  // Sum of quantities already committed across all bill rows, keyed by
  // medicine name. Uses `deductQty` so packs + loose units are counted
  // consistently.
  const usedByOtherRows = (excludingRowId: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (const it of items) {
      if (it.id === excludingRowId) continue;
      if (!it.name) continue;
      const key = it.name.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + deductQty(it));
    }
    return map;
  };

  // Medicines still available for the given row: stock - already-used.
  // If `available <= 0`, the item is removed from that row's datalist.
  const availableMedicinesForRow = (
    rowId: string,
  ): { name: string; remaining: number }[] => {
    const out: { name: string; remaining: number }[] = [];

    // What the OTHER rows consume for each medicine.
    const usedByOthers = new Map<string, number>();
    items.forEach((it) => {
      if (it.id === rowId) return;
      const name = (it.name || "").trim();
      if (!name) return;
      usedByOthers.set(name, (usedByOthers.get(name) ?? 0) + deductQty(it));
    });

    stock.forEach((s) => {
      const name = String(s.name || "").trim();
      if (!name) return;
      const total = Math.max(0, Number(s.stock_qty) || 0);
      const remaining = total - (usedByOthers.get(name) ?? 0);
      if (remaining > 0) out.push({ name, remaining });
    });

    return out;
  };

  // ---------- Row editing ----------
  const addRow = () => {
    setItems([...items, { ...emptyItem, id: Math.random().toString() }]);
  };

  const updateRow = (id: string, field: keyof BillItem, value: any) => {
    setItems(
      items.map((it) => {
        if (it.id !== id) return it;
        const updated: BillItem = { ...it, [field]: value } as BillItem;

        if (field === "name") {
          const med = stock.find((s) => s.name === value);
          if (med) {
            updated.hsn = med.hsn_code || "";
            updated.packOf = Math.max(1, Number(med.pack_of) || 1);
            updated.unit = med.unit || "";
            updated.pack =
              med.pack_of && med.unit
                ? `${updated.packOf} ${normUnit(updated.unit)}${
                    updated.packOf !== 1 ? "s" : ""
                  } / pack`
                : med.pack_size || "";
            updated.batch = med.batch_no || "";
            updated.exp = med.expiry_date || "";
            updated.mrp = med.mrp || 0;
            updated.price = med.price || 0;

            // ── Effective stock = cached stock − what OTHER rows already use.
            const effectiveTotal = Math.max(0, Number(med.stock_qty) || 0);
            const othersUsed = items
              .filter((r) => r.id !== id && r.name === value)
              .reduce((s, r) => s + deductQty(r), 0);
            const remaining = Math.max(0, effectiveTotal - othersUsed);

            updated.availableStock = effectiveTotal;

            if (remaining >= updated.packOf) {
              updated.qty = 1;
            } else if (remaining > 0) {
              updated.qty = 0;
              updated.extraUnits = remaining;
            } else {
              updated.qty = 0;
              updated.extraUnits = 0;
            }
          } else {
            updated.availableStock = 0;
            updated.qty = Math.max(1, updated.qty || 1);
            updated.extraUnits = 0;
          }
        }

        updated.packOf = Math.max(1, Number(updated.packOf) || 1);
        updated.qty = Math.max(0, Number(updated.qty) || 0);
        updated.extraUnits = Math.max(0, Number(updated.extraUnits) || 0);

        if (!isCountable(updated.unit)) {
          updated.extraUnits = 0;
        }

        const available = Math.max(0, Number(updated.availableStock) || 0);
        if (available > 0) {
          const packOf = updated.packOf;

          if (isCountable(updated.unit)) {
            if (packOf > 1 && updated.extraUnits > packOf - 1) {
              updated.extraUnits = packOf - 1;
            }
            if (updated.extraUnits > available) {
              updated.extraUnits = available;
            }
          }

          const maxPacks = Math.floor(
            Math.max(
              0,
              available - (isCountable(updated.unit) ? updated.extraUnits : 0),
            ) / packOf,
          );
          if (updated.qty > maxPacks) updated.qty = maxPacks;

          if (isCountable(updated.unit)) {
            const leftover = available - updated.qty * packOf;
            const maxExtra2 =
              packOf > 1 ? Math.min(packOf - 1, leftover) : leftover;
            if (updated.extraUnits > maxExtra2) {
              updated.extraUnits = Math.max(0, maxExtra2);
            }
          }
        }

        const base = lineBaseOf(updated);
        const discount = base * (updated.discountPct / 100);
        updated.amount = base - discount;

        return updated;
      }),
    );
  };

  const removeRow = (id: string) =>
    setItems(items.filter((it) => it.id !== id));

  // ---------- Totals ----------
  const GST_PERCENT =
    typeof tenant?.gstPercent === "number" && tenant.gstPercent > 0
      ? tenant.gstPercent
      : 0;

  const subtotal = items.reduce((s, it) => s + lineBaseOf(it), 0);
  const totalDiscount = items.reduce(
    (s, it) => s + lineBaseOf(it) * (it.discountPct / 100),
    0,
  );
  const afterItemDiscount = Math.max(0, subtotal - totalDiscount);
  const safePct = Math.min(
    100,
    Math.max(0, Number(additionalDiscountPct) || 0),
  );
  const additionalDiscountAmount = (afterItemDiscount * safePct) / 100;

  const taxableValue = Math.max(
    0,
    afterItemDiscount - additionalDiscountAmount,
  );
  const gstAmount =
    GST_PERCENT > 0 ? Math.round(taxableValue * GST_PERCENT) / 100 : 0;
  const finalAmount = Math.round((taxableValue + gstAmount) * 100) / 100;

  // ---------- Terms flow ----------
  const requestEditTerms = () => {
    if (isTermsEditing) return;
    setShowUnlockTermsConfirm(true);
  };

  const confirmEditTerms = () => {
    setDraftTerms(terms);
    setShowUnlockTermsConfirm(false);
    setIsTermsEditing(true);
  };

  const cancelEditTerms = () => {
    setDraftTerms("");
    setIsTermsEditing(false);
  };

  const saveTerms = () => {
    setTerms(draftTerms);
    setIsTermsEditing(false);
    setDraftTerms("");
  };

  // ---------- Print ----------
  const handlePrint = () => {
    if (items.length === 0 || !patient.name) {
      alert("Please add items and a patient name before printing.");
      return;
    }

    if (isTermsEditing) {
      const ok = window.confirm(
        "You have unsaved edits in Terms & Conditions. Continue without saving them?",
      );
      if (!ok) return;
      setIsTermsEditing(false);
      setDraftTerms("");
    }

    for (const it of items) {
      const stockRow = stock.find((s) => s.name === it.name);
      if (!stockRow) continue;
      const available = Math.max(0, Number(stockRow.stock_qty) || 0);
      const needed = deductQty(it);
      if (needed === 0) {
        alert(`"${it.name}": quantity is zero.`);
        return;
      }
      if (needed > available && available > 0) {
        const u = normUnit(it.unit) || "units";
        alert(
          `"${it.name}": only ${available} ${u}${
            available !== 1 ? "s" : ""
          } in stock, but you are selling ${needed}. Stock will go negative.`,
        );
      }
    }

    const ok = printReceiptNode(printRef.current, {
      title: `${billNo}`,
      pageSize: "A5 landscape",
    });
    if (!ok) {
      alert("Allow pop-ups to print the bill.");
      return;
    }
    setShowPrintConfirm(true);
  };

  const confirmPrintSuccess = async () => {
    setShowPrintConfirm(false);
    if (!tenant) return;

    // 0. Auto-add the patient to the tenant's patient list if new.
    //    `upsertHospitalPatientByPhone` is a no-op if the phone already
    //    exists on the tenant, so it's safe to call every time.
    const trimmedName = patient.name.trim();
    const trimmedPhone = patient.phone.trim();
    const ageYears =
  patient.ageYears !== "" ? Number(patient.ageYears) || 0 : null;
const ageMonths =
  patient.ageMonths !== "" ? Number(patient.ageMonths) || 0 : null;
const genderValue = patient.gender.trim() || null;

if (trimmedName && trimmedPhone) {
  try {
    await supabaseService.upsertHospitalPatientByPhone(tenant.slug, {
      name: trimmedName,
      phone: trimmedPhone,
      address: patient.address.trim() || undefined,
      age_years: ageYears,
      age_months: ageMonths,
      gender: genderValue,
    });
  } catch (err) {
    console.warn("[pharmacy-billing] patient upsert failed:", err);
  }
}

    // 1. Save bill to local history (unchanged).
    const existing = readCache<any>(billsKey(tenant.slug));
    const billRecord = {
      id: `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bill_no: billNo,
      patient_name: trimmedName,
      phone: trimmedPhone,
      address: patient.address.trim(),
      doctor_name: patient.doctor.trim(),
      items,
      subtotal,
      discount: totalDiscount,
      additional_discount_pct: safePct,
      additional_discount: additionalDiscountAmount,
      gst_percent: GST_PERCENT,
      gst_amount: gstAmount,
      taxable_value: taxableValue,
      final_amount: finalAmount,
      terms,
      created_at: new Date().toISOString(),
    };
    writeCache(billsKey(tenant.slug), [billRecord, ...existing]);

    // 2. Deduct stock on the server and mirror the authoritative list
    //    into the local cache. This is what keeps the Pharmacy Stock
    //    tab and this billing form in sync.
    const deductPayload = items
      .filter((it) => it.name && deductQty(it) > 0)
      .map((it) => ({ name: it.name, qty: deductQty(it) }));

    let serverStock: any[] | null = null;
    try {
      serverStock = await supabaseService.deductPharmacyStockAndReturn(
        tenant.slug,
        deductPayload,
      );
    } catch (err) {
      console.warn("[pharmacy-billing] server stock deduction failed:", err);
    }

    if (serverStock) {
      setStock(serverStock);
      writeCache(stockKey(tenant.slug), serverStock);
    } else {
      // Fallback: keep the local-only deduction so the current session
      // reflects the sale even if the network call failed.
      const updatedLocal = stock.map((s) => {
        const line = items.find((it) => it.name === s.name);
        if (!line) return s;
        const deducted = deductQty(line);
        return {
          ...s,
          stock_qty: Math.max(0, Number(s.stock_qty || 0) - deducted),
        };
      });
      setStock(updatedLocal);
      writeCache(stockKey(tenant.slug), updatedLocal);
      console.warn(
        "[pharmacy-billing] stock deducted locally only - server not updated",
      );
    }

    // 2b. Refresh the local patient cache so the suggestion dropdown on
    //     the *next* bill already shows this patient. Best-effort; if
    //     the fetch fails we just keep the stale cache.
    try {
      const freshPatients = await supabaseService.getHospitalPatients(
        tenant.slug,
      );
      setPatients(freshPatients || []);
      writeCache(patientKey(tenant.slug), freshPatients || []);
    } catch (err) {
      console.warn("[pharmacy-billing] patient cache refresh failed:", err);
    }

    try {
      window.dispatchEvent(
        new CustomEvent("hospital-patients:changed", {
          detail: { slug: tenant.slug },
        }),
      );
    } catch {
      /* ignore */
    }

    // 3. Clear the draft.
    clearDraft(tenant.slug);

    // 4. Reset the form.
    alert("Bill saved to history successfully!");
    setItems([]);
    setPatient({
  name: "",
  phone: "",
  address: "",
  doctor: "",
  ageYears: "",
  ageMonths: "",
  gender: "",
});
    setAdditionalDiscountPct(0);
    setBillNo(`BILL-${Date.now().toString().slice(-6)}`);
  };

  // =========================================================
  // Render
  // =========================================================
  return (
    <>
      <InlineSection
        title="Create Pharmacy Bill"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="ghost"
              onClick={async () => {
                if (!tenant) return;
                const fresh = await supabaseService.getMedicineStock(
                  tenant.slug,
                );
                setStock(fresh || []);
                writeCache(stockKey(tenant.slug), fresh || []);
              }}
            >
              Refresh stock
            </Button>
            <Button onClick={() => setIsHistoryOpen(true)} variant="secondary">
              Bill History
            </Button>
          </div>
        }
      >
        {/* Patient details */}
        <div className={local.patientForm}>
          <div className={local.patientNameWrap}>
            <FormField label="Patient Name *">
              <Input
                value={patient.name}
                onChange={(e) => handlePatientNameChange(e.target.value)}
                onFocus={() =>
                  patient.name.length > 0 && setShowPatientSuggestions(true)
                }
                onBlur={() =>
                  setTimeout(() => setShowPatientSuggestions(false), 200)
                }
                placeholder="Search or type name..."
              />
            </FormField>

            {showPatientSuggestions && (
              <div className={local.suggestionDropdown}>
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((p) => (
                    <div
                      key={p.id || p.name}
                      onClick={() => selectPatient(p)}
                      className={local.suggestionItem}
                    >
                      <strong>{p.name}</strong>
                      {p.phone && (
                        <span className={local.suggestionPhone}>{p.phone}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className={local.suggestionEmpty}>
                    No cached patient. Type any name to continue.
                  </div>
                )}
              </div>
            )}
          </div>

          <FormField label="Phone Number *">
            <Input
              value={patient.phone}
              onChange={(e) =>
                setPatient({ ...patient, phone: e.target.value })
              }
            />
          </FormField>

          <FormField label="Address">
            <Input
              value={patient.address}
              onChange={(e) =>
                setPatient({ ...patient, address: e.target.value })
              }
            />
          </FormField>
          <div className={local.grid2}>
  <FormField label="Age (years)">
    <Input
      type="number"
      min="0"
      max="150"
      value={patient.ageYears}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 3);
        setPatient({ ...patient, ageYears: v });
      }}
      placeholder="e.g. 2"
    />
  </FormField>

  <FormField label="Age (months)">
    <Input
      type="number"
      min="0"
      max="11"
      value={patient.ageMonths}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 2);
        setPatient({
          ...patient,
          ageMonths: v === "" ? "" : String(Math.min(11, Number(v))),
        });
      }}
      placeholder="e.g. 4"
    />
  </FormField>
</div>

          <FormField label="Gender">
            <Select
              value={patient.gender}
              onChange={(e) =>
                setPatient({ ...patient, gender: e.target.value })
              }
              options={[
                { value: "", label: "- Select -" },
                ...GENDERS.map((g) => ({ value: g, label: g })),
              ]}
            />
          </FormField>

          <FormField label="Doctor Name">
            <Input
              value={patient.doctor}
              onChange={(e) =>
                setPatient({ ...patient, doctor: e.target.value })
              }
              list="doctor-suggestions"
              placeholder="Search or type..."
            />
            <datalist id="doctor-suggestions">
              {doctors.map((d) => (
                <option key={d.id || d.name} value={d.name} />
              ))}
            </datalist>
          </FormField>
        </div>

        {/* Items grid */}
        <div className={local.xlWrap}>
          <table className={local.xlTable}>
            <colgroup>
              <col className={local.xlColName} />
              <col className={local.xlColHsn} />
              <col className={local.xlColPack} />
              <col className={local.xlColBatch} />
              <col className={local.xlColExp} />
              <col className={local.xlColQty} />
              <col className={local.xlColMrp} />
              <col className={local.xlColDisc} />
              <col className={local.xlColAmount} />
              <col className={local.xlColDel} />
            </colgroup>
            <thead>
              <tr>
                <th>Medicines</th>
                <th>HSN</th>
                <th>Pack Of</th>
                <th>Batch</th>
                <th>Exp</th>
                <th>Qty (packs + loose)</th>
                <th>MRP</th>
                <th>Disc%</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const u = normUnit(it.unit) || "unit";
                const up = unitPriceOf(it);
                const available = effectiveAvailableForRow(it);
                const packOf = it.packOf || 1;
                const countable = isCountable(it.unit);
                const total = totalUnitsOf(it);

                const maxPacks =
                  available > 0
                    ? Math.floor(
                        Math.max(
                          0,
                          available - (countable ? it.extraUnits || 0 : 0),
                        ) / packOf,
                      )
                    : undefined;

                const maxLoose = countable
                  ? Math.min(
                      packOf > 1 ? packOf - 1 : available,
                      Math.max(0, available - it.qty * packOf),
                    )
                  : 0;

                // Meds remaining after other rows' quantities. Includes this row's
                // own selection so the current medicine stays in the dropdown while
                // the user is editing it.
                const availableMeds = availableMedicinesForRow(it.id);

                return (
                  <React.Fragment key={it.id}>
                    <tr>
                      <td className={local.xlCellName}>
                        <input
                          list={`med-list-${it.id}`}
                          value={it.name}
                          onChange={(e) =>
                            updateRow(it.id, "name", e.target.value)
                          }
                          className={local.xlInput}
                          placeholder="Type medicine name..."
                        />
                        <datalist id={`med-list-${it.id}`}>
                          {availableMeds.map((m) => (
                            <option key={m.name} value={m.name} />
                          ))}
                        </datalist>
                      </td>
                      <td>
                        <input
                          value={it.hsn}
                          onChange={(e) =>
                            updateRow(it.id, "hsn", e.target.value)
                          }
                          className={local.xlInput}
                        />
                      </td>
                      <td>
                        <input
                          value={it.pack}
                          onChange={(e) =>
                            updateRow(it.id, "pack", e.target.value)
                          }
                          className={local.xlInput}
                          placeholder={packOf > 1 ? `${packOf} ${u}s` : ""}
                        />
                      </td>
                      <td>
                        <input
                          value={it.batch}
                          onChange={(e) =>
                            updateRow(it.id, "batch", e.target.value)
                          }
                          className={local.xlInput}
                        />
                      </td>
                      <td>
                        <input
                          value={it.exp}
                          onChange={(e) =>
                            updateRow(it.id, "exp", e.target.value)
                          }
                          className={local.xlInput}
                        />
                      </td>

                      <td>
                        <div className={local.xlQtyRow}>
                          <div className={local.xlQtyField}>
                            <EmptyOnZeroInput
                              value={it.qty}
                              onValueChange={(n) => updateRow(it.id, "qty", n)}
                              className={local.xlInput}
                              max={maxPacks}
                              title={`Packs${
                                maxPacks !== undefined
                                  ? ` (max ${maxPacks})`
                                  : ""
                              }`}
                              placeholder="Packs"
                            />
                          </div>
                          {countable && (
                            <div className={local.xlQtyField}>
                              <span className={local.xlQtyPlus}>+</span>
                              <EmptyOnZeroInput
                                value={it.extraUnits}
                                onValueChange={(n) =>
                                  updateRow(it.id, "extraUnits", n)
                                }
                                className={local.xlInput}
                                max={maxLoose}
                                placeholder={u}
                                title={`Loose ${u}s (max ${maxLoose})`}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td>
                        <input
                          type="number"
                          value={it.mrp}
                          onChange={(e) =>
                            updateRow(it.id, "mrp", Number(e.target.value))
                          }
                          className={local.xlInput}
                          title="MRP per pack"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={it.discountPct}
                          onChange={(e) =>
                            updateRow(
                              it.id,
                              "discountPct",
                              Number(e.target.value),
                            )
                          }
                          className={local.xlInput}
                        />
                      </td>
                      <td className={local.xlCellAmount}>
                        <strong>{formatRupees(it.amount)}</strong>
                      </td>
                      <td className={local.xlCellDel}>
                        <button
                          onClick={() => removeRow(it.id)}
                          className={local.delBtn}
                        >
                          X
                        </button>
                      </td>
                    </tr>
                    <tr className={local.infoRow}>
                      <td>
                        {it.name && (
                          <small
                            className={
                              available === 0
                                ? `${local.stockLimitHint} ${local.stockLimitHintOos}`
                                : local.stockLimitHint
                            }
                          >
                            {available === 0
                              ? "Not in local stock (offline bill)"
                              : `${available} ${u}${
                                  available !== 1 ? "s" : ""
                                } in local stock`}
                          </small>
                        )}
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>
                        {it.name && (
                          <small className={local.xlQtyHint}>
                            {total} {u}
                            {total !== 1 ? "s" : ""}
                            {packOf > 1 && countable && up > 0
                              ? ` - @ ${formatRupees(up)}/${u}`
                              : ""}
                          </small>
                        )}
                      </td>
                      <td></td>
                      <td></td>
                      <td>
                        {it.name && (
                          <small className={local.amountHint}>
                            {formatRupees(it.price)} / pack
                          </small>
                        )}
                      </td>
                      <td></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          <div className={local.addRowWrap}>
            <Button variant="ghost" onClick={addRow} leftIcon={<span>+</span>}>
              Add Medicine Row
            </Button>
          </div>
        </div>

        <div className={local.footerTermTotal}>
          <div className={local.termsEditor}>
            <div className={local.termsHeaderRow}>
              <FormField label="Terms & Conditions (printed on bill)">
                {isTermsEditing ? (
                  <Textarea
                    value={draftTerms}
                    onChange={(e) => setDraftTerms(e.target.value)}
                    rows={4}
                    placeholder="Enter terms and conditions..."
                    autoFocus
                  />
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    className={local.termsReadonly}
                    onClick={requestEditTerms}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        requestEditTerms();
                      }
                    }}
                    title="Click to edit terms"
                  >
                    {terms}
                  </div>
                )}
              </FormField>
            </div>

            {isTermsEditing ? (
              <div className={local.termsActionRow}>
                <span className={local.termsEditingHint}>
                  Editing - click Save to apply to new bills.
                </span>
                <div className={local.termsActionBtns}>
                  <Button size="sm" variant="ghost" onClick={cancelEditTerms}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveTerms}>
                    Save Terms
                  </Button>
                </div>
              </div>
            ) : (
              <div className={local.termsHint}>
                Locked. Click the text above to edit.
              </div>
            )}
          </div>

          <div className={local.totals}>
            <div className={local.totalRow}>
              <span>Subtotal:</span>
              <span>{formatRupees(subtotal)}</span>
            </div>
            <div className={local.totalRow}>
              <span>Total Discount:</span>
              <span>-{formatRupees(totalDiscount)}</span>
            </div>

            <div className={`${local.totalRow} ${local.additionalDiscountRow}`}>
              <span>Additional Discount:</span>
              <span className={local.pctInputWrap}>
                <EmptyOnZeroInput
                  value={safePct}
                  onValueChange={(n) => setAdditionalDiscountPct(n)}
                  className={local.pctInput}
                  max={100}
                  step={0.5}
                  title="Percent off the post-item-discount amount"
                />
                <span className={local.pctInputSuffix}>%</span>
              </span>
            </div>

            {additionalDiscountAmount > 0 && (
              <div
                className={`${local.totalRow} ${local.additionalDiscountAmountRow}`}
              >
                <span></span>
                <span>-{formatRupees(additionalDiscountAmount)}</span>
              </div>
            )}

            {GST_PERCENT > 0 && (
              <>
                <div className={local.totalRow}>
                  <span>Taxable value:</span>
                  <span>{formatRupees(taxableValue)}</span>
                </div>
                <div className={local.totalRow}>
                  <span>GST ({GST_PERCENT}%):</span>
                  <span>{formatRupees(gstAmount)}</span>
                </div>
              </>
            )}

            <div className={`${local.totalRow} ${local.grandTotal}`}>
              <span>Final Amount:</span>
              <span>{formatRupees(finalAmount)}</span>
            </div>

            <Button onClick={handlePrint} size="lg" className={local.printBtn}>
              Print Bill & Save
            </Button>
          </div>
        </div>
      </InlineSection>

      <PharmacyBillingHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Hidden A5 Print Layout */}
      <div className={local.printHiddenContainer}>
        <div ref={printRef} className={local.printPage}>
          <div className={local.printHeader}>
            <div className={local.printLeft}>
              <h2>{tenant?.displayName || "Hospital Name"}</h2>
              {tenant?.storeTagline && (
                <p className={local.printTagline}>{tenant.storeTagline}</p>
              )}
              {tenant?.storeAddress && (
                <p className={local.printAddress}>{tenant.storeAddress}</p>
              )}
              {tenant?.whatsappPhone && (
                <p className={local.printContact}>
                  Contact: {tenant.whatsappPhone}
                </p>
              )}
            </div>
            <div className={local.printRight}>
              <h3>GST BILL</h3>
              {tenant?.gstNo && (
                <p className={local.printGstin}>GSTIN: {tenant.gstNo}</p>
              )}
              <p className={local.printMeta}>Bill No.: {billNo}</p>
              <p className={local.printMeta}>
                Date: {new Date().toLocaleDateString("en-IN")}
              </p>
              <p className={local.printMeta}>
                Time:{" "}
                {new Date().toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          </div>

          <div className={local.printPatientBar}>
            <p>
  <strong>Patient:</strong> {patient.name}
  {(() => {
    const y = patient.ageYears;
    const m = patient.ageMonths;
    if (!y && !m) return "";
    const parts: string[] = [];
    if (y) parts.push(`${y}y`);
    if (m) parts.push(`${m}m`);
    return ` (${parts.join(" ")})`;
  })()}
</p>
          
            <p>
              <strong>Address:</strong> {patient.address}
            </p>
            <p>
              <strong>Doctor:</strong> {patient.doctor}
            </p>
          </div>

          <table className={local.printTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Medicines</th>
                <th>HSN</th>
                <th>Pack</th>
                <th>Batch</th>
                <th>Exp</th>
                <th>Qty (pack × loose)</th>
                <th>MRP</th>
                <th>Disc</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, index) => {
                const u = normUnit(it.unit) || "unit";
                const countable = isCountable(it.unit);
                const qtyCell =
                  countable && it.packOf > 1
                    ? `${it.qty} pk + ${it.extraUnits} ${u}${
                        it.extraUnits !== 1 ? "s" : ""
                      }`
                    : `${it.qty} pk`;
                return (
                  <tr key={it.id}>
                    <td>{index + 1}</td>
                    <td>{it.name}</td>
                    <td>{it.hsn}</td>
                    <td>{it.packOf > 1 ? `${it.packOf} ${u}s` : it.pack}</td>
                    <td>{it.batch}</td>
                    <td>{it.exp}</td>
                    <td>{qtyCell}</td>
                    <td>{Number(it.mrp).toFixed(2)}</td>
                    <td>{it.discountPct}%</td>
                    <td>{Number(it.amount).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className={local.printFooter}>
            <div className={local.printTerms}>
              <h4>Terms and conditions</h4>
              <div className={local.printTermsBody}>{terms}</div>
            </div>
            <div className={local.printTotals}>
              <p>Subtotal: {formatRupees(subtotal)}</p>
              <p>Discount: -{formatRupees(totalDiscount)}</p>
              {safePct > 0 && (
                <p>
                  Additional Discount ({safePct}%): -
                  {formatRupees(additionalDiscountAmount)}
                </p>
              )}
              {GST_PERCENT > 0 && (
                <>
                  <p>Taxable value: {formatRupees(taxableValue)}</p>
                  <p>
                    GST ({GST_PERCENT}%): {formatRupees(gstAmount)}
                  </p>
                </>
              )}
              <h3>Final Amount: {formatRupees(finalAmount)}</h3>
            </div>
          </div>
          <div className={local.printGetWell}>Get Well Soon by Dozzelo</div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showPrintConfirm}
        title="Print Successful?"
        message="Did the bill print correctly? Clicking Yes will save this bill to the local history and clear the form."
        disableBackdropClose={true}
        confirmText="Yes, Save Bill"
        cancelText="No, let me check"
        onConfirm={confirmPrintSuccess}
        onCancel={() => setShowPrintConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showUnlockTermsConfirm}
        title="Edit Terms & Conditions?"
        message="Terms & Conditions are used on every printed bill. Are you sure you want to edit them?"
        confirmText="Yes, Edit"
        cancelText="Cancel"
        onConfirm={confirmEditTerms}
        onCancel={() => setShowUnlockTermsConfirm(false)}
      />
    </>
  );
};

export default PharmacyBillingBody;
