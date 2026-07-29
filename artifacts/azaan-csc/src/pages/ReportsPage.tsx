import { useState, useEffect, useMemo } from 'react';
import {
  WorkEntry, subscribeToWorkEntries,
  subscribeToAepsWithdrawals, AepsWithdrawal,
  subscribeToElectricRecharges, ElectricRecharge,
  subscribeToMoneyTransfers, MoneyTransfer,
  subscribeToQuickActions, QuickActionEntry,
  subscribeToPaymentHistory, PaymentHistoryRecord,
} from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, isWithinInterval, format, subMonths } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IndianRupee, TrendingUp, FileText, Receipt,
  Banknote, Wifi, Clock, X, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { resolveStatus } from '@/lib/payments';

// ── Helpers ──────────────────────────────────────────────────────────────────

function month(offset = 0) {
  const base = offset === 0 ? new Date() : subMonths(new Date(), -offset);
  return { start: startOfMonth(base), end: endOfMonth(base), label: format(base, 'MMMM yyyy') };
}

function inRange(d: Date, start: Date, end: Date) {
  return isWithinInterval(d, { start, end });
}

function SummaryCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const PIE_COLORS: Record<string, string> = {
  Cash: '#10b981',
  Online: '#3b82f6',
  Due: '#f59e0b',
  None: '#94a3b8',
};

function PaymentPieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
      <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
      <p className="text-sm">No data</p>
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {data.map(entry => (
            <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? '#cbd5e1'} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [v, 'Entries']} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── 4-way payment mode breakdown ──────────────────────────────────────────────

interface PaymentModeStats {
  Cash: number;
  Online: number;
  Due: number;
  None: number;
}

function emptyStats(): PaymentModeStats { return { Cash: 0, Online: 0, Due: 0, None: 0 }; }

function countMode(mode: string | undefined): keyof PaymentModeStats {
  if (mode === 'Online') return 'Online';
  if (mode === 'Due') return 'Due';
  if (mode === 'None') return 'None';
  return 'Cash'; // default for legacy entries
}

function modeStatsToChartData(stats: PaymentModeStats) {
  return [
    { name: 'Cash', value: stats.Cash },
    { name: 'Online', value: stats.Online },
    { name: 'Due', value: stats.Due },
    { name: 'None', value: stats.None },
  ].filter(d => d.value > 0);
}

function PaymentModeBreakdown({ stats, title }: { stats: PaymentModeStats; title: string }) {
  const total = stats.Cash + stats.Online + stats.Due + stats.None;
  if (total === 0) return null;
  return (
    <div className="text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {([
          { key: 'Cash', color: 'bg-emerald-100 text-emerald-700', icon: Banknote },
          { key: 'Online', color: 'bg-blue-100 text-blue-700', icon: Wifi },
          { key: 'Due', color: 'bg-amber-100 text-amber-700', icon: Clock },
          { key: 'None', color: 'bg-slate-100 text-slate-600', icon: X },
        ] as const).map(({ key, color, icon: Icon }) => (
          <div key={key} className={`rounded-lg px-2 py-1.5 flex flex-col items-center ${color}`}>
            <Icon className="h-3 w-3 mb-0.5" />
            <span className="text-xs font-medium">{key}</span>
            <span className="text-lg font-bold leading-tight">{stats[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { isOwner, canAccessFinancialServices } = useAuth();

  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [aepsEntries, setAepsEntries] = useState<AepsWithdrawal[]>([]);
  const [rechargeEntries, setRechargeEntries] = useState<ElectricRecharge[]>([]);
  const [transferEntries, setTransferEntries] = useState<MoneyTransfer[]>([]);
  const [quickEntries, setQuickEntries] = useState<QuickActionEntry[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Month selector: 0 = current, -1 = last month, etc.
  const [monthOffset, setMonthOffset] = useState(0);
  const selectedMonth = month(monthOffset);

  useEffect(() => {
    let resolved = 0;
    const done = () => { resolved++; if (resolved === 6) setLoading(false); };
    const u1 = subscribeToWorkEntries(d => { setWorkEntries(d); done(); });
    const u2 = subscribeToAepsWithdrawals(d => { setAepsEntries(d); done(); });
    const u3 = subscribeToElectricRecharges(d => { setRechargeEntries(d); done(); });
    const u4 = subscribeToMoneyTransfers(d => { setTransferEntries(d); done(); });
    const u5 = subscribeToQuickActions(
      d => { setQuickEntries(d); done(); },
      (err) => { done(); setFirestoreError(`Quick Action Work: ${err.message}`); },
    );
    const u6 = subscribeToPaymentHistory(
      d => { setPaymentHistory(d); done(); },
      (err) => { done(); setFirestoreError(`Payment History: ${err.message}`); },
    );
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
  }, []);

  const { start, end } = selectedMonth;

  // ── WORK ENTRIES this month ───────────────────────────────────────────────
  const work = useMemo(() => workEntries.filter(e => inRange(e.date.toDate(), start, end)), [workEntries, start, end]);

  const workCompleted = work.filter(e => e.status === 'Completed');
  const workPending = work.filter(e => e.status === 'Pending');
  const workRejected = work.filter(e => e.status === 'Rejected');

  const workEarned = work.filter(e => e.status !== 'Rejected').reduce((s, e) => s + e.paidAmount, 0);
  const workDue = work.filter(e => e.status !== 'Rejected').reduce((s, e) => s + Math.max(0, e.dueAmount), 0);
  // Use final challan = original + any challan adjustments
  const workChallan = work.reduce((s, e) => s + (e.challanAmount ?? 0) + (e.netAdjustmentChallan ?? 0), 0);
  const workProfit = workEarned - workChallan;

  // 4-way mode breakdown for work
  const workModeStats = useMemo(() => {
    const s = emptyStats();
    work.filter(e => e.status !== 'Rejected').forEach(e => { s[countMode(e.paymentMode)]++; });
    return s;
  }, [work]);

  // Top 5 categories by count
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; earned: number }> = {};
    work.forEach(e => {
      if (!map[e.category]) map[e.category] = { count: 0, earned: 0 };
      map[e.category].count++;
      if (e.status !== 'Rejected') map[e.category].earned += e.paidAmount;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 7);
  }, [work]);

  // ── QUICK ACTIONS this month ──────────────────────────────────────────────
  const quick = useMemo(() => quickEntries.filter(e => inRange(e.createdAt.toDate(), start, end)), [quickEntries, start, end]);
  const quickPaid = quick.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const quickEarned = quickPaid.reduce((s, e) => s + e.amount, 0);
  const quickModeStats = useMemo(() => {
    const s = emptyStats();
    quick.forEach(e => { s[countMode(e.paymentMode)]++; });
    return s;
  }, [quick]);

  const quickByCat = useMemo(() => {
    const map: Record<string, { count: number; earned: number }> = {};
    quick.forEach(e => {
      if (!map[e.category]) map[e.category] = { count: 0, earned: 0 };
      map[e.category].count++;
      if (resolveStatus(e.paymentStatus) === 'paid') map[e.category].earned += e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [quick]);

  // ── FINANCIAL SERVICES this month ────────────────────────────────────────
  const aeps = useMemo(() => aepsEntries.filter(e => inRange(e.createdAt.toDate(), start, end)), [aepsEntries, start, end]);
  const recharge = useMemo(() => rechargeEntries.filter(e => inRange(e.createdAt.toDate(), start, end)), [rechargeEntries, start, end]);
  const transfer = useMemo(() => transferEntries.filter(e => inRange(e.createdAt.toDate(), start, end)), [transferEntries, start, end]);

  const aepsPaid = aeps.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const rechargePaid = recharge.filter(e => resolveStatus(e.paymentStatus) === 'paid');
  const transferPaid = transfer.filter(e => resolveStatus(e.paymentStatus) === 'paid');

  const aepsProfit = aepsPaid.reduce((s, e) => s + e.profitMargin, 0);
  const rechargeProfit = rechargePaid.reduce((s, e) => s + e.profitMargin, 0);
  const transferProfit = transferPaid.reduce((s, e) => s + e.profitMargin, 0);

  // Mode breakdowns for financial services
  const aepsModeStats = useMemo(() => { const s = emptyStats(); aeps.forEach(e => { s[countMode(e.paymentMode)]++; }); return s; }, [aeps]);
  const rechargeModeStats = useMemo(() => { const s = emptyStats(); recharge.forEach(e => { s[countMode(e.paymentMode)]++; }); return s; }, [recharge]);
  const transferModeStats = useMemo(() => { const s = emptyStats(); transfer.forEach(e => { s[countMode(e.paymentMode)]++; }); return s; }, [transfer]);

  // ── DUE SETTLEMENTS this month ───────────────────────────────────────────
  const settlements = useMemo(() => paymentHistory.filter(r => inRange(r.settledAt.toDate(), start, end)), [paymentHistory, start, end]);
  const settledCash = settlements.filter(r => r.mode === 'Cash').reduce((s, r) => s + r.amount, 0);
  const settledOnline = settlements.filter(r => r.mode === 'Online').reduce((s, r) => s + r.amount, 0);

  // ── GRAND TOTALS ─────────────────────────────────────────────────────────
  const totalProfit = workProfit + quickEarned + aepsProfit + rechargeProfit + transferProfit;
  const totalPendingDue = workDue +
    aeps.filter(e => resolveStatus(e.paymentStatus) === 'pending').reduce((s, e) => s + e.amount, 0) +
    recharge.filter(e => resolveStatus(e.paymentStatus) === 'pending').reduce((s, e) => s + e.rechargeAmount, 0) +
    transfer.filter(e => resolveStatus(e.paymentStatus) === 'pending').reduce((s, e) => s + e.amount, 0) +
    quick.filter(e => resolveStatus(e.paymentStatus) === 'pending').reduce((s, e) => s + e.amount, 0);

  // ── 6-MONTH TREND ────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const m = month(-(5 - i));
      const workE = workEntries.filter(e => inRange(e.date.toDate(), m.start, m.end) && e.status !== 'Rejected').reduce((s, e) => s + e.paidAmount, 0);
      const quickE = quickEntries.filter(e => inRange(e.createdAt.toDate(), m.start, m.end) && resolveStatus(e.paymentStatus) === 'paid').reduce((s, e) => s + e.amount, 0);
      const aepsP = aepsEntries.filter(e => inRange(e.createdAt.toDate(), m.start, m.end) && resolveStatus(e.paymentStatus) === 'paid').reduce((s, e) => s + e.profitMargin, 0);
      const rechargeP = rechargeEntries.filter(e => inRange(e.createdAt.toDate(), m.start, m.end) && resolveStatus(e.paymentStatus) === 'paid').reduce((s, e) => s + e.profitMargin, 0);
      const transferP = transferEntries.filter(e => inRange(e.createdAt.toDate(), m.start, m.end) && resolveStatus(e.paymentStatus) === 'paid').reduce((s, e) => s + e.profitMargin, 0);
      return {
        month: format(m.start, 'MMM yy'),
        Work: Math.round(workE),
        'Quick Work': Math.round(quickE),
        ...(canAccessFinancialServices ? { AEPS: Math.round(aepsP), Recharge: Math.round(rechargeP), Transfer: Math.round(transferP) } : {}),
      };
    });
  }, [workEntries, quickEntries, aepsEntries, rechargeEntries, transferEntries, canAccessFinancialServices]);

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
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl">
      {firestoreError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <X className="h-4 w-4 shrink-0" />
          <span><strong>Data error:</strong> {firestoreError}. Some report data may be incomplete. Check Firestore rules.</span>
        </div>
      )}
      {/* Header + Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--app-font-display)' }}>Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Month-wise earnings, payments, and due tracking</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
          <Button size="sm" variant={monthOffset === -1 ? 'default' : 'ghost'} className="rounded-lg h-8 text-xs" onClick={() => setMonthOffset(-1)}>
            {format(subMonths(new Date(), 1), 'MMM yyyy')}
          </Button>
          <Button size="sm" variant={monthOffset === 0 ? 'default' : 'ghost'} className="rounded-lg h-8 text-xs" onClick={() => setMonthOffset(0)}>
            {format(new Date(), 'MMM yyyy')} ●
          </Button>
        </div>
      </div>

      {/* ── GRAND SUMMARY CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Work Earned" value={formatCurrency(workEarned)} sub={`${work.length} entries`} icon={IndianRupee} color="bg-indigo-50 text-indigo-600" />
        <SummaryCard label="Work Profit (net)" value={formatCurrency(workProfit)} sub={`Challan deducted: ${formatCurrency(workChallan)}`} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
        <SummaryCard label="Quick Work Earned" value={formatCurrency(quickEarned)} sub={`${quick.length} entries (paid)`} icon={IndianRupee} color="bg-sky-50 text-sky-600" />
        <SummaryCard
          label="Total Pending Dues"
          value={formatCurrency(totalPendingDue)}
          sub="All sources combined"
          icon={Clock}
          color={`${totalPendingDue > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}
        />
      </div>

      {/* ── WORK ENTRIES BREAKDOWN ──────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Work Entries — {selectedMonth.label}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 py-3">
                  <div className="text-2xl font-bold text-emerald-700">{workCompleted.length}</div>
                  <div className="text-xs text-emerald-600 font-medium">Completed</div>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 py-3">
                  <div className="text-2xl font-bold text-amber-700">{workPending.length}</div>
                  <div className="text-xs text-amber-600 font-medium">Pending</div>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 py-3">
                  <div className="text-2xl font-bold text-red-700">{workRejected.length}</div>
                  <div className="text-xs text-red-600 font-medium">Rejected</div>
                </div>
              </div>
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-muted-foreground">Due outstanding</span>
                <span className={`font-semibold ${workDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{formatCurrency(workDue)}</span>
              </div>
              <PaymentModeBreakdown stats={workModeStats} title="Payment Mode Breakdown" />
            </CardContent>
          </Card>

          {/* Payment mode pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Payment Mode Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentPieChart data={modeStatsToChartData(workModeStats)} />
            </CardContent>
          </Card>
        </div>

        {/* Category chart */}
        {categoryBreakdown.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Categories — Earned vs Count</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryBreakdown.map(([cat, v]) => ({ category: cat.substring(0, 14), count: v.count, earned: v.earned }))}
                  margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number, n: string) => [n === 'earned' ? formatCurrency(v) : v, n === 'earned' ? 'Earned' : 'Count']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="earned" fill="#4f46e5" name="Earned (₹)" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="right" dataKey="count" fill="#94a3b8" name="Count" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── QUICK ACTION WORK ──────────────────────────────────────── */}
      {quick.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Action Work — {selectedMonth.label}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickByCat.map(([cat, v]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{cat}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{v.count} entries</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(v.earned)}</span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(quickEarned)}</span>
                </div>
                <PaymentModeBreakdown stats={quickModeStats} title="Payment Modes" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Payment Mode Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentPieChart data={modeStatsToChartData(quickModeStats)} />
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ── FINANCIAL SERVICES ────────────────────────────────────── */}
      {canAccessFinancialServices && (aeps.length > 0 || recharge.length > 0 || transfer.length > 0) && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Financial Services — {selectedMonth.label}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* AEPS */}
            {aeps.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">AEPS Withdrawal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total processed</span>
                    <span className="font-semibold">{aepsPaid.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profit earned</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(aepsProfit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entries</span>
                    <span>{aeps.length} total, {aepsPaid.length} paid</span>
                  </div>
                  <PaymentModeBreakdown stats={aepsModeStats} title="Mode Breakdown" />
                </CardContent>
              </Card>
            )}

            {/* Recharge */}
            {recharge.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Electric Recharge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total recharge</span>
                    <span className="font-semibold">{formatCurrency(rechargePaid.reduce((s, e) => s + e.rechargeAmount, 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profit earned</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(rechargeProfit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entries</span>
                    <span>{recharge.length} total, {rechargePaid.length} paid</span>
                  </div>
                  <PaymentModeBreakdown stats={rechargeModeStats} title="Mode Breakdown" />
                </CardContent>
              </Card>
            )}

            {/* Transfer */}
            {transfer.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Money Transfer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total transferred</span>
                    <span className="font-semibold">{formatCurrency(transferPaid.reduce((s, e) => s + e.amount, 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profit earned</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(transferProfit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entries</span>
                    <span>{transfer.length} total, {transferPaid.length} paid</span>
                  </div>
                  <PaymentModeBreakdown stats={transferModeStats} title="Mode Breakdown" />
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* ── DUE SETTLEMENTS ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Due Settlements — {selectedMonth.label}
        </h2>
        {settlements.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No due settlements recorded this month.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm">Settled Previously Due Payments</CardTitle>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Banknote className="h-3 w-3 text-emerald-600" /> Cash: <strong>{formatCurrency(settledCash)}</strong></span>
                  <span className="flex items-center gap-1"><Wifi className="h-3 w-3 text-blue-600" /> Online: <strong>{formatCurrency(settledOnline)}</strong></span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">Settled At</th>
                      <th className="text-left py-2 pr-4 font-medium">Customer</th>
                      <th className="text-left py-2 pr-4 font-medium">Type</th>
                      <th className="text-right py-2 pr-4 font-medium">Amount</th>
                      <th className="text-left py-2 pr-4 font-medium">Via</th>
                      <th className="text-left py-2 font-medium">Settled By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {settlements.map(r => (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap text-xs">
                          {format(r.settledAt.toDate(), 'dd MMM yyyy HH:mm')}
                        </td>
                        <td className="py-2.5 pr-4 font-medium">{r.customerName || '—'}</td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs text-muted-foreground capitalize">{r.entryType}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">{formatCurrency(r.amount)}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${r.mode === 'Cash' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {r.mode === 'Cash' ? <Banknote className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                            {r.mode}
                          </span>
                        </td>
                        <td className="py-2.5 text-muted-foreground text-xs italic">{r.settledBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── GRAND PROFIT SUMMARY ────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Grand Profit Summary — {selectedMonth.label}</h2>
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Work Profit (net of challan)</span><span className="font-semibold">{formatCurrency(workProfit)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Quick Work Earnings</span><span className="font-semibold">{formatCurrency(quickEarned)}</span></div>
            {canAccessFinancialServices && (
              <>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">AEPS Profit</span><span className="font-semibold">{formatCurrency(aepsProfit)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Electric Recharge Profit</span><span className="font-semibold">{formatCurrency(rechargeProfit)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Money Transfer Profit</span><span className="font-semibold">{formatCurrency(transferProfit)}</span></div>
              </>
            )}
            <div className="flex justify-between text-base font-bold border-t pt-3">
              <span>Total Profit</span>
              <span className="text-primary">{formatCurrency(totalProfit)}</span>
            </div>
            {totalPendingDue > 0 && (
              <div className="flex justify-between text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Pending Dues (all sources)</span>
                <span className="font-bold">{formatCurrency(totalPendingDue)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── 6-MONTH TREND ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">6-Month Trend</h2>
        <Card>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
                <Legend />
                <Bar dataKey="Work" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Quick Work" stackId="a" fill="#06b6d4" />
                {canAccessFinancialServices && (
                  <>
                    <Bar dataKey="AEPS" stackId="a" fill="#10b981" />
                    <Bar dataKey="Recharge" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Transfer" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* ── PAYMENT RECEIPTS SUMMARY ─────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cash vs Online Receipts — {selectedMonth.label}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Cash Collected</CardTitle>
              <Banknote className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">
                {formatCurrency(
                  work.filter(e => (e.paymentMode ?? 'Cash') === 'Cash' && e.status !== 'Rejected').reduce((s, e) => s + e.paidAmount, 0) +
                  quick.filter(e => (e.paymentMode ?? 'Cash') === 'Cash' && resolveStatus(e.paymentStatus) === 'paid').reduce((s, e) => s + e.amount, 0) +
                  settledCash
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Work + Quick + Settlements</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Online Collected</CardTitle>
              <Wifi className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(
                  work.filter(e => e.paymentMode === 'Online' && e.status !== 'Rejected').reduce((s, e) => s + e.paidAmount, 0) +
                  quick.filter(e => e.paymentMode === 'Online' && resolveStatus(e.paymentStatus) === 'paid').reduce((s, e) => s + e.amount, 0) +
                  settledOnline
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Work + Quick + Settlements</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Challan (Govt Fees)</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(workChallan)}</div>
              <p className="text-xs text-muted-foreground mt-1">Deducted from work profit</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
