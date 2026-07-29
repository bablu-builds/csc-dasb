import { useState, useEffect } from 'react';
import {
  WorkEntry, subscribeToWorkEntries, updateWorkEntry,
  subscribeToAepsWithdrawals, AepsWithdrawal,
  subscribeToElectricRecharges, ElectricRecharge,
  subscribeToMoneyTransfers, MoneyTransfer,
  subscribeToQuickActions, QuickActionEntry,
} from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { isToday, isThisMonth, differenceInDays, subDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IndianRupee, Users, Clock, AlertTriangle, FileText, XCircle, TrendingUp,
  CheckCircle2, Phone, Loader2,
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { resolveStatus } from '@/lib/payments';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Premium stat card (gradient) ───────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, gradient }: {
  label: string; value: string; sub: string; icon: React.ElementType; gradient: string;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-card hover:shadow-card-hover transition-shadow">
      <div className={`${gradient} p-4 text-white`}>
        <div className="flex justify-between items-start mb-3">
          <p className="text-white/75 text-xs font-medium uppercase tracking-wide">{label}</p>
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-white/65 text-xs mt-1.5">{sub}</p>
      </div>
    </Card>
  );
}

// ── Reminder row ───────────────────────────────────────────────────
function ReminderRow({ entry, onComplete, completing }: {
  entry: WorkEntry & { daysPending: number };
  onComplete: () => void;
  completing: boolean;
}) {
  const isVeryUrgent = entry.daysPending >= 7;
  const isUrgent = entry.daysPending >= 3;
  return (
    <div className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors
      ${isVeryUrgent ? 'bg-red-50/70' : isUrgent ? 'bg-amber-50/70' : 'bg-blue-50/40'}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm">{entry.customerName}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />{entry.mobile}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs font-normal py-0">
            {entry.category === 'Other' && entry.otherCategory ? entry.otherCategory : entry.category}
          </Badge>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border
            ${isVeryUrgent ? 'text-red-700 bg-red-100 border-red-200' :
              isUrgent ? 'text-amber-700 bg-amber-100 border-amber-200' :
              'text-blue-700 bg-blue-100 border-blue-200'}`}>
            {entry.daysPending > 0 ? `${entry.daysPending}d pending` : 'Added today'}
          </span>
          {entry.dueAmount > 0 && (
            <span className="text-xs font-semibold text-red-600">Due: {formatCurrency(entry.dueAmount)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline"
          className="h-7 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          onClick={onComplete} disabled={completing}>
          {completing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Complete
        </Button>
        <Link href={`/work/${entry.id}/edit`}>
          <Button size="sm" variant="ghost" className="h-7 text-xs">Edit</Button>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [aepsEntries, setAepsEntries] = useState<AepsWithdrawal[]>([]);
  const [rechargeEntries, setRechargeEntries] = useState<ElectricRecharge[]>([]);
  const [transferEntries, setTransferEntries] = useState<MoneyTransfer[]>([]);
  const [quickEntries, setQuickEntries] = useState<QuickActionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const { isOwner, canAccessFinancialServices } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Use a Set so each source only contributes once to the "all loaded" count,
    // even if its listener fires multiple times. A 10-second timeout ensures
    // the skeleton never freezes permanently (e.g. due to Firestore permission errors).
    const loaded = new Set<string>();
    const done = (key: string) => {
      loaded.add(key);
      if (loaded.size >= 5) setLoading(false);
    };
    const timer = setTimeout(() => setLoading(false), 10_000);

    const u1 = subscribeToWorkEntries((d) => { setWorkEntries(d); done('work'); });
    const u2 = subscribeToAepsWithdrawals((d) => { setAepsEntries(d); done('aeps'); });
    const u3 = subscribeToElectricRecharges((d) => { setRechargeEntries(d); done('recharge'); });
    const u4 = subscribeToMoneyTransfers((d) => { setTransferEntries(d); done('transfer'); });
    const u5 = subscribeToQuickActions(
      (d) => { setQuickEntries(d); done('quick'); },
      (err) => { done('quick'); setFirestoreError(`Quick Action Work: ${err.message}`); },
    );
    return () => { clearTimeout(timer); u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const today = new Date();

  // ── Earnings (exclude pending/free) ──────────────────────────────────────

  // Work: paidAmount already reflects actual collected cash (0 for Due entries)
  const todayWork = workEntries.filter(e => isToday(e.date.toDate()) && e.status !== 'Rejected');
  const workTodayEarning = todayWork.reduce((s, e) => s + e.paidAmount, 0);
  const workMonthEarning = workEntries
    .filter(e => isThisMonth(e.date.toDate()) && e.status !== 'Rejected')
    .reduce((s, e) => s + e.paidAmount, 0);

  // Quick Action Work — exclude pending/free entries
  const todayQuickEarning = quickEntries
    .filter(e => isToday(e.createdAt.toDate()) && resolveStatus(e.paymentStatus) === 'paid')
    .reduce((s, e) => s + e.amount, 0);
  const monthQuickEarning = quickEntries
    .filter(e => isThisMonth(e.createdAt.toDate()) && resolveStatus(e.paymentStatus) === 'paid')
    .reduce((s, e) => s + e.amount, 0);

  const todaysEarning = workTodayEarning + todayQuickEarning;
  const monthEarning = workMonthEarning + monthQuickEarning;

  const pendingCount = workEntries.filter(e => e.status === 'Pending').length;
  const totalDue = workEntries.reduce((s, e) => s + Math.max(0, e.dueAmount), 0);
  const rejectedEntries = workEntries.filter(e => e.status === 'Rejected');
  const rejectedCount = rejectedEntries.length;
  const totalRefunded = rejectedEntries.reduce((s, e) => s + (e.refundAmount || 0), 0);
  const uniqueCustomers = new Set(workEntries.map(e => e.mobile)).size;

  // ── Total Pending Dues (all 5 sources) ──────────────────────────────────
  const workPendingDue = workEntries
    .filter(e => e.status !== 'Rejected' && e.dueAmount > 0)
    .reduce((s, e) => s + e.dueAmount, 0);
  const aepsPendingDue = aepsEntries
    .filter(e => resolveStatus(e.paymentStatus) === 'pending')
    .reduce((s, e) => s + e.amount, 0);
  const rechargePendingDue = rechargeEntries
    .filter(e => resolveStatus(e.paymentStatus) === 'pending')
    .reduce((s, e) => s + e.rechargeAmount, 0);
  const transferPendingDue = transferEntries
    .filter(e => resolveStatus(e.paymentStatus) === 'pending')
    .reduce((s, e) => s + e.amount, 0);
  const quickPendingDue = quickEntries
    .filter(e => resolveStatus(e.paymentStatus) === 'pending')
    .reduce((s, e) => s + e.amount, 0);

  const totalPendingDues = workPendingDue + aepsPendingDue + rechargePendingDue + transferPendingDue + quickPendingDue;
  const pendingDueCount =
    workEntries.filter(e => e.status !== 'Rejected' && e.dueAmount > 0).length +
    aepsEntries.filter(e => resolveStatus(e.paymentStatus) === 'pending').length +
    rechargeEntries.filter(e => resolveStatus(e.paymentStatus) === 'pending').length +
    transferEntries.filter(e => resolveStatus(e.paymentStatus) === 'pending').length +
    quickEntries.filter(e => resolveStatus(e.paymentStatus) === 'pending').length;

  // ── Profit (exclude pending/free) ───────────────────────────────────────
  const todayAepsProfit = aepsEntries
    .filter(e => isToday(e.createdAt.toDate()) && resolveStatus(e.paymentStatus) === 'paid')
    .reduce((s, e) => s + e.profitMargin, 0);
  const todayRechargeProfit = rechargeEntries
    .filter(e => isToday(e.createdAt.toDate()) && resolveStatus(e.paymentStatus) === 'paid')
    .reduce((s, e) => s + e.profitMargin, 0);
  const todayTransferProfit = transferEntries
    .filter(e => isToday(e.createdAt.toDate()) && resolveStatus(e.paymentStatus) === 'paid')
    .reduce((s, e) => s + e.profitMargin, 0);
  // Use final challan = original + any challan adjustments
  const todayChallanCost = todayWork.reduce((s, e) => s + (e.challanAmount ?? 0) + (e.netAdjustmentChallan ?? 0), 0);
  const todayWorkProfit = workTodayEarning - todayChallanCost;
  const todayQuickProfit = todayQuickEarning;
  const todayTotalProfit = todayWorkProfit + todayAepsProfit + todayRechargeProfit + todayTransferProfit + todayQuickProfit;

  const monthAepsProfit = aepsEntries
    .filter(e => isThisMonth(e.createdAt.toDate()) && resolveStatus(e.paymentStatus) === 'paid')
    .reduce((s, e) => s + e.profitMargin, 0);
  const monthRechargeProfit = rechargeEntries
    .filter(e => isThisMonth(e.createdAt.toDate()) && resolveStatus(e.paymentStatus) === 'paid')
    .reduce((s, e) => s + e.profitMargin, 0);
  const monthTransferProfit = transferEntries
    .filter(e => isThisMonth(e.createdAt.toDate()) && resolveStatus(e.paymentStatus) === 'paid')
    .reduce((s, e) => s + e.profitMargin, 0);
  const monthChallanCost = workEntries
    .filter(e => isThisMonth(e.date.toDate()) && e.status !== 'Rejected')
    .reduce((s, e) => s + (e.challanAmount ?? 0), 0);
  const monthWorkProfit = workMonthEarning - monthChallanCost;
  const monthQuickProfit = monthQuickEarning;
  const monthTotalProfit = monthWorkProfit + monthAepsProfit + monthRechargeProfit + monthTransferProfit + monthQuickProfit;

  // Pending reminders (3+ days old, or has due amount)
  const reminderEntries = workEntries
    .filter(e => e.status === 'Pending')
    .map(e => ({ ...e, daysPending: differenceInDays(today, e.date.toDate()) }))
    .filter(e => e.daysPending >= 3 || e.dueAmount > 0)
    .sort((a, b) => b.daysPending - a.daysPending);

  // Last 7 days chart (paid entries only)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const day = subDays(today, 6 - i);
    const dayKey = format(day, 'yyyy-MM-dd');
    const workEarned = workEntries
      .filter(e => format(e.date.toDate(), 'yyyy-MM-dd') === dayKey && e.status !== 'Rejected')
      .reduce((s, e) => s + e.paidAmount, 0);
    const quickEarned = quickEntries
      .filter(e => format(e.createdAt.toDate(), 'yyyy-MM-dd') === dayKey && resolveStatus(e.paymentStatus) === 'paid')
      .reduce((s, e) => s + e.amount, 0);
    return { day: format(day, 'dd MMM'), earned: workEarned + quickEarned };
  });

  // Recent entries
  const recentEntries = [...workEntries]
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
    .slice(0, 8);

  const handleMarkCompleted = async (entry: WorkEntry & { daysPending: number }) => {
    if (!entry.id) return;
    setCompletingId(entry.id);
    try {
      await updateWorkEntry(entry.id, { status: 'Completed', totalAmount: entry.totalAmount }, entry.paidAmount);
      toast({ title: 'Marked as Completed', description: `${entry.customerName} — ${entry.category === 'Other' && entry.otherCategory ? entry.otherCategory : entry.category}` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-7">
      {firestoreError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>Data error:</strong> {firestoreError}. Check Firestore rules or your connection.</span>
        </div>
      )}
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--app-font-display)' }}>Dashboard</h1>
        <Link href="/work/new">
          <Button size="sm" className="gap-1.5 shadow-sm">+ Add Work Entry</Button>
        </Link>
      </div>

      {/* ── PENDING REMINDERS ───────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Today's Pending Reminders
          </h2>
          {reminderEntries.length > 0 && (
            <Link href="/pending">
              <Button variant="outline" size="sm" className="h-7 text-xs">View All</Button>
            </Link>
          )}
        </div>
        <div className="bg-card border rounded-xl overflow-hidden">
          {reminderEntries.length === 0 ? (
            <div className="px-5 py-4 flex items-center gap-4 bg-emerald-50/60">
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm text-emerald-800 font-medium">No urgent pending work — great job staying on top!</p>
            </div>
          ) : (
            <div className="divide-y">
              {reminderEntries.map(entry => (
                <ReminderRow
                  key={entry.id}
                  entry={entry}
                  completing={completingId === entry.id}
                  onComplete={() => handleMarkCompleted(entry)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── OWNER: SUMMARY STATS ────────────────────────────────── */}
      {isOwner && (
        <section>
          {/* Work summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
            <Card className="bg-primary/5 border-primary/20 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-primary uppercase tracking-wide">Today's Earning</CardTitle>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(todaysEarning)}</div>
                <p className="text-xs text-muted-foreground mt-1">Today (paid)</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This Month</CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(monthEarning)}</div>
                <p className="text-xs text-muted-foreground mt-1">Monthly earned</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customers</CardTitle>
                <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueCustomers}</div>
                <p className="text-xs text-muted-foreground mt-1">Unique customers</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending</CardTitle>
                <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Need attention</p>
              </CardContent>
            </Card>

            {/* UPGRADED: Total Pending Dues across all 5 sources */}
            <Card className={`shadow-sm hover:shadow-md transition-shadow ${totalPendingDues > 0 ? 'border-amber-300 bg-amber-50/30' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending Dues</CardTitle>
                <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                  <IndianRupee className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalPendingDues > 0 ? 'text-amber-600' : ''}`}>
                  {formatCurrency(totalPendingDues)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingDueCount} entr{pendingDueCount === 1 ? 'y' : 'ies'} · all sources
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rejected</CardTitle>
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <XCircle className="h-4 w-4 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rejectedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalRefunded > 0 ? `${formatCurrency(totalRefunded)} refunded` : 'No refunds'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Combined profit overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <StatCard
              label="Today's Total Profit"
              value={formatCurrency(todayTotalProfit)}
              sub={`Work ₹${Math.round(todayWorkProfit)} · Quick ₹${Math.round(todayQuickProfit)} · AEPS ₹${Math.round(todayAepsProfit)} · Recharge ₹${Math.round(todayRechargeProfit)} · Transfer ₹${Math.round(todayTransferProfit)}`}
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
            />
            <StatCard
              label="Month's Total Profit"
              value={formatCurrency(monthTotalProfit)}
              sub="Work + Quick + AEPS + Recharge + Transfer (paid only)"
              icon={IndianRupee}
              gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
            />
          </div>

          {/* 7-day earnings chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">7-Day Work Earnings (Paid)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Earned']} />
                  <Bar dataKey="earned" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── BOTTOM ROW ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category-wise pending */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Pending by Category</h2>
            <Link href="/pending">
              <Button variant="ghost" size="sm" className="h-7 text-xs">View all</Button>
            </Link>
          </div>
          <div className="bg-card border rounded-xl overflow-hidden">
            {(() => {
              const byCat = workEntries
                .filter(e => e.status === 'Pending')
                .reduce<Record<string, number>>((acc, e) => {
                  acc[e.category] = (acc[e.category] ?? 0) + 1;
                  return acc;
                }, {});
              const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
              if (sorted.length === 0) return (
                <div className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No pending work!</p>
                </div>
              );
              return (
                <div className="divide-y">
                  {sorted.map(([cat, count]) => (
                    <Link key={cat} href={`/pending?category=${encodeURIComponent(cat)}`}>
                      <div className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-sm font-medium truncate">{cat}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0 ml-2">{count}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            <Link href="/work">
              <Button variant="ghost" size="sm" className="h-7 text-xs">View all</Button>
            </Link>
          </div>
          <div className="bg-card border rounded-xl overflow-hidden">
            {recentEntries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No entries yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentEntries.map(entry => (
                  <div key={entry.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{entry.customerName}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {entry.category === 'Other' && entry.otherCategory ? entry.otherCategory : entry.category}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{format(entry.date.toDate(), 'dd MMM')}</span>
                        {entry.addedBy && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground italic">{entry.addedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">
                        {formatCurrency(entry.totalAmount + (entry.netAdjustmentAmount ?? 0))}
                      </span>
                      {entry.status === 'Completed'
                        ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Done</span>
                        : entry.status === 'Rejected'
                        ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Rejected</span>
                        : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
