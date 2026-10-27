// src/components/Admin/PharmacyBillingBody.tsx
import React, { useEffect, useState, useRef } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import { Button, Input, FormField, ConfirmDialog, Textarea } from "../ui";
import { InlineSection } from "../Dashboard/inline";
import { printReceiptNode } from "../../utils/printReceipt";
import { formatRupees } from "../../utils/subscription";
import PharmacyBillingHistory from "./PharmacyBillingHistory";
import local from "./Pharmacy.module.scss";

const TERMS_STORAGE_KEY = "hospital_bill_terms";

const DEFAULT_TERMS = `1. Goods once sold will not be taken back.
2. Keep medicines out of reach of children.`;

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

const EmptyOnZeroInput: React.FC<{
  value: number;
  onValueChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
  title?: string;
  step?: number;
  placeholder?: string;
}> = ({ value, onValueChange, min = 0, max, className, title, step = 1, placeholder }) => {
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

const PharmacyBillingBody: React.FC = () => {
  const { tenant } = useTenant();
  const [stock, setStock] = useState<any[]>([]);
  const [items, setItems] = useState<BillItem[]>([]);

  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  const [patient, setPatient] = useState({
    name: "",
    phone: "",
    address: "",
    doctor: "",
  });

  const [billNo, setBillNo] = useState(
    `BILL-${Date.now().toString().slice(-6)}`,
  );

  const [terms, setTerms] = useState<string>(() => readStoredTerms());

  // - NEW: locked / editing state for Terms & Conditions
  const [isTermsEditing, setIsTermsEditing] = useState(false);
  const [showUnlockTermsConfirm, setShowUnlockTermsConfirm] = useState(false);
  const [draftTerms, setDraftTerms] = useState<string>("");

  // Additional discount is a PERCENT (0–100) on the post-item-discount amount.
  const [additionalDiscountPct, setAdditionalDiscountPct] = useState<number>(0);

  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);

  useEffect(() => {
    if (tenant) {
      Promise.all([
        supabaseService.getMedicineStock(tenant.slug),
        supabaseService.getHospitalDoctors(tenant.slug),
        supabaseService.getHospitalPatients(tenant.slug),
      ]).then(([stockData, doctorsData, patientsData]) => {
        setStock(stockData || []);
        setDoctors(doctorsData || []);
        setPatients(patientsData || []);
      });
    }
  }, [tenant]);

  // Persist terms whenever they are successfully saved.
  useEffect(() => {
    try {
      if (terms.trim().length > 0) {
        localStorage.setItem(TERMS_STORAGE_KEY, terms);
      }
    } catch {
      /* ignore */
    }
  }, [terms]);

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
    });
    setShowPatientSuggestions(false);
  };

  const goToAddPatient = () => {
    if (!tenant) return;
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/\/[^/]*$/, "/admin-menu.html");
    url.searchParams.set("t", `${tenant.slug}_admin`);
    url.searchParams.set("tab", "patients");
    window.location.href = url.toString();
  };

  const filteredPatients =
    patient.name.trim().length > 0
      ? patients
          .filter((p) =>
            p.name.toLowerCase().includes(patient.name.toLowerCase()),
          )
          .slice(0, 5)
      : [];

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
            updated.availableStock = Math.max(0, Number(med.stock_qty) || 0);

            const totalAvailable = updated.availableStock;
            const onePackUnits = updated.packOf;
            if (totalAvailable >= onePackUnits) {
              updated.qty = 1;
            } else if (totalAvailable > 0) {
              updated.qty = 0;
              updated.extraUnits = totalAvailable;
            } else {
              updated.qty = 0;
              updated.extraUnits = 0;
            }
          } else {
            updated.availableStock = 0;
            updated.qty = 0;
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

        if (available === 0) {
          updated.qty = 0;
          updated.extraUnits = 0;
        } else {
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
  const finalAmount = Math.max(0, afterItemDiscount - additionalDiscountAmount);

  // - NEW: Terms & Conditions edit flow handlers
  const requestEditTerms = () => {
    if (isTermsEditing) return;
    setShowUnlockTermsConfirm(true);
  };

  const confirmEditTerms = () => {
    setDraftTerms(terms); // seed the editor with the current saved terms
    setShowUnlockTermsConfirm(false);
    setIsTermsEditing(true);
  };

  const cancelEditTerms = () => {
    // discard draft, keep the saved terms as-is
    setDraftTerms("");
    setIsTermsEditing(false);
  };

  const saveTerms = () => {
    const trimmed = draftTerms;
    setTerms(trimmed); // triggers the persistence effect
    setIsTermsEditing(false);
    setDraftTerms("");
  };

  const handlePrint = () => {
    if (items.length === 0 || !patient.name) {
      alert("Please add items and a patient name before printing.");
      return;
    }

    // - NEW: warn if user is still editing terms and hasn't saved
    if (isTermsEditing) {
      const ok = window.confirm(
        "You have unsaved edits in Terms & Conditions. Continue without saving them?",
      );
      if (!ok) return;
      // discard the draft, keep the previously saved terms
      setIsTermsEditing(false);
      setDraftTerms("");
    }

    for (const it of items) {
      const stockRow = stock.find((s) => s.name === it.name);
      const available = Math.max(0, Number(stockRow?.stock_qty) || 0);
      const needed = deductQty(it);
      if (needed === 0) {
        alert(`"${it.name}": quantity is zero.`);
        return;
      }
      if (needed > available) {
        const u = normUnit(it.unit) || "units";
        alert(
          `"${it.name}": only ${available} ${u}${available !== 1 ? "s" : ""} in stock, cannot sell ${needed}.`,
        );
        return;
      }
    }

    setIsPrinting(true);

    setTimeout(() => {
      printReceiptNode(printRef.current);
      setIsPrinting(false);
      setShowPrintConfirm(true);
    }, 300);
  };

  const confirmPrintSuccess = async () => {
    setShowPrintConfirm(false);
    if (!tenant) return;

    const payload = {
      bill_no: billNo,
      patient_name: patient.name,
      phone: patient.phone,
      address: patient.address,
      doctor_name: patient.doctor,
      items,
      subtotal,
      discount: totalDiscount,
      additional_discount_pct: safePct,
      additional_discount: additionalDiscountAmount,
      final_amount: finalAmount,
      terms,
    };

    const saved = await supabaseService.createPharmacyBill(
      tenant.slug,
      payload,
    );
    if (!saved) {
      alert("Failed to save bill. Please try again.");
      return;
    }

    const deducted = await supabaseService.deductPharmacyStock(
      tenant.slug,
      items.map((it) => ({ name: it.name, qty: deductQty(it) })),
    );
    if (!deducted) {
      console.warn("Bill saved but stock deduction failed. Check console.");
    }

    const stockData = await supabaseService.getMedicineStock(tenant.slug);
    setStock(stockData || []);

    alert("Bill saved to history successfully!");
    setItems([]);
    setPatient({ name: "", phone: "", address: "", doctor: "" });
    setAdditionalDiscountPct(0);
    setBillNo(`BILL-${Date.now().toString().slice(-6)}`);
  };

  return (
    <>
      <InlineSection
        title="Create Pharmacy Bill"
        actions={
          <Button onClick={() => setIsHistoryOpen(true)} variant="secondary">
            Bill History
          </Button>
        }
      >
        {/* Patient Details */}
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
                  <>
                    {filteredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => selectPatient(p)}
                        className={local.suggestionItem}
                      >
                        <strong>{p.name}</strong>
                        {p.phone && (
                          <span className={local.suggestionPhone}>
                            {p.phone}
                          </span>
                        )}
                      </div>
                    ))}
                    <div
                      onClick={goToAddPatient}
                      className={local.suggestionAddNew}
                    >
                      + Add new patient
                    </div>
                  </>
                ) : (
                  <div
                    onClick={goToAddPatient}
                    className={local.suggestionEmpty}
                  >
                    No patient found. + Add "{patient.name}" as new patient
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
                <option key={d.id} value={d.name} />
              ))}
            </datalist>
          </FormField>

          <FormField label="Address">
            <Input
              value={patient.address}
              onChange={(e) =>
                setPatient({ ...patient, address: e.target.value })
              }
            />
          </FormField>
        </div>

        {/* BILL ITEMS - Excel-style grid */}
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
                const available = it.availableStock;
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
                    : 0;
                const maxLoose = countable
                  ? Math.min(
                      packOf > 1 ? packOf - 1 : available,
                      Math.max(0, available - it.qty * packOf),
                    )
                  : 0;

                return (
                  <>
                    <tr key={it.id}>
                      <td className={local.xlCellName}>
                        <input
                          list="med-list"
                          value={it.name}
                          onChange={(e) =>
                            updateRow(it.id, "name", e.target.value)
                          }
                          className={local.xlInput}
                          placeholder="Type medicine name..."
                        />
                        <datalist id="med-list">
                          {stock.map((s) => (
                            <option key={s.id} value={s.name} />
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
                              title={`Packs (max ${maxPacks})`}
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
                              ? "Out of stock"
                              : `${available} ${u}${available !== 1 ? "s" : ""} in stock`}
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
                  </>
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
          {/* - NEW: Locked / editing Terms & Conditions */}
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
              <span>Subtotal:</span> <span>{formatRupees(subtotal)}</span>
            </div>
            <div className={local.totalRow}>
              <span>Total Discount:</span>{" "}
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

            <div className={`${local.totalRow} ${local.grandTotal}`}>
              <span>Final Amount:</span>{" "}
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
              <strong>Patient:</strong> {patient.name} ({patient.phone})
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
              <h3>Final Amount: {formatRupees(finalAmount)}</h3>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showPrintConfirm}
        title="Print Successful?"
        message="Did the bill print correctly? Clicking Yes will save this bill to the patient history and clear the form."
        confirmText="Yes, Save Bill"
        cancelText="No, let me check"
        onConfirm={confirmPrintSuccess}
        onCancel={() => setShowPrintConfirm(false)}
      />

      {/* - NEW: Unlock Terms confirmation */}
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
