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
  DropdownDivider,
} from '../ui';
import { SearchIcon, FilterIcon } from '../../assets/svgs';
import { formatRupees } from '../../utils/subscription';
import { useDebounce } from '../../hooks/useDebounce';
import local from './RevenueBody.module.scss';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | 'paid' | 'pending' | 'cancelled';

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
  totalInvoices: number;
  pendingInvoices: number;
  pendingAmount: number;
  paidInvoices: number;
  averageInvoice: number;
}

const RevenueBody: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // ---- Search / filter state ----
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ---- Pagination ----
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isListLoading, setIsListLoading] = useState(false);

  // ---- Export state ----
  const [isExporting, setIsExporting] = useState(false);

  // ---- Load summary stats (respecting date range) ----
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const fromIso = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined;
    const toIso = toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined;

    Promise.all([
      supabaseService.getPlatformRevenueStats(),
      supabaseService.getPlatformRevenueStatsForDateRange(fromIso, toIso),
    ])
      .then(([globalStats, rangeStats]) => {
        if (cancelled || !globalStats) return;

        // Merge: use globalStats for "This Month" / "Last Month"
        // Use rangeStats for Lifetime, Pending, Paid, Total Invoices
        const avg =
          rangeStats.totalInvoices > 0
            ? Math.round(rangeStats.totalRevenue / rangeStats.totalInvoices)
            : 0;

        setStats({
          totalRevenue: rangeStats.totalRevenue,
          revenueThisMonth: globalStats.revenueThisMonth,
          revenueLastMonth: globalStats.revenueLastMonth,
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
  }, [fromDate, toDate]); // Fetches fresh aggregates when date filters change

  // ---- Reload the paged list whenever filters or page changes ----
  useEffect(() => {
    let cancelled = false;
    setIsListLoading(true);

    const fromIso = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined;
    const toIso = toDate ? new Date(`${toDate}T23:59:59.999`).toISOString() : undefined;

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
  }, [page, debouncedSearch, statusFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Reset to page 1 whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, fromDate, toDate]);

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
    (fromDate || toDate ? 1 : 0);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
  };

  // ---- Export to CSV ----
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const fromIso = fromDate
        ? new Date(`${fromDate}T00:00:00`).toISOString()
        : undefined;
      const toIso = toDate
        ? new Date(`${toDate}T23:59:59.999`).toISOString()
        : undefined;

      const all = await supabaseService.getPlatformInvoicesForExport({
        status: statusFilter,
        fromDate: fromIso,
        toDate: toIso,
      });

      if (all.length === 0) {
        alert('No invoices match the selected filters.');
        return;
      }

      const header = [
        'Invoice ID',
        'Created',
        'Paid',
        'Store',
        'Slug',
        'Plan',
        'Months',
        'Base (Rs)',
        'Final (Rs)',
        'Status',
      ];

      const escape = (v: string | number | null) => {
        const s = v === null || v === undefined ? '' : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };

      const lines = [header.map(escape).join(',')];
      for (const r of all) {
        lines.push(
          [
            r.id,
            new Date(r.created_at).toLocaleString('en-IN'),
            r.paid_at ? new Date(r.paid_at).toLocaleString('en-IN') : '',
            r.tenant_name,
            r.tenant_slug,
            r.plan_id,
            r.months,
            r.base_amount,
            r.final_amount,
            r.status,
          ]
            .map(escape)
            .join(','),
        );
      }

      const blob = new Blob([lines.join('\n')], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 800);
    } catch (err) {
      console.error('export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <InlineSection
      title="Revenue & Billing"
      actions={
        <div className={local.headerActions}>
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
                    ✕
                  </IconButton>
                ) : undefined
              }
            />
          </div>

          <DropdownMenu
            minWidth={240}
            trigger={({ toggle }) => (
              <Button
                variant={activeFilters > 0 ? 'primary' : 'ghost'}
                size="sm"
                onClick={toggle}
                leftIcon={<FilterIcon width={14} height={14} fill="currentColor" />}
              >
                Filters
                {activeFilters > 0 && (
                  <span className={local.filterCount}>{activeFilters}</span>
                )}
              </Button>
            )}
          >
            {({ close }) => (
              <>
                <div className={local.filterSection}>
                  <span className={local.filterLabel}>Status</span>
                  {(
                    [
                      { key: 'all', label: 'All' },
                      { key: 'paid', label: 'Paid' },
                      { key: 'pending', label: 'Pending' },
                      { key: 'cancelled', label: 'Cancelled' },
                    ] as { key: StatusFilter; label: string }[]
                  ).map((o) => (
                    <DropdownItem
                      key={o.key}
                      active={statusFilter === o.key}
                      onClick={() => setStatusFilter(o.key)}
                    >
                      {o.label}
                    </DropdownItem>
                  ))}
                </div>

                <DropdownDivider />

                <div className={local.filterSection}>
                  <span className={local.filterLabel}>Date range</span>
                  <div className={local.dateRow}>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      inputSize="sm"
                    />
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      inputSize="sm"
                    />
                  </div>
                </div>

                {activeFilters > 0 && (
                  <>
                    <DropdownDivider />
                    <DropdownItem
                      tone="danger"
                      onClick={() => {
                        resetFilters();
                        close();
                      }}
                    >
                      Clear filters
                    </DropdownItem>
                  </>
                )}
              </>
            )}
          </DropdownMenu>

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
                <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 800 }}>
                  ⋮
                </span>
              </IconButton>
            )}
          >
            {({ close }) => (
              <>
                <DropdownItem
                  disabled={isExporting}
                  onClick={() => {
                    close();
                    handleExport();
                  }}
                >
                  {isExporting ? 'Preparing CSV…' : 'Export all invoices'}
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

      {isLoading ? (
        <EmptyState title="Calculating platform revenue..." />
      ) : !stats ? (
        <EmptyState title="No revenue data available" />
      ) : (
        <div className={local.wrap}>
          {/* ---- Summary cards ---- */}
          <div className={local.statsGrid}>
            <Card padding="lg" className={local.statCard}>
              <span className={local.statLabel}>Total Revenue</span>
              <span className={local.statValue}>
                {formatRupees(stats.totalRevenue)}
              </span>
              {fromDate || toDate ? (
                <span className={local.statSub}>For selected date range</span>
              ) : null}
            </Card>

            <Card padding="lg" className={local.statCard}>
              <span className={local.statLabel}>This Month</span>
              <div className={local.statValueRow}>
                <span className={local.statValue}>
                  {formatRupees(stats.revenueThisMonth)}
                </span>
                <Badge tone={growthPct >= 0 ? 'success' : 'danger'} size="sm">
                  {growthPct >= 0 ? '↑' : '↓'} {Math.abs(growthPct)}%
                </Badge>
              </div>
              <span className={local.statSub}>
                vs {formatRupees(stats.revenueLastMonth)} last month
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

            <Card padding="lg" className={local.statCard}>
              <span className={local.statLabel}>Paid Invoices</span>
              <span className={local.statValue}>{stats.paidInvoices}</span>
              <span className={local.statSub}>
                Avg {formatRupees(stats.averageInvoice)}
              </span>
            </Card>
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
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((inv) => (
                        <tr key={inv.id}>
                          <td>
                            {new Date(inv.created_at).toLocaleDateString(
                              'en-IN',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              },
                            )}
                          </td>
                          <td>
                            <strong>{inv.tenant_name || inv.tenant_slug}</strong>
                          </td>
                          <td>
                            {inv.plan_id} ({inv.months} mo)
                          </td>
                          <td className={local.amountCol}>
                            {formatRupees(inv.final_amount)}
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
                      ))}
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
    </InlineSection>
  );
};

export default RevenueBody;