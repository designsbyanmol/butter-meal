// src/components/Admin/BillingBody.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { useMenu } from '../../hooks/useMenu';
import { Button, Input, FormField, ConfirmDialog, Textarea, Chip } from '../ui';
import { InlineSection } from '../Dashboard/inline';
import { printReceiptNode } from '../../utils/printReceipt';
import { formatRupees } from '../../utils/subscription';
import { startStoreBillSync } from '../../services/billSync';
import BillingHistoryModal from './BillingHistoryModal';
import local from './Pharmacy.module.scss';

const TERMS_STORAGE_KEY = 'billing_terms_v1';

const DEFAULT_TERMS = `1. Goods once sold will not be taken back.
2. Please retain this bill for any future queries.`;

// ---------- Types ----------
interface BillLine {
  id: string;
  menuId: number;
  name: string;
  price: number;
  quantity: number;
  discountPct: number;
  amount: number;
  customizations?: Record<string, string>;
  customMessage?: string;
  addons?: number;
}

interface SavedBill {
  id: string;
  billNo: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  items: BillLine[];
  subtotal: number;
  discount: number;
  additionalDiscountPct: number;
  additionalDiscount: number;
  gstPercent: number;
  gstAmount: number;
  taxableValue: number;
  finalAmount: number;
  terms: string;
}

// ---------- Per-tenant draft ----------
const draftKey = (slug: string) => `billing_draft::${slug}`;
const billsKey = (slug: string) => `billing_history::${slug}`;

interface Draft {
  lines: BillLine[];
  customerName: string;
  phone: string;
  address: string;
  billNo: string;
  additionalDiscountPct: number;
}

const emptyDraft = (): Draft => ({
  lines: [],
  customerName: '',
  phone: '',
  address: '',
  billNo: `BILL-${Date.now().toString().slice(-6)}`,
  additionalDiscountPct: 0,
});

const readDraft = (slug: string): Draft => {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyDraft();
    return {
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      customerName: String(parsed.customerName || ''),
      phone: String(parsed.phone || ''),
      address: String(parsed.address || ''),
      billNo: String(
        parsed.billNo || `BILL-${Date.now().toString().slice(-6)}`,
      ),
      additionalDiscountPct: Number(parsed.additionalDiscountPct) || 0,
    };
  } catch {
    return emptyDraft();
  }
};

const writeDraft = (slug: string, draft: Draft) => {
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

// ---------- History helpers ----------
const readBills = (slug: string): SavedBill[] => {
  try {
    const raw = localStorage.getItem(billsKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeBills = (slug: string, bills: SavedBill[]) => {
  try {
    localStorage.setItem(billsKey(slug), JSON.stringify(bills));
  } catch {
    /* ignore */
  }
};

const readTerms = (): string => {
  try {
    const saved = localStorage.getItem(TERMS_STORAGE_KEY);
    return saved && saved.trim().length > 0 ? saved : DEFAULT_TERMS;
  } catch {
    return DEFAULT_TERMS;
  }
};

// =========================================================
// Component
// =========================================================
const BillingBody: React.FC = () => {
  const { tenant } = useTenant();
  const { items: menuItems } = useMenu();

  const slug = tenant?.slug ?? '';

  const initial = useMemo(() => readDraft(slug), [slug]);

  const [lines, setLines] = useState<BillLine[]>(initial.lines);
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [additionalDiscountPct, setAdditionalDiscountPct] = useState(
    initial.additionalDiscountPct,
  );
  const [billNo, setBillNo] = useState(initial.billNo);

  const [terms, setTerms] = useState<string>(() => readTerms());
  const [isTermsEditing, setIsTermsEditing] = useState(false);
  const [draftTerms, setDraftTerms] = useState('');
  const [showUnlockTermsConfirm, setShowUnlockTermsConfirm] = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Rehydrate on tenant change.
  useEffect(() => {
    const d = readDraft(slug);
    setLines(d.lines);
    setCustomerName(d.customerName);
    setPhone(d.phone);
    setAddress(d.address);
    setAdditionalDiscountPct(d.additionalDiscountPct);
    setBillNo(d.billNo);
  }, [slug]);

  // Persist draft on every change.
  useEffect(() => {
    if (!slug) return;
    writeDraft(slug, {
      lines,
      customerName,
      phone,
      address,
      billNo,
      additionalDiscountPct,
    });
  }, [
    slug,
    lines,
    customerName,
    phone,
    address,
    billNo,
    additionalDiscountPct,
  ]);

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

  // Sync local bills to Supabase on focus + hourly.
  useEffect(() => {
    if (!slug) return;
    return startStoreBillSync(slug);
  }, [slug]);

  // ---------- Prior customers ----------
  const knownCustomers = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; address: string }
    >();
    readBills(slug).forEach((b) => {
      if (!b.customerName) return;
      const key = `${b.customerName}::${b.phone}`;
      if (!map.has(key)) {
        map.set(key, {
          name: b.customerName,
          phone: b.phone,
          address: b.address,
        });
      }
    });
    return Array.from(map.values());
  }, [slug]);

  const filteredCustomers =
    customerName.trim().length > 0
      ? knownCustomers
          .filter((c) =>
            c.name.toLowerCase().includes(customerName.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  const selectCustomer = (c: {
    name: string;
    phone: string;
    address: string;
  }) => {
    setCustomerName(c.name);
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setShowCustomerSuggestions(false);
  };

  // ---------- Line helpers ----------
  const addRow = () => {
    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        menuId: 0,
        name: '',
        price: 0,
        quantity: 1,
        discountPct: 0,
        amount: 0,
      },
    ]);
  };

  const getAddonTotal = (customizations?: Record<string, string>): number => {
  if (!customizations) return 0;
  let total = 0;
  Object.values(customizations).forEach((v) => {
    const m = String(v).match(/\+Rs(\d+)/);
    if (m) total += parseInt(m[1], 10);
  });
  return total;
};

const updateRow = (id: string, patch: Partial<BillLine>) => {
  setLines((prev) =>
    prev.map((ln) => {
      if (ln.id !== id) return ln;
      const next: BillLine = { ...ln, ...patch };

      if (patch.menuId !== undefined && patch.menuId !== ln.menuId) {
        const menu = menuItems.find((m) => m.id === patch.menuId);
        if (menu) {
          next.name = menu.name;
          next.price = menu.price;

          // Pre-populate defaults from the menu item's schema.
          const defaults: Record<string, string> = {};
          menu.customizationOptions?.forEach((opt) => {
            if (opt.default) {
              const choice = opt.choices.find(
                (c) => c.name === opt.default,
              );
              if (choice) {
                defaults[opt.name] =
                  choice.price > 0
                    ? `${choice.name} +Rs${choice.price}`
                    : choice.name;
              }
            }
          });
          next.customizations = defaults;
        }
      }

      next.addons = getAddonTotal(next.customizations);
      next.quantity = Math.max(1, Math.floor(next.quantity) || 1);
      next.price = Math.max(0, Number(next.price) || 0);
      next.discountPct = Math.min(
        100,
        Math.max(0, Number(next.discountPct) || 0),
      );

      const unit = next.price + (next.addons || 0);
      const base = unit * next.quantity;
      const disc = base * (next.discountPct / 100);
      next.amount = base - disc;

      return next;
    }),
  );
};

const updateCustomization = (
  id: string,
  optName: string,
  value: string,
) => {
  setLines((prev) =>
    prev.map((ln) =>
      ln.id === id
        ? {
            ...ln,
            customizations: { ...(ln.customizations ?? {}), [optName]: value },
          }
        : ln,
    ),
  );
  // Recompute totals for that row.
  setLines((prev) =>
    prev.map((ln) => {
      if (ln.id !== id) return ln;
      const addons = getAddonTotal(ln.customizations);
      const unit = ln.price + addons;
      const base = unit * ln.quantity;
      const disc = base * (ln.discountPct / 100);
      return { ...ln, addons, amount: base - disc };
    }),
  );
};

  const removeRow = (id: string) =>
    setLines((prev) => prev.filter((ln) => ln.id !== id));

  // ---------- Totals ----------
  const GST_PERCENT =
    typeof tenant?.gstPercent === 'number' && tenant.gstPercent > 0
      ? tenant.gstPercent
      : 0;

  const subtotal = lines.reduce(
  (s, ln) => s + (ln.price + (ln.addons || 0)) * ln.quantity,
  0,
);
const lineDiscount = lines.reduce(
  (s, ln) =>
    s +
    (ln.price + (ln.addons || 0)) * ln.quantity * (ln.discountPct / 100),
  0,
);
  const afterLineDiscount = Math.max(0, subtotal - lineDiscount);

  const safePct = Math.min(
    100,
    Math.max(0, Number(additionalDiscountPct) || 0),
  );
  const additionalDiscount = (afterLineDiscount * safePct) / 100;

  const taxableValue = Math.max(0, afterLineDiscount - additionalDiscount);
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
    setDraftTerms('');
    setIsTermsEditing(false);
  };

  const saveTerms = () => {
    setTerms(draftTerms);
    setIsTermsEditing(false);
    setDraftTerms('');
  };

  // ---------- Print ----------
  const handlePrint = () => {
    if (lines.length === 0 || !customerName.trim()) {
      alert('Please add items and a customer name before printing.');
      return;
    }

    for (const ln of lines) {
      if (ln.quantity <= 0) {
        alert(`"${ln.name || 'Item'}": quantity must be at least 1.`);
        return;
      }
    }

    if (isTermsEditing) {
      const ok = window.confirm(
        'You have unsaved edits in Terms & Conditions. Continue without saving?',
      );
      if (!ok) return;
      setIsTermsEditing(false);
      setDraftTerms('');
    }

    const ok = printReceiptNode(printRef.current, {
  title: `${billNo}`,
  pageSize: '80mm auto',
});
    if (!ok) {
      alert('Allow pop-ups to print the bill.');
      return;
    }
    setShowPrintConfirm(true);
  };

  const confirmPrintSuccess = () => {
    setShowPrintConfirm(false);
    if (!tenant) return;

    const bill: SavedBill = {
      id: `bill_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      billNo,
      createdAt: new Date().toISOString(),
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      items: lines,
      subtotal,
      discount: lineDiscount,
      additionalDiscountPct: safePct,
      additionalDiscount,
      gstPercent: GST_PERCENT,
      gstAmount,
      taxableValue,
      finalAmount,
      terms,
    };

    writeBills(tenant.slug, [bill, ...readBills(tenant.slug)]);
    clearDraft(tenant.slug);

    alert('Bill saved to history.');
    setLines([]);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setAdditionalDiscountPct(0);
    setBillNo(`BILL-${Date.now().toString().slice(-6)}`);
  };

  // =========================================================
  // Render
  // =========================================================
  return (
    <>
      <InlineSection
        title="Create Bill"
        actions={
          <Button
            onClick={() => setIsHistoryOpen(true)}
            variant="secondary"
          >
            Bill History
          </Button>
        }
      >
        {/* ---------- Customer details ---------- */}
        <div className={local.patientForm}>
          <FormField label="Customer Name *">
  <Input
    value={customerName}
    onChange={(e) => setCustomerName(e.target.value)}
    placeholder="Customer name"
  />
</FormField>

<FormField label="Phone Number">
  <Input
    value={phone}
    onChange={(e) =>
      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
    }
    placeholder="10-digit phone"
  />
</FormField>

<FormField label="Address">
  <Input
    value={address}
    onChange={(e) => setAddress(e.target.value)}
    placeholder="Delivery address"
  />
</FormField>

          <FormField label="Bill No">
            <Input value={billNo} onChange={(e) => setBillNo(e.target.value)} />
          </FormField>
        </div>

        {/* ---------- Items grid ---------- */}
        <div className={local.xlWrap}>
          <table className={local.xlTable}>
            <colgroup>
              <col className={local.xlColName} />
              <col className={local.xlColPack} />
              <col className={local.xlColQty} />
              <col className={local.xlColMrp} />
              <col className={local.xlColDisc} />
              <col className={local.xlColAmount} />
              <col className={local.xlColDel} />
            </colgroup>
            <thead>
              <tr>
                <th>Item</th>
                <th>Pack</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Disc%</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln) => {
  const menu = menuItems.find((m) => m.id === ln.menuId);
  const opts = menu?.customizationOptions ?? [];

  return (
    <React.Fragment key={ln.id}>
      <tr key={ln.id}>
                  <td>
                    <input
                      list="menu-billing-options"
                      value={ln.name}
                      onChange={(e) => {
                        const match = menuItems.find(
                          (m) => m.name === e.target.value,
                        );
                        updateRow(ln.id, {
                          name: e.target.value,
                          menuId: match ? match.id : 0,
                        });
                      }}
                      placeholder="Type item name..."
                    />
                    <datalist id="menu-billing-options">
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.name} />
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <input
                      value=""
                      onChange={() => {}}
                      placeholder="-"
                      readOnly
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={ln.quantity}
                      onChange={(e) =>
                        updateRow(ln.id, {
                          quantity: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={ln.price}
                      onChange={(e) =>
                        updateRow(ln.id, { price: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={ln.discountPct}
                      onChange={(e) =>
                        updateRow(ln.id, {
                          discountPct: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className={local.xlCellAmount}>
                    <strong>{formatRupees(ln.amount)}</strong>
                  </td>
                  <td className={local.xlCellDel}>
                    <button
                      onClick={() => removeRow(ln.id)}
                      className={local.delBtn}
                    >
                      X
                    </button>
                  </td>
                </tr>

      {opts.length > 0 && (
        <tr>
          <td colSpan={7} className={local.xlCustomCell}>
            <div className={local.customList}>
              {opts.map((opt) => (
                <div key={opt.name} className={local.customGroup}>
                  <span className={local.customGroupLabel}>{opt.name}:</span>
                  <div className={local.customChoices}>
                    {opt.choices.map((c) => {
                      const value =
                        c.price > 0
                          ? `${c.name} +Rs${c.price}`
                          : c.name;
                      const active =
                        ln.customizations?.[opt.name] === value;
                      return (
                        <Chip
                          key={c.name}
                          tone="primary"
                          active={active}
                          onClick={() =>
                            updateCustomization(ln.id, opt.name, value)
                          }
                        >
                          {c.name}
                          {c.price > 0 && (
                            <em className={local.customChoicePrice}>
                              +{formatRupees(c.price)}
                            </em>
                          )}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className={local.customGroup}>
                <span className={local.customGroupLabel}>Note:</span>
                <input
                  type="text"
                  className={local.customNoteInput}
                  value={ln.customMessage || ''}
                  placeholder="Optional special instructions"
                  onChange={(e) =>
                    updateRow(ln.id, { customMessage: e.target.value })
                  }
                />
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
})}
            </tbody>
          </table>
          <div className={local.addRowWrap}>
            <Button variant="ghost" onClick={addRow} leftIcon={<span>+</span>}>
              Add Item Row
            </Button>
          </div>
        </div>

        {/* ---------- Terms + totals ---------- */}
        <div className={local.footerTermTotal}>
          <div className={local.termsEditor}>
            <FormField label="Terms & Conditions (printed on bill)">
              {isTermsEditing ? (
                <Textarea
                  value={draftTerms}
                  onChange={(e) => setDraftTerms(e.target.value)}
                  rows={4}
                  autoFocus
                />
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className={local.termsReadonly}
                  onClick={requestEditTerms}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
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

            {isTermsEditing ? (
              <div className={local.termsActionRow}>
                <span className={local.termsEditingHint}>Editing...</span>
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
              <span>Item discount:</span>
              <span>-{formatRupees(lineDiscount)}</span>
            </div>

            <div
              className={`${local.totalRow} ${local.additionalDiscountRow}`}
            >
              <span>Additional Discount:</span>
              <span className={local.pctInputWrap}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={safePct}
                  onChange={(e) =>
                    setAdditionalDiscountPct(Number(e.target.value) || 0)
                  }
                  className={local.pctInput}
                />
                <span className={local.pctInputSuffix}>%</span>
              </span>
            </div>

            {additionalDiscount > 0 && (
              <div
                className={`${local.totalRow} ${local.additionalDiscountAmountRow}`}
              >
                <span></span>
                <span>-{formatRupees(additionalDiscount)}</span>
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

            <Button
              onClick={handlePrint}
              size="lg"
              className={local.printBtn}
            >
              Print Bill & Save
            </Button>
          </div>
        </div>
      </InlineSection>

      <BillingHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* ---------- Hidden 80mm thermal print ---------- */}
      <div className={local.printHiddenContainer}>
        <div ref={printRef} className={local.billingReceipt}>
          <div className={local.billingHeader}>
            <h2>{tenant?.displayName || 'Store'}</h2>
            {tenant?.storeAddress && (
              <p className={local.billingAddress}>{tenant.storeAddress}</p>
            )}
            {tenant?.storeTagline && (
              <p className={local.billingTagline}>{tenant.storeTagline}</p>
            )}
            {tenant?.gstNo && (
              <p className={local.billingGstin}>GSTIN: {tenant.gstNo}</p>
            )}
            {tenant?.whatsappPhone && (
              <p className={local.billingContact}>
                Ph: {tenant.whatsappPhone}
              </p>
            )}
            <div className={local.billingBillNo}>Bill No.: {billNo}</div>
          </div>

          <div className={local.billingCustomerBlock}>
            <div>
              <strong>Customer:</strong> {customerName}
              {phone ? ` (${phone})` : ''}
            </div>
            {address && (
              <div>
                <strong>Address:</strong> {address}
              </div>
            )}
          </div>

          <div className={local.billingItemsHeader}>
            <span className={local.billingColSn}>#</span>
            <span className={local.billingColName}>Item</span>
            
            <span className={local.billingColQty}>Qty</span>
            <span className={local.billingColPrice}>Price</span>
            <span className={local.billingColTotal}>Total</span>
          </div>

          <div className={local.billingItems}>
            {lines.map((ln, i) => (
              <div key={ln.id} className={local.billingItemLine}>
                <span className={local.billingColSn}>{i + 1}</span>
                <span className={local.billingColName}>{ln.name}
                {ln.customizations && Object.keys(ln.customizations).length > 0 && (
  <div className={local.billingItemCustom}>
    {Object.entries(ln.customizations)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ')}
  </div>
)}
{ln.customMessage && (
  <div className={local.billingItemNote}>Note: {ln.customMessage}</div>
)}</span>
                <span className={local.billingColQty}>{ln.quantity}</span>
                <span className={local.billingColPrice}>
                  {Number(ln.price).toFixed(2)}
                </span>
                <span className={local.billingColTotal}>
                  {Number(ln.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className={local.billingTotals}>
            <div className={local.billingTotalRow}>
              <span>Subtotal</span>
              <span>{formatRupees(subtotal)}</span>
            </div>
            <div className={local.billingTotalRow}>
              <span>Item discount</span>
              <span>-{formatRupees(lineDiscount)}</span>
            </div>
            {safePct > 0 && (
              <div className={local.billingTotalRow}>
                <span>Additional ({safePct}%)</span>
                <span>-{formatRupees(additionalDiscount)}</span>
              </div>
            )}

            {GST_PERCENT > 0 && (
              <>
                <div className={local.billingTotalRow}>
                  <span>Taxable value</span>
                  <span>{formatRupees(taxableValue)}</span>
                </div>
                <div className={local.billingTotalRow}>
                  <span>GST ({GST_PERCENT}%)</span>
                  <span>{formatRupees(gstAmount)}</span>
                </div>
              </>
            )}

            <div
              className={`${local.billingTotalRow} ${local.billingTotalBig}`}
            >
              <span>Total</span>
              <span>{formatRupees(finalAmount)}</span>
            </div>
          </div>

          {terms && (
            <div className={local.billingTerms}>
              <div className={local.billingTermsTitle}>Terms & Conditions</div>
              <div className={local.billingTermsBody}>{terms}</div>
            </div>
          )}

          <div className={local.billingFooter}>
            <div className={local.billingFooterText}>
              Thank you! Visit again.
            </div>
            <div className={local.billingFooterStamp}>
              {new Date().toLocaleString('en-IN', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showPrintConfirm}
        title="Print Successful?"
        message="Did the bill print correctly? Clicking Yes will save it to the local history and clear the form."
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

export default BillingBody;