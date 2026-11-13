// src/components/Admin/BillSettleModal.tsx
import React, { useMemo, useState } from 'react';
import { Modal, Button, Input, FormField, Banner } from '../ui';
import { formatRupees } from '../../utils/subscription';
import type { BillSettlement } from '../../types';
import local from "./Pharmacy.module.scss";

interface SettleLine {
  index: number;
  name: string;
  originalQty: number;
  returnQty: number;
  price: number;
  addons: number;
  discountPct: number;
}

interface BillSettleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any | null;              // shape from normalizeBill in BillingHistoryModal
  onSettle: (settlement: BillSettlement, newBill: any) => Promise<void> | void;
}

const round2 = (n: number): number =>
  Math.round((Number(n) || 0) * 100) / 100;

/**
 * Compute, per bill line, the amount the customer was actually charged
 * per unit — after the line's own discount, after the bill's additional
 * discount (distributed pro-rata by line value), and after GST.
 *
 * The same formula is used for the refund on a partial return and for
 * the new per-line `amount` on the settled bill. Keeping them in one
 * place guarantees `newFinalAmount + refund === originalFinalAmount`
 * to the paisa (modulo rounding, which we correct below).
 */
const computeChargedPerUnit = (bill: any, line: any): number => {
  const qty = Math.max(1, Number(line.quantity) || 0);
  const unit = (Number(line.price) || 0) + (Number(line.addons) || 0);
  const lineGross = unit * qty;
  const lineDiscountPct = Math.min(
    100,
    Math.max(0, Number(line.discountPct) || 0),
  );
  const lineAfterLineDisc = lineGross * (1 - lineDiscountPct / 100);

  // Distribute the bill's additional discount pro-rata by line value
  // AFTER line discount (that's what the taxable base was computed from
  // at bill time).
  const subtotalAfterLineDisc = (bill.items || []).reduce(
    (s: number, it: any) => {
      const u = (Number(it.price) || 0) + (Number(it.addons) || 0);
      const d = Math.min(100, Math.max(0, Number(it.discountPct) || 0));
      return s + u * (Number(it.quantity) || 0) * (1 - d / 100);
    },
    0,
  );
  const additionalPct = Math.min(
    100,
    Math.max(0, Number(bill.additionalDiscountPct) || 0),
  );
  const additionalShare =
    subtotalAfterLineDisc > 0
      ? lineAfterLineDisc * (additionalPct / 100)
      : 0;
  const lineAfterAdditional = lineAfterLineDisc - additionalShare;

  const gstPct = Math.max(0, Number(bill.gstPercent) || 0);
  const lineGst = lineAfterAdditional * (gstPct / 100);
  const charged = lineAfterAdditional + lineGst;

  return round2(charged / qty);
};

const BillSettleModal: React.FC<BillSettleModalProps> = ({
  isOpen,
  onClose,
  bill,
  onSettle,
}) => {
  const [draft, setDraft] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const lines: SettleLine[] = useMemo(() => {
    if (!bill) return [];
    return (bill.items || []).map((it: any, i: number) => ({
      index: i,
      name: it.name || `Item ${i + 1}`,
      originalQty: Number(it.quantity) || 0,
      returnQty: draft[i] ?? 0,
      price: Number(it.price) || 0,
      addons: Number(it.addons) || 0,
      discountPct: Number(it.discountPct) || 0,
    }));
  }, [bill, draft]);

  const chargedPerUnit: number[] = useMemo(
    () => (bill ? (bill.items || []).map((it: any) => computeChargedPerUnit(bill, it)) : []),
    [bill],
  );

  const refundLines = useMemo(
    () =>
      lines
        .filter((l) => l.returnQty > 0)
        .map((l) => ({
          name: l.name,
          returnedQty: l.returnQty,
          refund: round2(chargedPerUnit[l.index] * l.returnQty),
        })),
    [lines, chargedPerUnit],
  );

  const refundTotal = useMemo(
    () => round2(refundLines.reduce((s, l) => s + l.refund, 0)),
    [refundLines],
  );

  const totalOriginal = useMemo(
    () => round2(bill?.finalAmount || 0),
    [bill],
  );

  const anySelected = lines.some((l) => l.returnQty > 0);

  const setQty = (idx: number, raw: number) => {
    const line = lines[idx];
    if (!line) return;
    const n = Math.max(0, Math.min(line.originalQty, Math.floor(raw) || 0));
    setDraft((prev) => {
      const next = { ...prev };
      if (n === 0) delete next[idx];
      else next[idx] = n;
      return next;
    });
  };

  const handleSettle = async () => {
    if (!bill || !anySelected || isSaving) return;

    setIsSaving(true);
    setError('');

    try {
      // Build the settled bill: reduce quantities, recompute per-line
      // amounts, keep the bill-level discount / GST percentages.
      const settledItems = (bill.items || []).map((it: any, i: number) => {
        const returned = draft[i] ?? 0;
        const nextQty = Math.max(0, (Number(it.quantity) || 0) - returned);
        const unit = (Number(it.price) || 0) + (Number(it.addons) || 0);
        const d = Math.min(100, Math.max(0, Number(it.discountPct) || 0));
        const nextAmount = round2(unit * nextQty * (1 - d / 100));
        return { ...it, quantity: nextQty, amount: nextAmount };
      });

      // Recompute bill totals from the settled items.
      const subtotal = round2(
        settledItems.reduce((s: number, it: any) => {
          const u = (Number(it.price) || 0) + (Number(it.addons) || 0);
          return s + u * (Number(it.quantity) || 0);
        }, 0),
      );
      const lineDiscount = round2(
        settledItems.reduce((s: number, it: any) => {
          const u = (Number(it.price) || 0) + (Number(it.addons) || 0);
          const d = Math.min(100, Math.max(0, Number(it.discountPct) || 0));
          return (
            s +
            u * (Number(it.quantity) || 0) * (d / 100)
          );
        }, 0),
      );
      const afterLineDiscount = round2(subtotal - lineDiscount);
      const additionalPct = Math.min(
        100,
        Math.max(0, Number(bill.additionalDiscountPct) || 0),
      );
      const additionalDiscount = round2(
        afterLineDiscount * (additionalPct / 100),
      );
      const taxableValue = round2(afterLineDiscount - additionalDiscount);
      const gstPct = Math.max(0, Number(bill.gstPercent) || 0);
      const gstAmount = round2(taxableValue * (gstPct / 100));
      const finalAmount = round2(taxableValue + gstAmount);

      // Correct any rounding drift so the identity holds to the paisa:
      //   originalFinalAmount - refundTotal === newFinalAmount
      const drift = round2(totalOriginal - refundTotal - finalAmount);
      if (Math.abs(drift) > 0 && Math.abs(drift) < 1) {
        // Nudge the last settled line's amount by the residual.
        const last = settledItems[settledItems.length - 1];
        if (last) {
          last.amount = round2(Number(last.amount) + drift);
        }
      }

      const settlement: BillSettlement = {
        id: `stl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        refundTotal,
        reason: reason.trim() || undefined,
        lines: refundLines,
      };

      const newBill = {
        ...bill,
        items: settledItems,
        subtotal,
        discount: lineDiscount,
        additionalDiscount,
        taxableValue,
        gstAmount,
        finalAmount,
        settlements: [...(bill.settlements || []), settlement],
      };

      await onSettle(settlement, newBill);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settlement failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (isSaving) return;
        setDraft({});
        setReason('');
        setError('');
        onClose();
      }}
      title={`Settle bill ${bill?.billNo ?? ''}`}
      size="lg"
      mobileFullScreen
      disableBackdropClose
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSettle}
            loading={isSaving}
            disabled={!anySelected || refundTotal <= 0}
          >
            Settle & Refund {formatRupees(refundTotal)}
          </Button>
        </>
      }
    >
      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}

      <Banner variant="info" inline>
        Enter the quantity being <strong>returned</strong> for each line. The
        bill's line discount, additional discount, and GST are distributed
        pro-rata so the refund matches what the customer was actually charged.
      </Banner>

      <div className={local.settleWrap}>
        <div className={local.settleHeader}>
          <span>Item</span>
          <span>Qty</span>
          <span>Return</span>
          <span>Charged/unit</span>
          <span>Refund</span>
        </div>

        {lines.map((l) => (
          <div key={l.index} className={local.settleRow}>
            <span className={local.settleName}>{l.name}</span>
            <span>{l.originalQty}</span>
            <FormField label="">
              <Input
                type="number"
                min={0}
                max={l.originalQty}
                value={String(l.returnQty)}
                onChange={(e) => setQty(l.index, Number(e.target.value) || 0)}
                disabled={isSaving}
              />
            </FormField>
            <span className={local.settleMoney}>
              {formatRupees(chargedPerUnit[l.index])}
            </span>
            <span className={local.settleMoney}>
              {formatRupees(chargedPerUnit[l.index] * l.returnQty)}
            </span>
          </div>
        ))}
      </div>

      <FormField label="Reason (optional)">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Customer returned 4 units"
          disabled={isSaving}
        />
      </FormField>

      <div className={local.settleTotals}>
        <div>
          <span>Original total</span>
          <span>{formatRupees(totalOriginal)}</span>
        </div>
        <div>
          <span>Refund</span>
          <span>{formatRupees(refundTotal)}</span>
        </div>
        <div className={local.settleGrand}>
          <span>New total</span>
          <span>{formatRupees(totalOriginal - refundTotal)}</span>
        </div>
      </div>
    </Modal>
  );
};

export default BillSettleModal;