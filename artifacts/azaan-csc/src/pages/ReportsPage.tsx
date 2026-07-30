import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  WorkEntry, subscribeToWorkEntries,
  AepsWithdrawal, subscribeToAepsWithdrawals,
  ElectricRecharge, subscribeToElectricRecharges,
  MoneyTransfer, subscribeToMoneyTransfers,
  QuickActionEntry, subscribeToQuickActions,
} from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, subDays, subMonths,
  isWithinInterval, format, eachDayOfInterval, isSameDay,
} from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { resolveStatus } from '@/lib/payments';
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
  AlertTriangle, X, Banknote, Wifi,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import type { DateRange } from 'react-day-picker';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PresetKey = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';
type SortDir   = 'asc' | 'desc' | null;
type TabKey    = 'overview' | 'work' | 'category' | 'aeps' | 'recharge' | 'transfer' | 'quick' | 'cashonline';

interface DateRangeState { from: Date; to: Date; preset: PresetKey; }

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildPreset(key: Exclude<PresetKey, 'custom'>): { from: Date; to: Date } {
  const now = new Date();
  switch (key) {
    case 'today':      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': { const y = subDays(now, 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    case 'thisWeek':   return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'thisMonth':  return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth': { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
  }
}

function inRange(d: Date, from: Date, to: Date) {
  return isWithinInterval(d, { start: from, end: to });
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV export
// ─────────────────────────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────────────────────────────────────

function useSortState(initialCol: string) {
  const [col, setCol] = useState<string>(initialCol);
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const toggle = useCallback((newCol: string) => {
    if (col === newCol) { setDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setCol(newCol); setDir('desc'); }
  }, [col]);
  return { col, dir, toggle, getDir: (c: string): SortDir => col === c ? dir : null };
}

function sortRows<T>(rows: T[], col: string, dir: 'asc' | 'desc', getValue: (r: T, col: string) => string | number): T[] {
  return [...rows].sort((a, b) => {
    const av = getValue(a, col), bv = getValue(b, col);
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI atoms
// ─────────────────────────────────────────────────────────────────────────────

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc')  return <ChevronUp   className="h-3.5 w-3.5 ml-1 inline" />;
  if (dir === 'desc') return <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 inline opacity-40" />;
}

function StatusBadge({ status }: { status: WorkEntry['status'] }) {
  const cls: Record<WorkEntry['status'], string> = {
    Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Pending:   'bg-amber-100 text-amber-700 border-amber-200',
    Rejected:  'bg-red-100 text-red-700 border-red-200',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls[status]}`}>{status}</span>;
}

/** Create a Th component bound to a sort state — call inside each tab component */
function makeTh(sort: ReturnType<typeof useSortState>) {
  return function Th({ col, label, align = 'left' }: { col: string; label: string; align?: 'left' | 'right' }) {
    return (
      <TableHead
        className={`cursor-pointer select-none whitespace-nowrap ${align === 'right' ? 'text-right' : ''} hover:text-foreground transition-colors`}
        onClick={() => sort.toggle(col)}
      >
        {label}<SortIcon dir={sort.getDir(col)} />
      </TableHead>
    );
  };
}

/** Consistent summary stat cards used across every tab */
function StatCards({ items }: { items: { label: string; value: string; sub?: string; cls?: string }[] }) {
  const cols = items.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <div className={`grid gap-3 ${cols}`}>
      {items.map(s => (
        <Card key={s.label}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-xl font-semibold ${s.cls ?? ''}`}>{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Work entry helpers
// ─────────────────────────────────────────────────────────────────────────────

function getWorkChallan(e: WorkEntry): number {
  return (e.challanAmount ?? 0) + (e.netAdjustmentChallan ?? 0);
}

/** For Cash vs Online: treat anything that isn't explicitly 'Online' as 'Cash' */
function isOnline(mode: string | undefined): boolean {
  return mode === 'Online';
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily trend builder (reused by AEPS / Recharge / Transfer)
// ─────────────────────────────────────────────────────────────────────────────

function buildDailyTrend(
  entries: { ts: Date; value: number }[],
  from: Date,
  to: Date,
): { date: string; value: number }[] {
  let days: Date[] = [];
  try { days = eachDayOfInterval({ start: from, end: to }); } catch { return []; }
  if (days.length > 90) {
    const map: Record<string, number> = {};
    entries.forEach(e => { const k = format(e.ts, 'dd MMM'); map[k] = (map[k] ?? 0) + e.value; });
    return Object.entries(map).map(([date, value]) => ({ date, value: Math.round(value) }));
  }
  return days.map(day => ({
    date: format(day, 'dd MMM'),
    value: Math.round(entries.filter(e => isSameDay(e.ts, day)).reduce((s, e) => s + e.value, 0)),
  }));
}

/** Bar chart for daily profit — shared across financial service tabs */
function DailyTrendChart({ data, color, label }: { data: { date: string; value: number }[]; color: string; label: string }) {
  const hasData = data.some(d => d.value > 0);
  if (!hasData) return (
    <div className="flex flex-col items-center justify-center h-36 text-muted-foreground">
      <TrendingUp className="h-7 w-7 mb-2 opacity-20" />
      <p className="text-sm">No data in this period.</p>
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => [formatCurrency(v), label]} />
        <Bar dataKey="value" name={label} radius={[3, 3, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Range Filter
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS: { key: Exclude<PresetKey, 'custom'>; label: string }[] = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek',  label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
];

function DateRangeFilter({ value, onChange }: { value: DateRangeState; onChange: (v: DateRangeState) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<DateRange | undefined>({ from: value.from, to: value.to });

  const applyPreset = (key: Exclude<PresetKey, 'custom'>) => {
    const { from, to } = buildPreset(key);
    onChange({ from, to, preset: key }); setOpen(false);
  };
  const applyCustom = () => {
    if (!pending?.from || !pending?.to) return;
    onChange({ from: startOfDay(pending.from), to: endOfDay(pending.to), preset: 'custom' }); setOpen(false);
  };
  const customLabel = value.preset === 'custom'
    ? `${format(value.from, 'dd MMM')} – ${format(value.to, 'dd MMM yyyy')}`
    : 'Custom Range';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESETS.map(p => (
        <Button key={p.key} size="sm" variant={value.preset === p.key ? 'default' : 'outline'} className="h-8 text-xs rounded-lg" onClick={() => applyPreset(p.key)}>
          {p.label}
        </Button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant={value.preset === 'custom' ? 'default' : 'outline'} className="h-8 text-xs rounded-lg gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />{customLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="end">
          <Calendar mode="range" selected={pending} onSelect={setPending} numberOfMonths={2} disabled={(d: Date) => d > new Date()} />
          <div className="flex justify-end mt-3">
            <Button size="sm" onClick={applyCustom} disabled={!pending?.from || !pending?.to}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Source colors (used in Overview + Cash vs Online)
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  Work:       '#4f46e5',
  AEPS:       '#10b981',
  Recharge:   '#f59e0b',
  Transfer:   '#8b5cf6',
  'Quick Work': '#06b6d4',
};

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Overview
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab({
  work, aeps, recharge, transfer, quick, dateRange,
}: {
  work: WorkEntry[]; aeps: AepsWithdrawal[]; recharge: ElectricRecharge[];
  transfer: MoneyTransfer[]; quick: QuickActionEntry[]; dateRange: DateRangeState;
}) {
  const activeWork     = work.filter(e => e.status !== 'Rejected');
  const workCollected  = activeWork.reduce((s, e) => s + e.paidAmount, 0);
  const workChallan    = activeWork.reduce((s, e) => s + getWorkChallan(e), 0);
  const workProfit     = workCollected - workChallan;

  const aepsPaid       = aeps.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const rechargePaid   = recharge.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const transferPaid   = transfer.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const quickPaid      = quick.filter(e => resolveStatus(e.paymentStatus) === 'paid');

  const aepsProfit     = aepsPaid.reduce((s, e) => s + e.profitMargin, 0);
  const rechargeProfit = rechargePaid.reduce((s, e) => s + e.profitMargin, 0);
  const transferProfit = transferPaid.reduce((s, e) => s + e.profitMargin, 0);
  const quickEarned    = quickPaid.reduce((s, e) => s + e.amount, 0);

  const totalDue    = activeWork.reduce((s, e) => s + Math.max(0, e.dueAmount), 0);
  const totalCredit = activeWork.reduce((s, e) => s + (e.dueAmount < 0 ? -e.dueAmount : 0), 0);

  const profitSources = [
    { label: 'Work',       profit: workProfit,     sub: `${formatCurrency(workCollected)} − ${formatCurrency(workChallan)} challan` },
    ...(aepsProfit     > 0 ? [{ label: 'AEPS',       profit: aepsProfit,     sub: `${aepsPaid.length} transactions` }]     : []),
    ...(rechargeProfit > 0 ? [{ label: 'Recharge',   profit: rechargeProfit, sub: `${rechargePaid.length} transactions` }] : []),
    ...(transferProfit > 0 ? [{ label: 'Transfer',   profit: transferProfit, sub: `${transferPaid.length} transactions` }] : []),
    ...(quickEarned    > 0 ? [{ label: 'Quick Work', profit: quickEarned,    sub: `${quickPaid.length} transactions` }]     : []),
  ];
  const totalProfit = profitSources.reduce((s, src) => s + src.profit, 0);

  const breakdownData = profitSources.map(s => ({ name: s.label, profit: Math.round(s.profit) }));

  const trendData = useMemo(() => buildDailyTrend(
    activeWork.map(e => ({ ts: e.date.toDate(), value: e.paidAmount - getWorkChallan(e) })),
    dateRange.from, dateRange.to,
  ), [activeWork, dateRange]);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalProfit)}</div>
            <div className="mt-2 space-y-1">
              {profitSources.map(src => (
                <div key={src.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: SOURCE_COLORS[src.label] ?? '#94a3b8' }} />
                    <span className="text-muted-foreground">{src.label}</span>
                  </span>
                  <span className="font-medium tabular-nums">{formatCurrency(src.profit)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Work Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(workCollected)}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeWork.length} entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outstanding Due</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDue > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>{formatCurrency(totalDue)}</div>
            {totalCredit > 0
              ? <p className="text-xs text-emerald-700 mt-1 font-medium">+ {formatCurrency(totalCredit)} overpaid/credit</p>
              : totalDue === 0 && <p className="text-xs text-muted-foreground mt-1">All cleared</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Challan Spent</CardTitle>
            <IndianRupee className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(workChallan)}</div>
            <p className="text-xs text-muted-foreground mt-1">Govt fees deducted</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit by source */}
      {breakdownData.some(d => d.profit > 0) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Profit by Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(160, breakdownData.length * 44)}>
              <BarChart data={breakdownData} layout="vertical" margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `₹${Number(v).toLocaleString('en-IN')}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Profit']} />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                  {breakdownData.map(d => <Cell key={d.name} fill={SOURCE_COLORS[d.name] ?? '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Daily work profit trend */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Daily Work Profit</CardTitle></CardHeader>
        <CardContent>
          {!trendData.some(d => d.value !== 0) ? (
            <div className="flex flex-col items-center justify-center h-36 text-muted-foreground">
              <TrendingUp className="h-7 w-7 mb-2 opacity-20" />
              <p className="text-sm">No work entries in this period.</p>
            </div>
          ) : trendData.length <= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Profit']} />
                <Bar dataKey="value" fill="#4f46e5" name="Profit" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Profit']} />
                <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={trendData.length <= 14} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Work & Challan
// ─────────────────────────────────────────────────────────────────────────────

function WorkChallanTab({ work }: { work: WorkEntry[] }) {
  const [search, setSearch] = useState('');
  const sort = useSortState('date');
  const Th = makeTh(sort);

  const active   = work.filter(e => e.status !== 'Rejected');
  const rejected = work.filter(e => e.status === 'Rejected');
  const totalCollected = active.reduce((s, e) => s + e.paidAmount, 0);
  const totalChallan   = active.reduce((s, e) => s + getWorkChallan(e), 0);
  const totalRefund    = rejected.reduce((s, e) => s + (e.refundAmount ?? 0), 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return work.filter(e => !search || e.customerName.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || (e.mobile ?? '').includes(q));
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

  const sorted = useMemo(() => sortRows(filtered, sort.col, sort.dir, getValue), [filtered, sort.col, sort.dir, getValue]);

  const exportCSV = () => {
    downloadCSV(`work-challan-${format(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['Date', 'Customer', 'Mobile', 'Category', 'Total Amount', 'Challan', 'Paid', 'Due', 'Status'],
      ...sorted.map(e => [
        format(e.date.toDate(), 'dd/MM/yyyy'), e.customerName, e.mobile,
        e.category === 'Other' && e.otherCategory ? e.otherCategory : e.category,
        String(e.totalAmount), String(getWorkChallan(e)), String(e.paidAmount), String(e.dueAmount), e.status,
      ]),
    ]);
  };

  return (
    <div className="space-y-5">
      <StatCards items={[
        { label: 'Total Entries',   value: String(active.length) },
        { label: 'Total Collected', value: formatCurrency(totalCollected), cls: 'text-emerald-700' },
        { label: 'Total Challan',   value: formatCurrency(totalChallan),   cls: 'text-slate-600' },
        { label: 'Net Profit',      value: formatCurrency(totalCollected - totalChallan), cls: 'text-primary font-bold' },
      ]} />

      {rejected.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
          <X className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-red-700">Rejected/Refunded: </span>
            <span className="text-red-600">{rejected.length} {rejected.length === 1 ? 'entry' : 'entries'}</span>
            {totalRefund > 0 && <span className="text-red-600"> · {formatCurrency(totalRefund)} refunded</span>}
            <p className="text-xs text-red-500 mt-0.5">Not counted in profit figures above.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customer, category…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <Th col="date" label="Date" /><Th col="customer" label="Customer" /><Th col="category" label="Category" />
                <Th col="total" label="Total" align="right" /><Th col="challan" label="Challan" align="right" />
                <Th col="paid" label="Paid" align="right" /><Th col="due" label="Due" align="right" /><Th col="status" label="Status" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{search ? `No entries match "${search}".` : 'No entries in this period.'}</TableCell></TableRow>
              ) : sorted.map(e => {
                const due = e.dueAmount;
                const cat = e.category === 'Other' && e.otherCategory ? e.otherCategory : e.category;
                return (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(e.date.toDate(), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium max-w-[160px] truncate">{e.customerName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs font-normal whitespace-nowrap">{cat}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(e.totalAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">{getWorkChallan(e) > 0 ? formatCurrency(getWorkChallan(e)) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 font-medium">{formatCurrency(e.paidAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {due > 0 ? <span className="text-amber-700 font-medium">{formatCurrency(due)}</span>
                        : due < 0 ? <span className="text-emerald-700 text-xs">+{formatCurrency(-due)} credit</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && <div className="px-4 py-2 border-t text-xs text-muted-foreground">{sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}{search ? ` matching "${search}"` : ''}</div>}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3: Category-wise
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryRow { category: string; count: number; collected: number; challan: number; netProfit: number; }

function CategoryTab({ work }: { work: WorkEntry[] }) {
  const sort = useSortState('count');
  const Th = makeTh(sort);

  const rows = useMemo<CategoryRow[]>(() => {
    const map: Record<string, CategoryRow> = {};
    work.filter(e => e.status !== 'Rejected').forEach(e => {
      const cat = e.category === 'Other' && e.otherCategory ? e.otherCategory : e.category;
      if (!map[cat]) map[cat] = { category: cat, count: 0, collected: 0, challan: 0, netProfit: 0 };
      map[cat].count++; map[cat].collected += e.paidAmount;
      map[cat].challan += getWorkChallan(e); map[cat].netProfit += e.paidAmount - getWorkChallan(e);
    });
    return Object.values(map);
  }, [work]);

  const getValue = useCallback((r: CategoryRow, col: string): string | number => {
    switch (col) {
      case 'category': return r.category; case 'count': return r.count;
      case 'collected': return r.collected; case 'challan': return r.challan;
      case 'profit': return r.netProfit; default: return 0;
    }
  }, []);

  const sorted  = useMemo(() => sortRows(rows, sort.col, sort.dir, getValue), [rows, sort.col, sort.dir, getValue]);
  const totals  = useMemo(() => rows.reduce((a, r) => ({ count: a.count + r.count, collected: a.collected + r.collected, challan: a.challan + r.challan, profit: a.profit + r.netProfit }), { count: 0, collected: 0, challan: 0, profit: 0 }), [rows]);

  const exportCSV = () => {
    downloadCSV(`category-report-${format(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['Category', 'Entries', 'Collected (₹)', 'Challan (₹)', 'Net Profit (₹)'],
      ...sorted.map(r => [r.category, String(r.count), String(r.collected), String(r.challan), String(r.netProfit)]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <Th col="category" label="Category" /><Th col="count" label="Entries" align="right" />
                <Th col="collected" label="Collected" align="right" /><Th col="challan" label="Challan" align="right" />
                <Th col="profit" label="Net Profit" align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0
                ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No entries in this period.</TableCell></TableRow>
                : sorted.map(r => (
                  <TableRow key={r.category} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 font-medium">{formatCurrency(r.collected)}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">{r.challan > 0 ? formatCurrency(r.challan) : '—'}</TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${r.netProfit >= 0 ? 'text-primary' : 'text-red-600'}`}>{formatCurrency(r.netProfit)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/20 flex">
            <div className="flex-1 text-sm font-semibold">Total ({totals.count} entries)</div>
            <div className="w-28 text-right text-sm font-semibold text-emerald-700 pr-4">{formatCurrency(totals.collected)}</div>
            <div className="w-24 text-right text-sm font-semibold text-slate-600 pr-4">{formatCurrency(totals.challan)}</div>
            <div className="w-24 text-right text-sm font-semibold text-primary">{formatCurrency(totals.profit)}</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4: AEPS
// ─────────────────────────────────────────────────────────────────────────────

function AepsTab({ entries, dateRange }: { entries: AepsWithdrawal[]; dateRange: DateRangeState }) {
  const [search, setSearch] = useState('');
  const sort = useSortState('date');
  const Th = makeTh(sort);

  const paid        = entries.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const totalAmount = paid.reduce((s, e) => s + e.amount, 0);
  const totalProfit = paid.reduce((s, e) => s + e.profitMargin, 0);

  const trendData = useMemo(() => buildDailyTrend(paid.map(e => ({ ts: e.createdAt.toDate(), value: e.profitMargin })), dateRange.from, dateRange.to), [paid, dateRange]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => !search || e.customerName.toLowerCase().includes(q) || e.bankName.toLowerCase().includes(q));
  }, [entries, search]);

  const getValue = useCallback((e: AepsWithdrawal, col: string): string | number => {
    switch (col) {
      case 'date': return e.createdAt.toMillis(); case 'customer': return e.customerName;
      case 'bank': return e.bankName; case 'amount': return e.amount; case 'profit': return e.profitMargin;
      default: return 0;
    }
  }, []);

  const sorted = useMemo(() => sortRows(filtered, sort.col, sort.dir, getValue), [filtered, sort.col, sort.dir, getValue]);

  const exportCSV = () => {
    downloadCSV(`aeps-report-${format(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['Date', 'Customer', 'Bank Name', 'Amount (₹)', 'Profit Margin (₹)'],
      ...sorted.map(e => [format(e.createdAt.toDate(), 'dd/MM/yyyy'), e.customerName, e.bankName, String(e.amount), String(e.profitMargin)]),
    ]);
  };

  return (
    <div className="space-y-5">
      <StatCards items={[
        { label: 'Total Withdrawals', value: String(entries.length) },
        { label: 'Total Amount',      value: formatCurrency(totalAmount), cls: 'text-emerald-700' },
        { label: 'Total Profit',      value: formatCurrency(totalProfit), cls: 'text-primary font-bold' },
      ]} />
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Daily Profit Trend</CardTitle></CardHeader>
        <CardContent><DailyTrendChart data={trendData} color="#10b981" label="Profit" /></CardContent></Card>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customer, bank…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <Th col="date" label="Date" /><Th col="customer" label="Customer" /><Th col="bank" label="Bank Name" />
              <Th col="amount" label="Amount" align="right" /><Th col="profit" label="Profit Margin" align="right" />
            </TableRow></TableHeader>
            <TableBody>
              {sorted.length === 0
                ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">{search ? `No entries match "${search}".` : 'No AEPS transactions in this period.'}</TableCell></TableRow>
                : sorted.map(e => (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(e.createdAt.toDate(), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{e.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">{e.bankName}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(e.amount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 font-semibold">{formatCurrency(e.profitMargin)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && <div className="px-4 py-2 border-t text-xs text-muted-foreground">{sorted.length} transactions{search ? ` matching "${search}"` : ''}</div>}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 5: Recharge
// ─────────────────────────────────────────────────────────────────────────────

function RechargeTab({ entries, dateRange }: { entries: ElectricRecharge[]; dateRange: DateRangeState }) {
  const [search, setSearch] = useState('');
  const sort = useSortState('date');
  const Th = makeTh(sort);

  const paid        = entries.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const totalAmount = paid.reduce((s, e) => s + e.rechargeAmount, 0);
  const totalProfit = paid.reduce((s, e) => s + e.profitMargin, 0);

  const trendData = useMemo(() => buildDailyTrend(paid.map(e => ({ ts: e.createdAt.toDate(), value: e.profitMargin })), dateRange.from, dateRange.to), [paid, dateRange]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => !search || e.customerName.toLowerCase().includes(q) || e.consumerNumber.includes(q));
  }, [entries, search]);

  const getValue = useCallback((e: ElectricRecharge, col: string): string | number => {
    switch (col) {
      case 'date': return e.createdAt.toMillis(); case 'customer': return e.customerName;
      case 'consumer': return e.consumerNumber; case 'amount': return e.rechargeAmount; case 'profit': return e.profitMargin;
      default: return 0;
    }
  }, []);

  const sorted = useMemo(() => sortRows(filtered, sort.col, sort.dir, getValue), [filtered, sort.col, sort.dir, getValue]);

  const exportCSV = () => {
    downloadCSV(`recharge-report-${format(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['Date', 'Customer', 'Consumer Number', 'Recharge Amount (₹)', 'Profit Margin (₹)'],
      ...sorted.map(e => [format(e.createdAt.toDate(), 'dd/MM/yyyy'), e.customerName, e.consumerNumber, String(e.rechargeAmount), String(e.profitMargin)]),
    ]);
  };

  return (
    <div className="space-y-5">
      <StatCards items={[
        { label: 'Total Recharges',  value: String(entries.length) },
        { label: 'Total Recharged',  value: formatCurrency(totalAmount), cls: 'text-emerald-700' },
        { label: 'Total Profit',     value: formatCurrency(totalProfit), cls: 'text-primary font-bold' },
      ]} />
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Daily Profit Trend</CardTitle></CardHeader>
        <CardContent><DailyTrendChart data={trendData} color="#f59e0b" label="Profit" /></CardContent></Card>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customer, consumer no…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <Th col="date" label="Date" /><Th col="customer" label="Customer" /><Th col="consumer" label="Consumer No." />
              <Th col="amount" label="Recharge Amt" align="right" /><Th col="profit" label="Profit Margin" align="right" />
            </TableRow></TableHeader>
            <TableBody>
              {sorted.length === 0
                ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">{search ? `No entries match "${search}".` : 'No recharge transactions in this period.'}</TableCell></TableRow>
                : sorted.map(e => (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(e.createdAt.toDate(), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{e.customerName}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{e.consumerNumber}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(e.rechargeAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 font-semibold">{formatCurrency(e.profitMargin)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && <div className="px-4 py-2 border-t text-xs text-muted-foreground">{sorted.length} transactions{search ? ` matching "${search}"` : ''}</div>}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 6: Money Transfer
// ─────────────────────────────────────────────────────────────────────────────

function TransferTab({ entries, dateRange }: { entries: MoneyTransfer[]; dateRange: DateRangeState }) {
  const [search, setSearch] = useState('');
  const sort = useSortState('date');
  const Th = makeTh(sort);

  const paid        = entries.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const totalAmount = paid.reduce((s, e) => s + e.amount, 0);
  const totalProfit = paid.reduce((s, e) => s + e.profitMargin, 0);

  const trendData = useMemo(() => buildDailyTrend(paid.map(e => ({ ts: e.createdAt.toDate(), value: e.profitMargin })), dateRange.from, dateRange.to), [paid, dateRange]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => !search || e.name.toLowerCase().includes(q) || e.mobileOrAccount.includes(q));
  }, [entries, search]);

  const getValue = useCallback((e: MoneyTransfer, col: string): string | number => {
    switch (col) {
      case 'date': return e.createdAt.toMillis(); case 'name': return e.name;
      case 'account': return e.mobileOrAccount; case 'amount': return e.amount; case 'profit': return e.profitMargin;
      default: return 0;
    }
  }, []);

  const sorted = useMemo(() => sortRows(filtered, sort.col, sort.dir, getValue), [filtered, sort.col, sort.dir, getValue]);

  const exportCSV = () => {
    downloadCSV(`transfer-report-${format(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['Date', 'Name', 'Mobile/Account', 'Amount (₹)', 'Profit Margin (₹)'],
      ...sorted.map(e => [format(e.createdAt.toDate(), 'dd/MM/yyyy'), e.name, e.mobileOrAccount, String(e.amount), String(e.profitMargin)]),
    ]);
  };

  return (
    <div className="space-y-5">
      <StatCards items={[
        { label: 'Total Transfers',   value: String(entries.length) },
        { label: 'Total Transferred', value: formatCurrency(totalAmount), cls: 'text-emerald-700' },
        { label: 'Total Profit',      value: formatCurrency(totalProfit), cls: 'text-primary font-bold' },
      ]} />
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Daily Profit Trend</CardTitle></CardHeader>
        <CardContent><DailyTrendChart data={trendData} color="#8b5cf6" label="Profit" /></CardContent></Card>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, mobile/account…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <Th col="date" label="Date" /><Th col="name" label="Name" /><Th col="account" label="Mobile / Account" />
              <Th col="amount" label="Amount" align="right" /><Th col="profit" label="Profit Margin" align="right" />
            </TableRow></TableHeader>
            <TableBody>
              {sorted.length === 0
                ? <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">{search ? `No entries match "${search}".` : 'No transfers in this period.'}</TableCell></TableRow>
                : sorted.map(e => (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(e.createdAt.toDate(), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{e.mobileOrAccount}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(e.amount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 font-semibold">{formatCurrency(e.profitMargin)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && <div className="px-4 py-2 border-t text-xs text-muted-foreground">{sorted.length} transactions{search ? ` matching "${search}"` : ''}</div>}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 7: Quick Work
// ─────────────────────────────────────────────────────────────────────────────

function QuickTab({ entries }: { entries: QuickActionEntry[] }) {
  const sort = useSortState('count');
  const Th = makeTh(sort);

  const paid       = entries.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const grandTotal = paid.reduce((s, e) => s + e.amount, 0);

  const rows = useMemo(() => {
    const map: Record<string, { category: string; count: number; total: number }> = {};
    paid.forEach(e => {
      if (!map[e.category]) map[e.category] = { category: e.category, count: 0, total: 0 };
      map[e.category].count++; map[e.category].total += e.amount;
    });
    return Object.values(map);
  }, [paid]);

  const getValue = useCallback((r: { category: string; count: number; total: number }, col: string): string | number => {
    switch (col) { case 'category': return r.category; case 'count': return r.count; case 'total': return r.total; default: return 0; }
  }, []);

  const sorted = useMemo(() => sortRows(rows, sort.col, sort.dir, getValue), [rows, sort.col, sort.dir, getValue]);

  const exportCSV = () => {
    downloadCSV(`quick-work-report-${format(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['Category', 'Count', 'Total Amount (₹)'],
      ...sorted.map(r => [r.category, String(r.count), String(r.total)]),
    ]);
  };

  return (
    <div className="space-y-5">
      <StatCards items={[
        { label: 'Total Transactions', value: String(entries.length) },
        { label: 'Paid Transactions',  value: String(paid.length) },
        { label: 'Total Earned',       value: formatCurrency(grandTotal), cls: 'text-primary font-bold' },
      ]} />
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <Th col="category" label="Category" />
              <Th col="count" label="Count" align="right" />
              <Th col="total" label="Total Amount" align="right" />
            </TableRow></TableHeader>
            <TableBody>
              {sorted.length === 0
                ? <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground">No quick action work in this period.</TableCell></TableRow>
                : sorted.map(r => (
                  <TableRow key={r.category} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 font-semibold">{formatCurrency(r.total)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {sorted.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/20 flex justify-between text-sm font-semibold">
            <span>Total ({paid.length} transactions)</span>
            <span className="text-primary">{formatCurrency(grandTotal)}</span>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 8: Cash vs Online
// ─────────────────────────────────────────────────────────────────────────────

interface CashOnlineRow {
  module: string;
  cash: number;
  online: number;
  total: number;
}

const PIE_COLORS = { Cash: '#10b981', Online: '#3b82f6' };

function CashOnlineTab({
  work, aeps, recharge, transfer, quick,
}: {
  work: WorkEntry[]; aeps: AepsWithdrawal[]; recharge: ElectricRecharge[];
  transfer: MoneyTransfer[]; quick: QuickActionEntry[];
}) {
  // For each module: group collected amounts into Cash vs Online
  // Anything without paymentMode, or with 'Due'/'None', defaults to Cash
  const rows = useMemo<CashOnlineRow[]>(() => {
    const calc = (items: { mode: string | undefined; amount: number }[]): { cash: number; online: number } => {
      let cash = 0, online = 0;
      items.forEach(({ mode, amount }) => {
        if (isOnline(mode)) online += amount;
        else cash += amount;
      });
      return { cash, online };
    };

    const workActive = work.filter(e => e.status !== 'Rejected');
    const workTotals = calc(workActive.map(e => ({ mode: e.paymentMode, amount: e.paidAmount })));

    const aepsPaid = aeps.filter(e => resolveStatus(e.paymentStatus) === 'paid');
    const aepsTotals = calc(aepsPaid.map(e => ({ mode: e.paymentMode, amount: e.amount })));

    const rechargePaid = recharge.filter(e => resolveStatus(e.paymentStatus) === 'paid');
    const rechargeTotals = calc(rechargePaid.map(e => ({ mode: e.paymentMode, amount: e.rechargeAmount })));

    const transferPaid = transfer.filter(e => resolveStatus(e.paymentStatus) === 'paid');
    const transferTotals = calc(transferPaid.map(e => ({ mode: e.paymentMode, amount: e.amount })));

    const quickPaid = quick.filter(e => resolveStatus(e.paymentStatus) === 'paid');
    const quickTotals = calc(quickPaid.map(e => ({ mode: e.paymentMode, amount: e.amount })));

    return [
      { module: 'Work',         ...workTotals,     total: workTotals.cash + workTotals.online },
      { module: 'AEPS',         ...aepsTotals,     total: aepsTotals.cash + aepsTotals.online },
      { module: 'Recharge',     ...rechargeTotals, total: rechargeTotals.cash + rechargeTotals.online },
      { module: 'Money Transfer', ...transferTotals, total: transferTotals.cash + transferTotals.online },
      { module: 'Quick Work',   ...quickTotals,    total: quickTotals.cash + quickTotals.online },
    ].filter(r => r.total > 0);
  }, [work, aeps, recharge, transfer, quick]);

  const grandCash   = rows.reduce((s, r) => s + r.cash, 0);
  const grandOnline = rows.reduce((s, r) => s + r.online, 0);
  const grandTotal  = grandCash + grandOnline;

  const pieData = [
    { name: 'Cash',   value: grandCash },
    { name: 'Online', value: grandOnline },
  ].filter(d => d.value > 0);

  const exportCSV = () => {
    downloadCSV(`cash-vs-online-${format(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['Module', 'Cash (₹)', 'Online (₹)', 'Total (₹)'],
      ...rows.map(r => [r.module, String(r.cash), String(r.online), String(r.total)]),
      ['TOTAL', String(grandCash), String(grandOnline), String(grandTotal)],
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Grand totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Cash</CardTitle>
            <Banknote className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{formatCurrency(grandCash)}</div>
            {grandTotal > 0 && <p className="text-xs text-muted-foreground mt-1">{Math.round((grandCash / grandTotal) * 100)}% of total collected</p>}
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Online</CardTitle>
            <Wifi className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{formatCurrency(grandOnline)}</div>
            {grandTotal > 0 && <p className="text-xs text-muted-foreground mt-1">{Math.round((grandOnline / grandTotal) * 100)}% of total collected</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Collected</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(grandTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">All modules combined</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cash vs Online Split</CardTitle></CardHeader>
          <CardContent>
            {grandTotal === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
                <IndianRupee className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No collections in this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={88}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map(d => <Cell key={d.name} fill={PIE_COLORS[d.name as keyof typeof PIE_COLORS] ?? '#94a3b8'} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Module bar chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Module</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
                <p className="text-sm">No data in this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rows} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="module" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
                  <Legend />
                  <Bar dataKey="cash"   name="Cash"   fill="#10b981" stackId="a" radius={[0,0,0,0]} />
                  <Bar dataKey="online" name="Online" fill="#3b82f6" stackId="a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown table */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1.5"><Banknote className="h-3.5 w-3.5 text-emerald-600" />Cash</span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1.5"><Wifi className="h-3.5 w-3.5 text-blue-600" />Online</span>
                </TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0
                ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No collections in this period.</TableCell></TableRow>
                : rows.map(r => (
                  <TableRow key={r.module} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{r.module}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 font-medium">{r.cash > 0 ? formatCurrency(r.cash) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums text-blue-700 font-medium">{r.online > 0 ? formatCurrency(r.online) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(r.total)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {rows.length > 0 && (
          <div className="px-4 py-3 border-t bg-muted/20 flex">
            <div className="flex-1 text-sm font-semibold">Grand Total</div>
            <div className="w-32 text-right text-sm font-semibold text-emerald-700 pr-4">{formatCurrency(grandCash)}</div>
            <div className="w-32 text-right text-sm font-semibold text-blue-700 pr-4">{formatCurrency(grandOnline)}</div>
            <div className="w-28 text-right text-sm font-semibold text-primary">{formatCurrency(grandTotal)}</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview',   label: 'Overview' },
  { key: 'work',       label: 'Work & Challan' },
  { key: 'category',   label: 'Category-wise' },
  { key: 'aeps',       label: 'AEPS' },
  { key: 'recharge',   label: 'Recharge' },
  { key: 'transfer',   label: 'Money Transfer' },
  { key: 'quick',      label: 'Quick Work' },
  { key: 'cashonline', label: 'Cash vs Online' },
];

export default function ReportsPage() {
  const { isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [workEntries,     setWorkEntries]     = useState<WorkEntry[]>([]);
  const [aepsEntries,     setAepsEntries]     = useState<AepsWithdrawal[]>([]);
  const [rechargeEntries, setRechargeEntries] = useState<ElectricRecharge[]>([]);
  const [transferEntries, setTransferEntries] = useState<MoneyTransfer[]>([]);
  const [quickEntries,    setQuickEntries]    = useState<QuickActionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRangeState>(() => {
    const { from, to } = buildPreset('thisMonth');
    return { from, to, preset: 'thisMonth' };
  });

  useEffect(() => {
    let resolved = 0;
    const done = () => { if (++resolved === 5) setLoading(false); };
    const u1 = subscribeToWorkEntries(d => { setWorkEntries(d); done(); });
    const u2 = subscribeToAepsWithdrawals(d => { setAepsEntries(d); done(); });
    const u3 = subscribeToElectricRecharges(d => { setRechargeEntries(d); done(); });
    const u4 = subscribeToMoneyTransfers(d => { setTransferEntries(d); done(); });
    const u5 = subscribeToQuickActions(d => { setQuickEntries(d); done(); }, () => done());
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  // Filter every collection to the selected date range
  const fw = useMemo(() => workEntries    .filter(e => inRange(e.date.toDate(),      dateRange.from, dateRange.to)), [workEntries,     dateRange]);
  const fa = useMemo(() => aepsEntries    .filter(e => inRange(e.createdAt.toDate(), dateRange.from, dateRange.to)), [aepsEntries,     dateRange]);
  const fr = useMemo(() => rechargeEntries.filter(e => inRange(e.createdAt.toDate(), dateRange.from, dateRange.to)), [rechargeEntries, dateRange]);
  const ft = useMemo(() => transferEntries.filter(e => inRange(e.createdAt.toDate(), dateRange.from, dateRange.to)), [transferEntries, dateRange]);
  const fq = useMemo(() => quickEntries   .filter(e => inRange(e.createdAt.toDate(), dateRange.from, dateRange.to)), [quickEntries,    dateRange]);

  // ── Access guard ────────────────────────────────────────────────────────────
  if (!isOwner) return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">Access Restricted</h2>
      <p className="text-muted-foreground max-w-xs">Reports are only visible to the Owner.</p>
    </div>
  );

  if (loading) return (
    <div className="space-y-6 max-w-6xl">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-1 flex-wrap">{TABS.map((_, i) => <Skeleton key={i} className="h-10 w-24 rounded" />)}</div>
      <div className="flex gap-2 flex-wrap">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-24 rounded-lg" />)}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--app-font-display)' }}>Reports</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Earnings, collections, and service analytics</p>
      </div>

      {/* Tab bar — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center border-b min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global date range filter */}
      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Tab content */}
      {activeTab === 'overview'   && <OverviewTab    work={fw} aeps={fa} recharge={fr} transfer={ft} quick={fq} dateRange={dateRange} />}
      {activeTab === 'work'       && <WorkChallanTab work={fw} />}
      {activeTab === 'category'   && <CategoryTab   work={fw} />}
      {activeTab === 'aeps'       && <AepsTab        entries={fa} dateRange={dateRange} />}
      {activeTab === 'recharge'   && <RechargeTab    entries={fr} dateRange={dateRange} />}
      {activeTab === 'transfer'   && <TransferTab    entries={ft} dateRange={dateRange} />}
      {activeTab === 'quick'      && <QuickTab       entries={fq} />}
      {activeTab === 'cashonline' && <CashOnlineTab  work={fw} aeps={fa} recharge={fr} transfer={ft} quick={fq} />}
    </div>
  );
}
