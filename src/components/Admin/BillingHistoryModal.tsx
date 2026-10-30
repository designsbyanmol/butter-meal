// src/components/Admin/BillingHistoryModal.tsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase.client';
import {
  Modal,
  Button,
  Input,
  EmptyState,
  Badge,
  IconButton,
  Sheet,
  Chip,
  FormField,
  Pagination,
  Card,
  Banner,
} from '../ui';
import { SearchIcon, FilterIcon, CloseIcon, DownloadIcon } from '../../assets/svgs';
import { formatRupees } from '../../utils/subscription';
import { printReceiptNode } from '../../utils/printReceipt';
import {
  filterByRetention,
  pruneLocalStoreBills,
} from '../../utils/historyRetention';
import { HISTORY_RETENTION_MONTHS } from '../../config/retention';
import { downloadStoreHistoryPdf } from '../../utils/storeHistoryPdf';
import { supabaseService } from '../../services/supabase.service';
import local from './Pharmacy.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisYear'
  | 'custom';

const PAGE_SIZE = 12;
const billsKey = (slug: string) => `billing_history::${slug}`;

const normalizeBill = (b: any): any => {
  const num = (v: any): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const fallbackId = [
    'bill',
    String(b.billNo || b.bill_no || ''),
    String(b.createdAt || b.created_at || ''),
    String(b.customerName || b.customer_name || ''),
  ].join('::');
  return {
    ...b,
    id: b.id ? String(b.id) : fallbackId,
    subtotal: num(b.subtotal),
    discount: num(b.discount),
    additionalDiscountPct: num(b.additionalDiscountPct),
    additionalDiscount: num(b.additionalDiscount),
    gstPercent: num(b.gstPercent),
    gstAmount: num(b.gstAmount),
    taxableValue: num(b.taxableValue),
    finalAmount: num(b.finalAmount),
    items: Array.isArray(b.items) ? b.items : [],
  };
};

const readCache = (key: string): any[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Cache the tenant id for the whole page load.
let cachedTenantId: { slug: string; id: string | null } | null = null;
const getTenantId = async (slug: string): Promise<string | null> => {
  if (cachedTenantId?.slug === slug) return cachedTenantId.id;
  if (!supabase) return null;
  const { data } = await supabase
    .from('star_veg_tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  const id = data?.id ?? null;
  cachedTenantId = { slug, id };
  return id;
};

/**
 * Load bills from localStorage AND Supabase. Local wins on conflict.
 * Remote rows are mapped to the local (camelCase) shape so the rest
 * of the component doesn't care about the source.
 */
const loadAllStoreBills = async (slug: string): Promise<any[]> => {
  pruneLocalStoreBills(slug);

  void supabaseService
    .pruneOldHistoryOnServer(HISTORY_RETENTION_MONTHS)
    .catch(() => {});

  const localBills = readCache(billsKey(slug));

  let remoteBills: any[] = [];
  if (supabase) {
    try {
      const tenantId = await getTenantId(slug);
      if (tenantId) {
        const { data } = await supabase
          .from('star_veg_store_bills')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });
        remoteBills = data || [];
      }
    } catch (err) {
      console.warn('[store-history] supabase fetch failed:', err);
    }
  }

  const remoteAsLocal = remoteBills.map((r) => ({
    id: r.id,
    billNo: r.bill_no,
    customerName: r.customer_name,
    phone: r.phone,
    address: r.address,
    items: r.items || [],
    subtotal: Number(r.subtotal) || 0,
    discount: Number(r.discount) || 0,
    additionalDiscountPct: Number(r.additional_discount_pct) || 0,
    additionalDiscount: Number(r.additional_discount) || 0,
    gstPercent: Number(r.gst_percent) || 0,
    gstAmount: Number(r.gst_amount) || 0,
    taxableValue: Number(r.taxable_value) || 0,
    finalAmount: Number(r.final_amount) || 0,
    terms: r.terms || '',
    createdAt: r.created_at,
  }));

  const keyOf = (b: any): string => {
    const billNo = String(b.billNo || b.bill_no || '').trim();
    const id = String(b.id || '').trim();
    const createdAt = String(b.createdAt || b.created_at || '');
    const base = billNo || id || 'bill';
    return `${base}::${createdAt}`;
  };

  const byKey = new Map<string, any>();
  remoteAsLocal.forEach((b) => byKey.set(keyOf(b), b));
  localBills.forEach((b) => byKey.set(keyOf(b), b));

  return filterByRetention(Array.from(byKey.values()), 'createdAt');
};

const DATE_OPTIONS: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const computeRange = (preset: DatePreset, from: string, to: string) => {
  const now = new Date();
  switch (preset) {
    case 'all':
      return { from: null, to: null };
    case 'today':
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return {
        from: startOfDay(y).toISOString(),
        to: endOfDay(y).toISOString(),
      };
    }
    case 'thisWeek': {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      return {
        from: startOfDay(start).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: startOfDay(start).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        from: startOfDay(start).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    }
    case 'custom': {
      return {
        from: from ? new Date(`${from}T00:00:00`).toISOString() : null,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : null,
      };
    }
    default:
      return { from: null, to: null };
  }
};

interface FilterState {
  patient: string;
  phone: string;
  datePreset: DatePreset;
  customFrom: string;
  customTo: string;
}

const EMPTY_FILTERS: FilterState = {
  patient: '',
  phone: '',
  datePreset: 'all',
  customFrom: '',
  customTo: '',
};

const BillingHistoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { tenant } = useTenant();

  const [bills, setBills] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !tenant) return;
    let cancelled = false;
    loadAllStoreBills(tenant.slug).then((list) => {
      if (cancelled) return;
      setBills(list.map(normalizeBill));
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, tenant?.slug]);

  const suggestions = useMemo(() => {
    const patients = new Set<string>();
    const phones = new Set<string>();
    bills.forEach((b) => {
      if (b.customerName) patients.add(b.customerName);
      if (b.phone) phones.add(b.phone);
    });
    return {
      patients: Array.from(patients).sort(),
      phones: Array.from(phones).sort(),
    };
  }, [bills]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const todayEnd = endOfDay(now).getTime();
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayStart = startOfDay(y).getTime();
    const yesterdayEnd = endOfDay(y).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let todayTotal = 0;
    let yesterdayTotal = 0;
    let monthTotal = 0;

    bills.forEach((b) => {
      const time = new Date(b.createdAt).getTime();
      const amt = Number(b.finalAmount) || 0;
      if (time >= todayStart && time <= todayEnd) todayTotal += amt;
      if (time >= yesterdayStart && time <= yesterdayEnd) yesterdayTotal += amt;
      if (time >= monthStart && time <= todayEnd) monthTotal += amt;
    });

    return { todayTotal, yesterdayTotal, monthTotal };
  }, [bills]);

  const filteredBills = useMemo(() => {
    let result = bills;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          String(b.billNo || '').toLowerCase().includes(q) ||
          String(b.customerName || '').toLowerCase().includes(q) ||
          String(b.phone || '').toLowerCase().includes(q),
      );
    }

    if (filters.patient.trim()) {
      result = result.filter((b) =>
        String(b.customerName || '')
          .toLowerCase()
          .includes(filters.patient.toLowerCase()),
      );
    }
    if (filters.phone.trim()) {
      result = result.filter((b) =>
        String(b.phone || '').includes(filters.phone),
      );
    }

    const { from, to } = computeRange(
      filters.datePreset,
      filters.customFrom,
      filters.customTo,
    );
    if (from || to) {
      result = result.filter((b) => {
        const time = new Date(b.createdAt).getTime();
        if (from && time < new Date(from).getTime()) return false;
        if (to && time > new Date(to).getTime()) return false;
        return true;
      });
    }

    return [...result].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [bills, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE));
  const paginated = filteredBills.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const activeFilters = useMemo(() => {
    let n = 0;
    if (filters.patient.trim()) n++;
    if (filters.phone.trim()) n++;
    if (filters.datePreset !== 'all') n++;
    return n;
  }, [filters]);

  const openFilterSheet = () => {
    setDraftFilters(filters);
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFilterOpen(false);
  };

  const resetFilters = () => setDraftFilters(EMPTY_FILTERS);

  const openDetails = (bill: any) => {
    setSelectedBill(bill);
    setIsDetailsOpen(true);
  };

const handlePrintHistoryBill = () => {
  if (!printRef.current) return;
  printReceiptNode(printRef.current, {
    title: `bill-${selectedBill?.billNo ?? 'history'}`,
    pageSize: '80mm auto',
  });
};

const handleExportAll = () => {
  if (!tenant || filteredBills.length === 0) return;
  downloadStoreHistoryPdf({
    rows: filteredBills as any,
    storeName: tenant.displayName,
    fromIso: filteredBills.length > 0
      ? filteredBills[filteredBills.length - 1].createdAt
      : null,
    toIso: filteredBills.length > 0
      ? filteredBills[0].createdAt
      : null,
  });
};

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Bill History"
        size="xl"
        mobileFullScreen
        footer={
          <>
          <Button variant="ghost" onClick={onClose} block>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleExportAll}
            disabled={filteredBills.length === 0}
            leftIcon={<DownloadIcon width={14} height={14} fill="currentColor" />}
          >
            Export All
          </Button>
          </>
        }
      >
        <Banner
            variant="warning"
            inline
          >
            Please export regularly for not loosing data.
          </Banner>
        <div className={local.statsGrid}>
          <Card padding="sm" className={local.statCardToday}>
            <span className={local.statLabelToday}>Today's Sale</span>
            <div className={local.statValueToday}>
              {formatRupees(stats.todayTotal)}
            </div>
          </Card>
          <Card padding="sm" className={local.statCardYesterday}>
            <span className={local.statLabelYesterday}>Yesterday</span>
            <div className={local.statValueYesterday}>
              {formatRupees(stats.yesterdayTotal)}
            </div>
          </Card>
          <Card padding="sm" className={local.statCardMonth}>
            <span className={local.statLabelMonth}>This Month</span>
            <div className={local.statValueMonth}>
              {formatRupees(stats.monthTotal)}
            </div>
          </Card>
        </div>

        <div className={local.searchBarRow}>
          <div className={local.searchBarInputWrap}>
            <Input
              placeholder="Search by bill no, customer, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon width={16} height={16} fill="#b3b3b3" />}
              rightIcon={
                search ? (
                  <IconButton
                    variant="ghost"
                    size="xs"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                  >
                    <CloseIcon width={14} height={14} fill="#4d4d4d" />
                  </IconButton>
                ) : undefined
              }
            />
          </div>

          <Button
            variant={activeFilters > 0 ? 'primary' : 'ghost'}
            onClick={openFilterSheet}
            leftIcon={<FilterIcon width={14} height={14} fill="currentColor" />}
            rightIcon={
              activeFilters > 0 ? (
                <span className={local.filterCount}>{activeFilters}</span>
              ) : undefined
            }
          >
            Filters
          </Button>
        </div>

        {filteredBills.length === 0 ? (
          <EmptyState
            title="No bills found"
            description={
              search || activeFilters > 0
                ? 'Try adjusting your filters or search query.'
                : 'Bills printed from this device will appear here.'
            }
            action={
              (search || activeFilters > 0) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch('');
                    setFilters(EMPTY_FILTERS);
                  }}
                >
                  Clear all filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className={local.tableWrap}>
              <table className={local.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bill No</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((b, index) => (
                    <tr key={`${b.id || b.billNo || 'bill'}::${index}`}>
                      <td>
                        {new Date(b.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <strong>{b.billNo}</strong>
                      </td>
                      <td>
                        {b.customerName}
                        {b.phone && (
                          <>
                            <br />
                            <small className={local.mutedSmall}>{b.phone}</small>
                          </>
                        )}
                      </td>
                      <td>
                        <Badge tone="neutral" size="sm">
                          {b.items?.length || 0} items
                        </Badge>
                      </td>
                      <td className={local.amountCell}>
                        {formatRupees(b.finalAmount)}
                      </td>
                      <td>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => openDetails(b)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredBills.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </Modal>

      <Sheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Bill History"
        mobileFullScreen
        maxHeightVh={86}
        footer={
          <>
            <Button variant="ghost" onClick={resetFilters} block>
              Reset
            </Button>
            <Button onClick={applyFilters} block>
              Apply
            </Button>
          </>
        }
      >
        <section className={local.filterSection}>
          <h4 className={local.filterSectionHeading}>Patient Details</h4>
          <div className={local.filterFieldStack}>
            <FormField label="Customer Name">
              <Input
                value={draftFilters.patient}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, patient: e.target.value })
                }
                placeholder="Search customer name..."
                list="bh-suggest-patients"
              />
              <datalist id="bh-suggest-patients">
                {suggestions.patients.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Phone Number">
              <Input
                value={draftFilters.phone}
                onChange={(e) =>
                  setDraftFilters({ ...draftFilters, phone: e.target.value })
                }
                placeholder="Search phone..."
                list="bh-suggest-phones"
              />
              <datalist id="bh-suggest-phones">
                {suggestions.phones.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </FormField>
          </div>
        </section>

        <section className={local.filterSection}>
          <h4 className={local.filterSectionHeading}>Date Range</h4>
          <div className={local.chipRow}>
            {DATE_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                tone="primary"
                active={draftFilters.datePreset === o.key}
                onClick={() =>
                  setDraftFilters({ ...draftFilters, datePreset: o.key })
                }
              >
                {o.label}
              </Chip>
            ))}
          </div>

          {draftFilters.datePreset === 'custom' && (
            <div className={local.dateRangeGrid}>
              <FormField label="From">
                <Input
                  type="date"
                  value={draftFilters.customFrom}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      customFrom: e.target.value,
                    })
                  }
                />
              </FormField>
              <FormField label="To">
                <Input
                  type="date"
                  value={draftFilters.customTo}
                  onChange={(e) =>
                    setDraftFilters({
                      ...draftFilters,
                      customTo: e.target.value,
                    })
                  }
                />
              </FormField>
            </div>
          )}
        </section>
      </Sheet>

      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={`Bill Details - ${selectedBill?.billNo}`}
        size="lg"
        mobileFullScreen
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            <Button onClick={handlePrintHistoryBill}>Print Bill</Button>
          </>
        }
      >
        {selectedBill && (
          <div>
            <div className={local.billHeader}>
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Customer</span>
                <span className={local.billHeaderValue}>
                  {selectedBill.customerName || '—'}
                  {selectedBill.phone && (
                    <span className={local.billHeaderSub}>
                      {selectedBill.phone}
                    </span>
                  )}
                  {selectedBill.address || '—'}
                </span>
              </div>
              <div className={local.billHeaderItem}>
                <span className={local.billHeaderLabel}>Date</span>
                <span className={local.billHeaderValue}>
                  {new Date(selectedBill.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div className={local.tableWrap}>
              <table className={local.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Disc%</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBill.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td>
  {it.name}
  {it.customizations && Object.keys(it.customizations).length > 0 && (
    <div className={local.historyCustomLine}>
      {Object.entries(it.customizations)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')}
    </div>
  )}
  {it.customMessage && (
    <div className={local.historyNoteLine}>Note: {it.customMessage}</div>
  )}
</td>
                      <td>{it.quantity}</td>
                      <td>{formatRupees(it.price)}</td>
                      <td>{it.discountPct}%</td>
                      <td>{formatRupees(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`${local.totals} ${local.detailsTotals}`}>
              <div className={local.totalRow}>
                <span>Subtotal:</span>
                <span>{formatRupees(selectedBill.subtotal)}</span>
              </div>
              <div className={local.totalRow}>
                <span>Item discount:</span>
                <span>-{formatRupees(selectedBill.discount)}</span>
              </div>
              {Number(selectedBill.additionalDiscount) > 0 && (
                <div className={local.totalRow}>
                  <span>
                    Additional discount
                    {Number(selectedBill.additionalDiscountPct) > 0
                      ? ` (${Number(selectedBill.additionalDiscountPct)}%)`
                      : ''}
                    :
                  </span>
                  <span>
                    -{formatRupees(selectedBill.additionalDiscount)}
                  </span>
                </div>
              )}
              {Number(selectedBill.gstAmount) > 0 && (
                <div className={local.totalRow}>
                  <span>GST ({Number(selectedBill.gstPercent)}%):</span>
                  <span>{formatRupees(selectedBill.gstAmount)}</span>
                </div>
              )}
              <div className={`${local.totalRow} ${local.grandTotal}`}>
                <span>Final Amount:</span>
                <span>{formatRupees(selectedBill.finalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden 80mm receipt for printing from history */}
      <div className={local.printHiddenContainer}>
        {selectedBill && (
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
              <div className={local.billingBillNo}>
                Bill No.: {selectedBill.billNo}
              </div>
            </div>

            <div className={local.billingCustomerBlock}>
              <div>
                <strong>Customer:</strong> {selectedBill.customerName}
                {selectedBill.phone ? ` (${selectedBill.phone})` : ''}
              </div>
              {selectedBill.address && (
                <div>
                  <strong>Address:</strong> {selectedBill.address}
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
              {selectedBill.items?.map((ln: any, i: number) => (
                <div key={i} className={local.billingItemLine}>
                  <span className={local.billingColSn}>{i + 1}</span>
                   <span className={local.billingColName}>
  {ln.name}
  {ln.customizations && Object.keys(ln.customizations).length > 0 && (
    <span className={local.billingItemCustom}>
      {' '}
      ·{' '}
      {Object.entries(ln.customizations)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}
    </span>
  )}
</span>
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
                <span>{formatRupees(selectedBill.subtotal)}</span>
              </div>
              <div className={local.billingTotalRow}>
                <span>Item discount</span>
                <span>-{formatRupees(selectedBill.discount)}</span>
              </div>
              {Number(selectedBill.additionalDiscount) > 0 && (
                <div className={local.billingTotalRow}>
                  <span>
                    Additional ({Number(selectedBill.additionalDiscountPct)}%)
                  </span>
                  <span>
                    -{formatRupees(selectedBill.additionalDiscount)}
                  </span>
                </div>
              )}
              {Number(selectedBill.gstAmount) > 0 && (
                <>
                  <div className={local.billingTotalRow}>
                    <span>Taxable value</span>
                    <span>{formatRupees(selectedBill.taxableValue || 0)}</span>
                  </div>
                  <div className={local.billingTotalRow}>
                    <span>GST ({Number(selectedBill.gstPercent)}%)</span>
                    <span>{formatRupees(selectedBill.gstAmount)}</span>
                  </div>
                </>
              )}
              <div
                className={`${local.billingTotalRow} ${local.billingTotalBig}`}
              >
                <span>Total</span>
                <span>{formatRupees(selectedBill.finalAmount)}</span>
              </div>
            </div>

            {selectedBill.terms && (
              <div className={local.billingTerms}>
                <div className={local.billingTermsTitle}>
                  Terms & Conditions
                </div>
                <div className={local.billingTermsBody}>
                  {selectedBill.terms}
                </div>
              </div>
            )}

            <div className={local.billingFooter}>
              <div className={local.billingFooterText}>
                Thank you! Visit again.
              </div>
              <div className={local.billingFooterStamp}>
                {new Date(selectedBill.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BillingHistoryModal;