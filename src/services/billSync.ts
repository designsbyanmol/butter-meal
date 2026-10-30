// src/services/billSync.ts
import { supabase } from "./supabase.client";

const billsKey = (slug: string) => `billing_history::${slug}`;
const syncedIdsKey = (slug: string, kind: BillKind) =>
  `billing_synced_ids::${kind}::${slug}`;
const lastSyncKey = (slug: string, kind: BillKind) =>
  `billing_last_sync::${kind}::${slug}`;

const SYNC_INTERVAL_MS = 60 * 60 * 1000;

export type BillKind = "pharmacy" | "store";

const TABLE_FOR: Record<BillKind, string> = {
  pharmacy: "star_veg_pharmacy_bills",
  store: "star_veg_store_bills",
};

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
};

const toPharmacyRow = (bill: any, tenantId: string) => ({
  id: String(bill.id),
  tenant_id: tenantId,
  bill_no: bill.bill_no || bill.billNo || "",
  patient_name: bill.patient_name || bill.customerName || "",
  phone: bill.phone || "",
  address: bill.address || "",
  doctor_name: bill.doctor_name || "",
  items: bill.items || [],
  subtotal: Number(bill.subtotal) || 0,
  discount: Number(bill.discount) || 0,
  additional_discount_pct: Number(bill.additional_discount_pct) || 0,
  additional_discount: Number(bill.additional_discount) || 0,
  gst_percent: Number(bill.gst_percent) || 0,
  gst_amount: Number(bill.gst_amount) || 0,
  taxable_value: Number(bill.taxable_value) || 0,
  final_amount: Number(bill.final_amount) || 0,
  terms: bill.terms || "",
  created_at: bill.created_at || new Date().toISOString(),
});

const toStoreRow = (bill: any, tenantId: string) => ({
  id: String(bill.id),
  tenant_id: tenantId,
  bill_no: bill.billNo || bill.bill_no || "",
  customer_name: bill.customerName || bill.patient_name || "",
  phone: bill.phone || "",
  address: bill.address || "",
  items: bill.items || [],
  subtotal: Number(bill.subtotal) || 0,
  discount: Number(bill.discount) || 0,
  additional_discount_pct: Number(bill.additionalDiscountPct) || 0,
  additional_discount: Number(bill.additionalDiscount) || 0,
  gst_percent: Number(bill.gstPercent) || 0,
  gst_amount: Number(bill.gstAmount) || 0,
  taxable_value: Number(bill.taxableValue) || 0,
  final_amount: Number(bill.finalAmount) || 0,
  terms: bill.terms || "",
  created_at: bill.createdAt || new Date().toISOString(),
});

const syncPendingBills = async (
  slug: string,
  kind: BillKind,
): Promise<{ uploaded: number; total: number }> => {
  if (!supabase) return { uploaded: 0, total: 0 };

  const bills = readJson<any[]>(billsKey(slug), []);
  if (bills.length === 0) return { uploaded: 0, total: 0 };

  const syncedIds = new Set<string>(
    readJson<string[]>(syncedIdsKey(slug, kind), []),
  );

  const pending = bills.filter((b) => b.id && !syncedIds.has(String(b.id)));
  if (pending.length === 0) {
    writeJson(lastSyncKey(slug, kind), Date.now());
    return { uploaded: 0, total: bills.length };
  }

  let tenantId: string | null = null;
  try {
    const { data } = await supabase
      .from("star_veg_tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    tenantId = data?.id ?? null;
  } catch (err) {
    console.warn("[bill-sync] tenant lookup failed:", err);
    return { uploaded: 0, total: bills.length };
  }
  if (!tenantId) return { uploaded: 0, total: bills.length };

const table = TABLE_FOR[kind];
const mapper = kind === "pharmacy" ? toPharmacyRow : toStoreRow;

let uploaded = 0;

for (const bill of pending) {
  try {
    // The two row shapes differ (patient_name vs customer_name, etc.)
    // so the union breaks TypeScript's excess-property check. The
    // runtime payload is correct for whichever table it targets, so
    // we widen to `any` here.
    const payload: any = mapper(bill, tenantId);
    const { error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: "id" });

      if (error) {
        console.warn(
          `[bill-sync] ${kind} upsert failed for ${bill.id}:`,
          error.message,
        );
        continue;
      }

      syncedIds.add(String(bill.id));
      uploaded += 1;
    } catch (err) {
      console.warn(`[bill-sync] ${kind} threw for ${bill.id}:`, err);
    }
  }

  writeJson(syncedIdsKey(slug, kind), Array.from(syncedIds));
  writeJson(lastSyncKey(slug, kind), Date.now());

  return { uploaded, total: bills.length };
};

export const syncPendingPharmacyBills = (slug: string) =>
  syncPendingBills(slug, "pharmacy");

export const syncPendingStoreBills = (slug: string) =>
  syncPendingBills(slug, "store");

const startBillSync = (slug: string, kind: BillKind): (() => void) => {
  if (!slug) return () => {};

  let cancelled = false;
  let timer: number | null = null;
  let inFlight = false;

  const runSync = async (force = false) => {
    if (cancelled || inFlight) return;
    if (typeof document !== "undefined" && document.hidden) return;

    const lastSync =
      Number(localStorage.getItem(lastSyncKey(slug, kind))) || 0;
    const elapsed = Date.now() - lastSync;

    if (!force && elapsed < SYNC_INTERVAL_MS) return;

    inFlight = true;
    try {
      const result = await syncPendingBills(slug, kind);
      if (result.uploaded > 0) {
        console.info(
          `[bill-sync] ${kind} uploaded ${result.uploaded}/${result.total}`,
        );
      }
    } finally {
      inFlight = false;
    }
  };

  const schedule = () => {
    if (cancelled) return;
    timer = window.setInterval(() => {
      void runSync();
    }, SYNC_INTERVAL_MS);
  };

  void runSync();
  schedule();

  const onVisible = () => {
    if (document.hidden) return;
    void runSync();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);

  return () => {
    cancelled = true;
    if (timer !== null) window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
  };
};

export const startPharmacyBillSync = (slug: string) =>
  startBillSync(slug, "pharmacy");

export const startStoreBillSync = (slug: string) =>
  startBillSync(slug, "store");