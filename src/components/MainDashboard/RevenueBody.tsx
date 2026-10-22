// components/MainDashboard/RevenueBody.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { InlineSection } from '../Dashboard/inline';
import { supabaseService } from '../../services/supabase.service';
import {
  Card,
  Badge,
  EmptyState,
  Banner,
  Input,
  IconButton,
  Button,
  Pagination,
  DropdownMenu,
  DropdownItem,
  Sheet,
  Chip,
  FormField,
} from '../ui';
import {
  SearchIcon,
  FilterIcon,
  KebabIcon,
  CloseIcon,
} from '../../assets/svgs';
import { formatRupees } from '../../utils/subscription';
import { useDebounce } from '../../hooks/useDebounce';
import {
  downloadRevenueInvoicesPdf,
  RevenueInvoicePdfRow,
} from '../../utils/revenueInvoicesPdf';
import local from './RevenueBody.module.scss';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | 'paid' | 'pending' | 'cancelled';

type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisYear'
  | 'custom';

/** Subset of presets offered inside the Export PDF sheet. */
type ExportRange = 'today' | 'yesterday' | 'thisMonth' | 'thisYear' | 'custom';

const EXPORT_RANGES: { key: ExportRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'thisYear', label: 'This year' },
  { key: 'custom', label: 'Custom range' },
];

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This week' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'thisYear', label: 'This year' },
  { key: 'custom', label: 'Custom range' },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'cancelled', label: 'Cancelled' },
];

interface InvoiceRow {
  id: string;
  tenant_slug: string;
  tenant_name: string;
  final_amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  plan_id: string;
  months: number;
  created_at: string;
}

interface Stats {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueThisYear: number;
  totalInvoices: number;
  pendingInvoices: number;
  pendingAmount: number;
  paidInvoices: number;
  averageInvoice: number;
}

// =========================================================
// Date helpers
// =========================================================
const startOfDayIso = (d: Date): string => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
};

const endOfDayIso = (d: Date): string => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
};

const computePresetRange = (
  preset: DatePreset,
  fromDate: string,
  toDate: string,
): { from?: string; to?: string } => {
  const now = new Date();

  switch (preset) {
    case 'all':
      return {};
    case 'today':
      return { from: startOfDayIso(now), to: endOfDayIso(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDayIso(y), to: endOfDayIso(y) };
    }
    case 'thisWeek': {
      const start = new Date(now);
      const day = start.getDay();
      const offset = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - offset);
      return { from: startOfDayIso(start), to: endOfDayIso(now) };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDayIso(start), to: endOfDayIso(now) };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: startOfDayIso(start), to: endOfDayIso(now) };
    }
    case 'custom': {
      return {
        from: fromDate
          ? new Date(`${fromDate}T00:00:00`).toISOString()
          : undefined,
        to: toDate
          ? new Date(`${toDate}T23:59:59.999`).toISOString()
          : undefined,
      };
    }
    default:
      return {};
  }
};

/** Turn a preset into a friendly label for the PDF header. */
const rangeLabelFor = (
  preset: ExportRange,
  fromDate: string,
  toDate: string,
): string => {
  const labels: Record<ExportRange, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    thisMonth: 'This month',
    thisYear: 'This year',
    custom: 'Custom range',
  };
  if (preset !== 'custom') return labels[preset];

  const fmt = (s: string): string => {
    if (!s) return '?';
    const d = new Date(`${s}T00:00:00`);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  return `${fmt(fromDate)} → ${fmt(toDate)}`;
};

// =========================================================
// Component
// =========================================================
const RevenueBody: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // ---- Search / filter state ----
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ---- Pagination ----
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isListLoading, setIsListLoading] = useState(false);

  // ---- Export PDF state ----
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const [exportRange, setExportRange] = useState<ExportRange>('thisMonth');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [expiryBySlug, setExpiryBySlug] = useState<Record<string, string>>({});

  // ---- Filter sheet state ----
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // ---- Resolved date range for the current preset ----
  const { from: fromIso, to: toIso } = useMemo(
    () => computePresetRange(datePreset, fromDate, toDate),
    [datePreset, fromDate, toDate],
  );

  const hasStatusFilter = statusFilter !== 'all';
  const hasDateFilter = datePreset !== 'all';

  // ---- Load tenant expiry map once (for the Expiry column) ----
  useEffect(() => {
    let cancelled = false;
    supabaseService
      .getAllTenants()
      .then((list) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        list.forEach((t) => {
          if (t.subscriptionExpiresAt) {
            map[t.slug] = t.subscriptionExpiresAt;
          }
        });
        setExpiryBySlug(map);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[Revenue] tenant expiry map failed:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Load summary stats ----
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      supabaseService.getPlatformRevenueStats(),
      supabaseService.getPlatformRevenueStatsForDateRange(fromIso, toIso),
    ])
      .then(([globalStats, rangeStats]) => {
        if (cancelled || !globalStats) return;

        const avg =
          rangeStats.totalInvoices > 0
            ? Math.round(rangeStats.totalRevenue / rangeStats.totalInvoices)
            : 0;

        setStats({
          totalRevenue: rangeStats.totalRevenue,
          revenueThisMonth: globalStats.revenueThisMonth,
          revenueLastMonth: globalStats.revenueLastMonth,
          revenueThisYear:
            (globalStats as any).revenueThisYear ??
            globalStats.totalRevenue ??
            0,
          totalInvoices: rangeStats.totalInvoices,
          pendingInvoices: rangeStats.pendingInvoices,
          pendingAmount: rangeStats.pendingAmount,
          paidInvoices: rangeStats.paidInvoices,
          averageInvoice: avg,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError('Failed to load revenue stats.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fromIso, toIso]);

  // ---- Reload the paged list ----
  useEffect(() => {
    let cancelled = false;
    setIsListLoading(true);

    supabaseService
      .getPlatformInvoicesPaged({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        status: statusFilter,
        fromDate: fromIso,
        toDate: toIso,
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows);
        setTotalCount(res.totalCount);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError('Failed to load invoices.');
      })
      .finally(() => {
        if (!cancelled) setIsListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, statusFilter, fromIso, toIso]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, fromIso, toIso]);

  const growthPct = useMemo(() => {
    if (!stats) return 0;
    const prev = stats.revenueLastMonth;
    const curr = stats.revenueThisMonth;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }, [stats]);

  const activeFilters =
    (search.trim() !== '' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (datePreset !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDatePreset('all');
    setFromDate('');
    setToDate('');
  };

  // =========================================================
  // Export PDF
  // =========================================================
  const openExportSheet = () => {
    // Default to whatever the current filter is.
    if (datePreset === 'all' || datePreset === 'custom') {
      setExportRange(datePreset === 'custom' ? 'custom' : 'thisMonth');
      setExportFrom(fromDate);
      setExportTo(toDate);
    } else {
      setExportRange(datePreset as ExportRange);
      setExportFrom('');
      setExportTo('');
    }
    setIsExportSheetOpen(true);
  };

  const runExport = async () => {
    setIsExporting(true);
    setError('');
    try {
      const { from, to } = computePresetRange(
        exportRange as DatePreset,
        exportFrom,
        exportTo,
      );

      const all = await supabaseService.getPlatformInvoicesForExport({
        status: statusFilter,
        fromDate: from,
        toDate: to,
      });

      if (all.length === 0) {
        alert('No invoices match the selected filters.');
        setIsExportSheetOpen(false);
        setIsExporting(false);
        return;
      }

      // Recompute the total revenue for the exported range so the
      // PDF's summary banner matches the exact rows we're shipping.
      const totalRevenue = all
        .filter((r) => r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.final_amount || 0), 0);

      const pdfRows: RevenueInvoicePdfRow[] = all.map((r) => ({
        id: r.id,
        tenant_slug: r.tenant_slug,
        tenant_name: r.tenant_name || r.tenant_slug,
        plan_id: r.plan_id,
        months: r.months,
        base_amount: r.base_amount,
        final_amount: r.final_amount,
        status: r.status as 'paid' | 'pending' | 'cancelled',
        created_at: r.created_at,
        paid_at: r.paid_at,
        subscription_expires_at: expiryBySlug[r.tenant_slug] ?? null,
      }));

      downloadRevenueInvoicesPdf({
  storeName: 'Dozzelo',
  rangeLabel: rangeLabelFor(exportRange, exportFrom, exportTo),
  fromDateIso: from,
  toDateIso: to,
  rows: pdfRows,
  totalRevenue,
  statusLabel:
    statusFilter === 'all'
      ? 'All'
      : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1),
  // generatedAt intentionally omitted — the util stamps it once.
});

      setIsExportSheetOpen(false);
    } catch (err) {
      console.error('Export PDF failed:', err);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // =========================================================
  // Filter sheet draft state
  // =========================================================
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(statusFilter);
  const [draftPreset, setDraftPreset] = useState<DatePreset>(datePreset);
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);

  const openFilterSheet = () => {
    setDraftStatus(statusFilter);
    setDraftPreset(datePreset);
    setDraftFrom(fromDate);
    setDraftTo(toDate);
    setIsFilterSheetOpen(true);
  };

  const resetDraft = () => {
    setDraftStatus('all');
    setDraftPreset('all');
    setDraftFrom('');
    setDraftTo('');
  };

  const applyDraft = () => {
    setStatusFilter(draftStatus);
    setDatePreset(draftPreset);
    setFromDate(draftFrom);
    setToDate(draftTo);
    setIsFilterSheetOpen(false);
  };

  // =========================================================
  // Render
  // =========================================================
  return (
    <InlineSection
      title="Revenue & Billing"
      actions={
        <div className={local.headerActions}>
          <Button
            variant={activeFilters > 0 ? 'primary' : 'ghost'}
            size="sm"
            onClick={openFilterSheet}
            leftIcon={
              <FilterIcon width={14} height={14} fill="currentColor" />
            }
          >
            Filters
            {activeFilters > 0 && (
              <span className={local.filterCount}>{activeFilters}</span>
            )}
          </Button>

          <DropdownMenu
            minWidth={220}
            trigger={({ toggle }) => (
              <IconButton
                variant="soft"
                size="md"
                aria-label="More actions"
                tooltip="More actions"
                onClick={toggle}
              >
                <KebabIcon width={18} height={18} fill="#0F172A" />
              </IconButton>
            )}
          >
            {({ close }) => (
              <>
                <DropdownItem
                  onClick={() => {
                    close();
                    openExportSheet();
                  }}
                >
                  Export invoices (PDF)
                </DropdownItem>
                <DropdownItem
                  onClick={() => {
                    close();
                    resetFilters();
                  }}
                >
                  Reset filters
                </DropdownItem>
              </>
            )}
          </DropdownMenu>
        </div>
      }
    >
      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}

      <div className={local.searchBox}>
        <Input
          placeholder="Search by store..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputSize="sm"
          leftIcon={<SearchIcon width={14} height={14} fill="#b3b3b3" />}
          rightIcon={
            search ? (
              <IconButton
                variant="ghost"
                size="xs"
                aria-label="Clear search"
                onClick={() => setSearch('')}
              >
                <CloseIcon width={18} height={18} fill="#4d4d4d" />
              </IconButton>
            ) : undefined
          }
        />
      </div>

      {isLoading ? (
        <EmptyState title="Calculating platform revenue..." />
      ) : !stats ? (
        <EmptyState title="No revenue data available" />
      ) : (
        <div className={local.wrap}>
          {/* ---- Summary cards ---- */}
          <div
            className={`${local.statsGrid} ${
              hasStatusFilter ? local.statsGridCompact : ''
            }`}
          >
            <Card padding="lg" className={local.statCard}>
              <span className={local.statLabel}>Total Invoices</span>
              <span className={local.statValue}>{stats.totalInvoices}</span>
              <span className={local.statSub}>
                Avg {formatRupees(stats.averageInvoice)}
              </span>
            </Card>

            <Card padding="lg" className={local.statCard}>
              <span className={local.statLabel}>Paid Invoices</span>
              <span className={local.statValue}>{stats.paidInvoices}</span>
              <span className={local.statSub}>
                Avg {formatRupees(stats.averageInvoice)}
              </span>
            </Card>

            <Card padding="lg" className={local.statCard}>
              <span className={local.statLabel}>Pending Invoices</span>
              <span className={local.statValue}>
                {stats.pendingInvoices}
              </span>
              <span className={local.statSub}>
                Worth {formatRupees(stats.pendingAmount)}
              </span>
            </Card>

            {!hasStatusFilter && (
              <>
                <Card padding="lg" className={local.statCard}>
                  <span className={local.statLabel}>This Month</span>
                  <div className={local.statValueRow}>
                    <span className={local.statValue}>
                      {formatRupees(stats.revenueThisMonth)}
                    </span>
                    <Badge
                      tone={growthPct >= 0 ? 'success' : 'danger'}
                      size="sm"
                    >
                      {growthPct >= 0 ? '+' : '-'}{' '}
                      {Math.abs(growthPct)}%
                    </Badge>
                  </div>
                  <span className={local.statSub}>
                    vs {formatRupees(stats.revenueLastMonth)} last month
                  </span>
                </Card>

                <Card padding="lg" className={local.statCard}>
                  <span className={local.statLabel}>This Year</span>
                  <span className={local.statValue}>
                    {formatRupees(stats.revenueThisYear)}
                  </span>
                  <span className={local.statSub}>
                    Year-to-date revenue
                  </span>
                </Card>

                <Card padding="lg" className={local.statCard}>
                  <span className={local.statLabel}>Total Revenue</span>
                  <span className={local.statValue}>
                    {formatRupees(stats.totalRevenue)}
                  </span>
                  {hasDateFilter ? (
                    <span className={local.statSub}>
                      For selected date range
                    </span>
                  ) : null}
                </Card>
              </>
            )}
          </div>

          {/* ---- Recent invoices ---- */}
          <div className={local.tableSection}>
            <div className={local.tableHeader}>
              <h3 className={local.tableTitle}>
                Recent Invoices
                {totalCount > 0 && (
                  <span className={local.tableCount}>
                    {totalCount} total
                  </span>
                )}
              </h3>
            </div>

            {isListLoading ? (
              <EmptyState title="Loading invoices..." />
            ) : rows.length === 0 ? (
              <EmptyState
                title={
                  activeFilters > 0
                    ? 'No invoices match your filters'
                    : 'No invoices generated yet'
                }
                description={
                  activeFilters > 0
                    ? 'Try adjusting or clearing the filters.'
                    : undefined
                }
                action={
                  activeFilters > 0 ? (
                    <Button variant="ghost" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className={local.tableWrap}>
                  <table className={local.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Store</th>
                        <th>Plan</th>
                        <th>Amount</th>
                        <th>Expires</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((inv) => {
                        const expiry = expiryBySlug[inv.tenant_slug];
                        return (
                          <tr key={inv.id}>
                            <td>
                              {new Date(
                                inv.created_at,
                              ).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td>
                              <strong>
                                {inv.tenant_name || inv.tenant_slug}
                              </strong>
                            </td>
                            <td>
                              {inv.plan_id} ({inv.months} mo)
                            </td>
                            <td className={local.amountCol}>
                              {formatRupees(inv.final_amount)}
                            </td>
                            <td>
                              {expiry
                                ? new Date(expiry).toLocaleDateString(
                                    'en-IN',
                                    {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    },
                                  )
                                : '-'}
                            </td>
                            <td>
                              <Badge
                                tone={
                                  inv.status === 'paid'
                                    ? 'success'
                                    : inv.status === 'pending'
                                      ? 'warning'
                                      : 'danger'
                                }
                                size="sm"
                              >
                                {inv.status.toUpperCase()}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  pageSize={PAGE_SIZE}
                  onChange={setPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          Filter sheet
         ========================================================= */}
      <Sheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filters"
        position="center"
        mobileFullScreen
        maxHeightVh={86}
        className={local.filterSheet}
        footer={
          <>
            <Button variant="ghost" onClick={resetDraft} block>
              Reset
            </Button>
            <Button onClick={applyDraft} block>
              Apply
            </Button>
          </>
        }
      >
        <section className={local.filterSection}>
          <h4>Status</h4>
          <div className={local.chipGrid}>
            {STATUS_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                tone="primary"
                active={draftStatus === o.key}
                onClick={() => setDraftStatus(o.key)}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className={local.filterSection}>
          <h4>Date range</h4>
          <div className={local.chipGrid}>
            {DATE_PRESETS.map((o) => (
              <Chip
                key={o.key}
                tone="primary"
                active={draftPreset === o.key}
                onClick={() => setDraftPreset(o.key)}
              >
                {o.label}
              </Chip>
            ))}
          </div>

          {draftPreset === 'custom' && (
            <div className={local.dateRangeRow}>
              <FormField label="From">
                <Input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  inputSize="sm"
                />
              </FormField>
              <FormField label="To">
                <Input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  inputSize="sm"
                />
              </FormField>
            </div>
          )}
        </section>
      </Sheet>

      {/* =========================================================
          Export PDF sheet
         ========================================================= */}
      <Sheet
        isOpen={isExportSheetOpen}
        onClose={() => {
          if (isExporting) return;
          setIsExportSheetOpen(false);
        }}
        title="Export invoices"
        position="center"
        mobileFullScreen
        maxHeightVh={86}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsExportSheetOpen(false)}
              disabled={isExporting}
              block
            >
              Cancel
            </Button>
            <Button
              onClick={runExport}
              loading={isExporting}
              block
              disabled={
                exportRange === 'custom' && (!exportFrom || !exportTo)
              }
            >
              {isExporting ? 'Preparing PDF...' : 'Download PDF'}
            </Button>
          </>
        }
      >
        <section className={local.filterSection}>
          <h4>Date range</h4>
          <div className={local.chipGrid}>
            {EXPORT_RANGES.map((o) => (
              <Chip
                key={o.key}
                tone="primary"
                active={exportRange === o.key}
                onClick={() => setExportRange(o.key)}
                disabled={isExporting}
              >
                {o.label}
              </Chip>
            ))}
          </div>

          {exportRange === 'custom' && (
            <div className={local.dateRangeRow}>
              <FormField label="From">
                <Input
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                  inputSize="sm"
                  disabled={isExporting}
                />
              </FormField>
              <FormField label="To">
                <Input
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                  inputSize="sm"
                  disabled={isExporting}
                />
              </FormField>
            </div>
          )}

          <p
            style={{
              margin: '12px 0 0',
              fontSize: 12.5,
              color: '#1e1e1e',
              lineHeight: 1.5,
            }}
          >
            The PDF includes the invoices currently filtered by status
            (
            <strong>
              {statusFilter === 'all'
                ? 'All'
                : statusFilter.charAt(0).toUpperCase() +
                  statusFilter.slice(1)}
            </strong>
            ) within the date range you pick above. It matches the table
            on this page, plus an Expiry column.
          </p>
        </section>
      </Sheet>
    </InlineSection>
  );
};

export default RevenueBody;