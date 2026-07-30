import { useState, useEffect, useMemo, useCallback } from 'react';
import { WorkEntry, subscribeToWorkEntries } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subDays, subMonths,
  isWithinInterval, format, eachDayOfInterval, isSameDay,
} from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ShieldCheck, TrendingUp, IndianRupee, Download, Search,
  CalendarIcon, ChevronUp, ChevronDown, ChevronsUpDown,
  AlertTriangle, X,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { DateRange } from 'react-day-picker';

// ── Types ─────────────────────────────────────────────────────────────────────

type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';
type SortDir = 'asc' | 'desc' | null;
type TabKey = 'overview' | 'work' | 'category';

interface DateRangeState {
  from: Date;
  to: Date;
  preset: PresetKey;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function buildPreset(key: Exclude<PresetKey, 'custom'>): { from: Date; to: Date } {
  const now = new Date();
  switch (key) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case 'thisWeek':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth': {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
  }
}

function inRange(d: Date, from: Date, to: Date) {
  return isWithinInterval(d, { start: from, end: to });
}

// ── CSV export ────────────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sorting hook ──────────────────────────────────────────────────────────────

function useSortState(initialCol: string) {
  const [col, setCol] = useState<string>(initialCol);
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const toggle = useCallback((newCol: string) => {
    if (col === newCol) {
      setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setCol(newCol);
      setDir('desc');
    }
  }, [col]);

  return {
    col,
    dir,
    toggle,
    getDir: (c: string): SortDir => (col === c ? dir : null),
  };
}

function sortRows<T>(
  rows: T[],
  col: string,
  dir: 'asc' | 'desc',
  getValue: (r: T, col: string) => string | number,
): T[] {
  return [...rows].sort((a, b) => {
    const av = getValue(a, col);
    const bv = getValue(b, col);
    const cmp =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  });
}

// ── Small UI atoms ────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ChevronUp className="h-3.5 w-3.5 ml-1 inline" />;
  if (dir === 'desc') return <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 inline opacity-40" />;
}

function StatusBadge({ status }: { status: WorkEntry['status'] }) {
  const map: Record<WorkEntry['status'], string> = {
    Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Pending: 'bg-amber-100 text-amber-700 border-amber-200',
    Rejected: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}
    >
      {status}
    </span>
  );
}

// ── Work entry helpers ────────────────────────────────────────────────────────

function getWorkChallan(e: WorkEntry): number {
  return (e.challanAmount ?? 0) + (e.netAdjustmentChallan ?? 0);
}

// ── Date Range Filter ─────────────────────────────────────────────────────────

const PRESETS: { key: Exclude<PresetKey, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
];

function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeState;
  onChange: (v: DateRangeState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>({
    from: value.from,
    to: value.to,
  });

  const applyPreset = (key: Exclude<PresetKey, 'custom'>) => {
    const { from, to } = buildPreset(key);
    onChange({ from, to, preset: key });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!pendingRange?.from || !pendingRange?.to) return;
    onChange({
      from: startOfDay(pendingRange.from),
      to: endOfDay(pendingRange.to),
      preset: 'custom',
    });
    setOpen(false);
  };

  const customLabel =
    value.preset === 'custom'
      ? `${format(value.from, 'dd MMM')} – ${format(value.to, 'dd MMM yyyy')}`
      : 'Custom Range';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESETS.map(p => (
        <Button
          key={p.key}
          size="sm"
          variant={value.preset === p.key ? 'default' : 'outline'}
          className="h-8 text-xs rounded-lg"
          onClick={() => applyPreset(p.key)}
        >
          {p.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={value.preset === 'custom' ? 'default' : 'outline'}
            className="h-8 text-xs rounded-lg gap-1.5"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {customLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <Calendar
            mode="range"
            selected={pendingRange}
            onSelect={setPendingRange}
            numberOfMonths={2}
            disabled={(d: Date) => d > new Date()}
          />
          <div className="flex justify-end mt-3">
            <Button
              size="sm"
              onClick={applyCustom}
              disabled={!pendingRange?.from || !pendingRange?.to}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

interface ProfitSource {
  label: string;
  profit: number;
  sub?: string;
}

function OverviewTab({
  work,
  dateRange,
}: {
  work: WorkEntry[];
  dateRange: DateRangeState;
}) {
  const active = work.filter(e => e.status !== 'Rejected');

  const totalCollected = active.reduce((s, e) => s + e.paidAmount, 0);
  const totalChallan = active.reduce((s, e) => s + getWorkChallan(e), 0);
  const workProfit = totalCollected - totalChallan;

  const totalDue = active.reduce((s, e) => s + Math.max(0, e.dueAmount), 0);
  const totalCredit = active.reduce(
    (s, e) => s + (e.dueAmount < 0 ? -e.dueAmount : 0),
    0,
  );

  // profitSources — extend this array in Part 2 to add more income streams
  const profitSources: ProfitSource[] = [
    {
      label: 'Work',
      profit: workProfit,
      sub: `${formatCurrency(totalCollected)} collected − ${formatCurrency(totalChallan)} challan`,
    },
    // Part 2: push({ label: 'Quick Work', profit: quickProfit })
    // Part 2: push({ label: 'AEPS', profit: aepsProfit })
    // Part 2: push({ label: 'Recharge', profit: rechargeProfit })
    // Part 2: push({ label: 'Transfer', profit: transferProfit })
  ];
  const totalProfit = profitSources.reduce((s, src) => s + src.profit, 0);

  // Daily trend — group entries by day within the range
  const trendData = useMemo(() => {
    let days: Date[] = [];
    try {
      days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    } catch {
      return [];
    }
    // For very large ranges (>90 days) only show bars for days that have data
    if (days.length > 90) {
      const dayMap: Record<string, { profit: number; revenue: number }> = {};
      active.forEach(e => {
        const key = format(e.date.toDate(), 'dd MMM');
        if (!dayMap[key]) dayMap[key] = { profit: 0, revenue: 0 };
        dayMap[key].revenue += e.paidAmount;
        dayMap[key].profit += e.paidAmount - getWorkChallan(e);
      });
      return Object.entries(dayMap)
        .map(([date, v]) => ({ date, profit: Math.round(v.profit), revenue: Math.round(v.revenue) }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    return days.map(day => {
      const dayEntries = active.filter(e => isSameDay(e.date.toDate(), day));
      const rev = dayEntries.reduce((s, e) => s + e.paidAmount, 0);
      const chal = dayEntries.reduce((s, e) => s + getWorkChallan(e), 0);
      return { date: format(day, 'dd MMM'), profit: Math.round(rev - chal), revenue: Math.round(rev) };
    });
  }, [active, dateRange]);

  const hasEntries = active.length > 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalProfit)}</div>
            {profitSources.map(src => (
              <div key={src.label} className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{src.label}:</span>{' '}
                {formatCurrency(src.profit)}
                {src.sub && <span className="block opacity-70 mt-0.5">{src.sub}</span>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Revenue Collected
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalCollected)}</div>
            <p className="text-xs text-muted-foreground mt-1">{active.length} work entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Outstanding Due
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDue > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>
              {formatCurrency(totalDue)}
            </div>
            {totalCredit > 0 ? (
              <p className="text-xs text-emerald-700 mt-1 font-medium">
                + {formatCurrency(totalCredit)} overpaid/credit
              </p>
            ) : totalDue === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">All cleared</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Challan Spent
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalChallan)}</div>
            <p className="text-xs text-muted-foreground mt-1">Govt fees deducted</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Daily Work Profit</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasEntries ? (
            <div className="flex flex-col items-center justify-center h-44 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No work entries in this period.</p>
            </div>
          ) : trendData.length <= 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
                <Bar dataKey="profit" fill="#4f46e5" name="Profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    formatCurrency(v),
                    name === 'profit' ? 'Profit' : 'Revenue',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={trendData.length <= 14}
                  name="profit"
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  name="revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          {hasEntries && trendData.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Indigo = profit (after challan) · Grey dashed = revenue collected
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Work & Challan ───────────────────────────────────────────────────────

function WorkChallanTab({ work }: { work: WorkEntry[] }) {
  const [search, setSearch] = useState('');
  const sort = useSortState('date');

  const active = work.filter(e => e.status !== 'Rejected');
  const rejected = work.filter(e => e.status === 'Rejected');

  const totalCollected = active.reduce((s, e) => s + e.paidAmount, 0);
  const totalChallan = active.reduce((s, e) => s + getWorkChallan(e), 0);
  const netProfit = totalCollected - totalChallan;
  const totalRefund = rejected.reduce((s, e) => s + (e.refundAmount ?? 0), 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return work.filter(
      e =>
        !search ||
        e.customerName.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.mobile ?? '').includes(q),
    );
  }, [work, search]);

  const getValue = useCallback((e: WorkEntry, col: string): string | number => {
    switch (col) {
      case 'date':     return e.date.toMillis();
      case 'customer': return e.customerName;
      case 'category': return e.category;
      case 'total':    return e.totalAmount;
      case 'challan':  return getWorkChallan(e);
      case 'paid':     return e.paidAmount;
      case 'due':      return e.dueAmount;
      case 'status':   return e.status;
      default:         return 0;
    }
  }, []);

  const sorted = useMemo(
    () => sortRows(filtered, sort.col, sort.dir, getValue),
    [filtered, sort.col, sort.dir, getValue],
  );

  const exportCSV = () => {
    const header = ['Date', 'Customer', 'Mobile', 'Category', 'Total Amount', 'Challan', 'Paid', 'Due', 'Status'];
    const rows = sorted.map(e => [
      format(e.date.toDate(), 'dd/MM/yyyy'),
      e.customerName,
      e.mobile,
      e.category === 'Other' && e.otherCategory ? e.otherCategory : e.category,
      String(e.totalAmount),
      String(getWorkChallan(e)),
      String(e.paidAmount),
      String(e.dueAmount),
      e.status,
    ]);
    downloadCSV(`work-challan-${format(new Date(), 'yyyy-MM-dd')}.csv`, [header, ...rows]);
  };

  const Th = ({
    col,
    label,
    align = 'left',
  }: {
    col: string;
    label: string;
    align?: 'left' | 'right';
  }) => (
    <TableHead
      className={`cursor-pointer select-none whitespace-nowrap ${align === 'right' ? 'text-right' : ''} hover:text-foreground transition-colors`}
      onClick={() => sort.toggle(col)}
    >
      {label}
      <SortIcon dir={sort.getDir(col)} />
    </TableHead>
  );

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Entries', value: String(active.length), cls: '' },
          { label: 'Total Collected', value: formatCurrency(totalCollected), cls: 'text-emerald-700' },
          { label: 'Total Challan', value: formatCurrency(totalChallan), cls: 'text-slate-600' },
          { label: 'Net Profit', value: formatCurrency(netProfit), cls: 'text-primary font-bold' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-xl font-semibold ${s.cls}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rejected callout */}
      {rejected.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
          <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-red-700">Rejected/Refunded Entries: </span>
            <span className="text-red-600">{rejected.length} {rejected.length === 1 ? 'entry' : 'entries'}</span>
            {totalRefund > 0 && (
              <span className="text-red-600"> · {formatCurrency(totalRefund)} refunded</span>
            )}
            <p className="text-xs text-red-500 mt-0.5">
              Not counted in the profit figures above.
            </p>
          </div>
        </div>
      )}

      {/* Search + export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <Th col="date" label="Date" />
                <Th col="customer" label="Customer" />
                <Th col="category" label="Category" />
                <Th col="total" label="Total Amt" align="right" />
                <Th col="challan" label="Challan" align="right" />
                <Th col="paid" label="Paid" align="right" />
                <Th col="due" label="Due" align="right" />
                <Th col="status" label="Status" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {search ? `No entries match "${search}".` : 'No entries in this period.'}
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map(e => {
                  const due = e.dueAmount;
                  const cat =
                    e.category === 'Other' && e.otherCategory ? e.otherCategory : e.category;
                  return (
                    <TableRow key={e.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(e.date.toDate(), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="font-medium max-w-[160px] truncate">
                        {e.customerName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal whitespace-nowrap">
                          {cat}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(e.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-500">
                        {getWorkChallan(e) > 0 ? formatCurrency(getWorkChallan(e)) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700 font-medium">
                        {formatCurrency(e.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {due > 0 ? (
                          <span className="text-amber-700 font-medium">{formatCurrency(due)}</span>
                        ) : due < 0 ? (
                          <span className="text-emerald-700 text-xs">
                            +{formatCurrency(-due)} credit
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && (
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">
            {sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}
            {search ? ` matching "${search}"` : ''}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: Category-wise ────────────────────────────────────────────────────────

interface CategoryRow {
  category: string;
  count: number;
  collected: number;
  challan: number;
  netProfit: number;
}

function CategoryTab({ work }: { work: WorkEntry[] }) {
  const sort = useSortState('count');

  const rows = useMemo<CategoryRow[]>(() => {
    const map: Record<string, CategoryRow> = {};
    work
      .filter(e => e.status !== 'Rejected')
      .forEach(e => {
        const cat =
          e.category === 'Other' && e.otherCategory ? e.otherCategory : e.category;
        if (!map[cat]) {
          map[cat] = { category: cat, count: 0, collected: 0, challan: 0, netProfit: 0 };
        }
        map[cat].count++;
        map[cat].collected += e.paidAmount;
        map[cat].challan += getWorkChallan(e);
        map[cat].netProfit += e.paidAmount - getWorkChallan(e);
      });
    return Object.values(map);
  }, [work]);

  const getValue = useCallback((r: CategoryRow, col: string): string | number => {
    switch (col) {
      case 'category': return r.category;
      case 'count':    return r.count;
      case 'collected': return r.collected;
      case 'challan':  return r.challan;
      case 'profit':   return r.netProfit;
      default: return 0;
    }
  }, []);

  const sorted = useMemo(
    () => sortRows(rows, sort.col, sort.dir, getValue),
    [rows, sort.col, sort.dir, getValue],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          count: acc.count + r.count,
          collected: acc.collected + r.collected,
          challan: acc.challan + r.challan,
          profit: acc.profit + r.netProfit,
        }),
        { count: 0, collected: 0, challan: 0, profit: 0 },
      ),
    [rows],
  );

  const exportCSV = () => {
    const header = ['Category', 'Entries', 'Collected (₹)', 'Challan (₹)', 'Net Profit (₹)'];
    const dataRows = sorted.map(r => [
      r.category,
      String(r.count),
      String(r.collected),
      String(r.challan),
      String(r.netProfit),
    ]);
    downloadCSV(`category-report-${format(new Date(), 'yyyy-MM-dd')}.csv`, [header, ...dataRows]);
  };

  const Th = ({
    col,
    label,
    align = 'left',
  }: {
    col: string;
    label: string;
    align?: 'left' | 'right';
  }) => (
    <TableHead
      className={`cursor-pointer select-none whitespace-nowrap ${align === 'right' ? 'text-right' : ''} hover:text-foreground transition-colors`}
      onClick={() => sort.toggle(col)}
    >
      {label}
      <SortIcon dir={sort.getDir(col)} />
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <Th col="category" label="Category" />
                <Th col="count" label="Entries" align="right" />
                <Th col="collected" label="Collected" align="right" />
                <Th col="challan" label="Challan" align="right" />
                <Th col="profit" label="Net Profit" align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No entries in this period.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map(r => (
                  <TableRow key={r.category} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 font-medium">
                      {formatCurrency(r.collected)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">
                      {r.challan > 0 ? formatCurrency(r.challan) : '—'}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-semibold ${r.netProfit >= 0 ? 'text-primary' : 'text-red-600'}`}
                    >
                      {formatCurrency(r.netProfit)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Totals footer */}
        {sorted.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/20 flex">
            <div className="flex-1 text-sm font-semibold">
              Total ({totals.count} {totals.count === 1 ? 'entry' : 'entries'})
            </div>
            <div className="text-right text-sm font-semibold text-emerald-700 w-28 pr-4">
              {formatCurrency(totals.collected)}
            </div>
            <div className="text-right text-sm font-semibold text-slate-600 w-24 pr-4">
              {formatCurrency(totals.challan)}
            </div>
            <div className="text-right text-sm font-semibold text-primary w-24">
              {formatCurrency(totals.profit)}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

// Tab definitions — extend here for Part 2 and Part 3
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'work', label: 'Work & Challan' },
  { key: 'category', label: 'Category-wise' },
  // Part 2: { key: 'financial', label: 'Financial Services' }
  // Part 3: { key: 'cashonline', label: 'Cash vs Online' }
];

export default function ReportsPage() {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRangeState>(() => {
    const { from, to } = buildPreset('thisMonth');
    return { from, to, preset: 'thisMonth' };
  });

  useEffect(() => {
    const unsub = subscribeToWorkEntries(entries => {
      setWorkEntries(entries);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Filter to the selected date range
  const filteredWork = useMemo(
    () => workEntries.filter(e => inRange(e.date.toDate(), dateRange.from, dateRange.to)),
    [workEntries, dateRange],
  );

  // ── Access guard ──────────────────────────────────────────────────────────
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-xs">
          Reports are only visible to the Owner.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-9 w-28 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--app-font-display)' }}
        >
          Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Earnings, challan costs, and category analytics
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-0 border-b">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range filter — global, applies to all tabs */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab work={filteredWork} dateRange={dateRange} />
      )}
      {activeTab === 'work' && <WorkChallanTab work={filteredWork} />}
      {activeTab === 'category' && <CategoryTab work={filteredWork} />}
    </div>
  );
}
