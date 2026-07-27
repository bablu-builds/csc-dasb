import { useState, useEffect } from 'react';
import {
  WorkEntry, subscribeToWorkEntries, updateWorkEntry,
  subscribeToAepsWithdrawals, AepsWithdrawal,
  subscribeToElectricRecharges, ElectricRecharge,
  subscribeToMoneyTransfers, MoneyTransfer,
} from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { isToday, isThisMonth, differenceInDays, subDays, format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IndianRupee, Users, Clock, AlertTriangle, FileText, XCircle, TrendingUp,
  CheckCircle2, Phone, Loader2, Wallet, Zap, ArrowRightLeft, Receipt,
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isConfigured } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Animated stat value ────────────────────────────────────────────
function StatValue({ value, className = '' }: { value: string; className?: string }) {
  return <div className={`text-2xl font-bold animate-count-up ${className}`}>{value}</div>;
}

// ── Premium stat card (gradient) ───────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, gradient, textClass = 'text-white' }: {
  label: string; value: string; sub: string; icon: React.ElementType;
  gradient: string; textClass?: string;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-card hover:shadow-card-hover transition-shadow animate-fade-in-up">
      <div className={`${gradient} p-4 text-white`}>
        <div className="flex justify-between items-start mb-3">
          <p className="text-white/75 text-xs font-medium uppercase tracking-wide">{label}</p>
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <StatValue value={value} />
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
          <Badge variant="secondary" className="text-xs font-normal py-0">{entry.category}</Badge>
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
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const { isOwner, canAccessFinancialServices } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let resolved = 0;
    const done = () => { resolved++; if (resolved === 4) setLoading(false); };

    const u1 = subscribeToWorkEntries((d) => { setWorkEntries(d); done(); });
    const u2 = subscribeToAepsWithdrawals((d) => { setAepsEntries(d); done(); });
    const u3 = subscribeToElectricRecharges((d) => { setRechargeEntries(d); done(); });
    const u4 = subscribeToMoneyTransfers((d) => { setTransferEntries(d); done(); });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const today = new Date();

  // Work entry stats
  const todayWork = workEntries.filter(e => isToday(e.date.toDate()) && e.status !== 'Rejected');
  const todaysEarning = todayWork.reduce((s, e) => s + e.paidAmount, 0);
  const monthEarning = workEntries.filter(e => isThisMonth(e.date.toDate()) && e.status !== 'Rejected').reduce((s, e) => s + e.paidAmount, 0);
  const pendingCount = workEntries.filter(e => e.status === 'Pending').length;
  const totalDue = workEntries.reduce((s, e) => s + e.dueAmount, 0);
  const rejectedCount = workEntries.filter(e => e.status === 'Rejected').length;
  const uniqueCustomers = new Set(workEntries.map(e => e.mobile)).size;

  // Combined profit (owner only)
  const todayAepsProfit = aepsEntries.filter(e => isToday(e.createdAt.toDate())).reduce((s, e) => s + e.profitMargin, 0);
  const todayRechargeProfit = rechargeEntries.filter(e => isToday(e.createdAt.toDate())).reduce((s, e) => s + e.profitMargin, 0);
  const todayTransferProfit = transferEntries.filter(e => isToday(e.createdAt.toDate())).reduce((s, e) => s + e.profitMargin, 0);
  const todayChallanCost = todayWork.reduce((s, e) => s + (e.challanAmount ?? 0), 0);
  const todayWorkProfit = todaysEarning - todayChallanCost;
  const todayTotalProfit = todayWorkProfit + todayAepsProfit + todayRechargeProfit + todayTransferProfit;

  const monthAepsProfit = aepsEntries.filter(e => isThisMonth(e.createdAt.toDate())).reduce((s, e) => s + e.profitMargin, 0);
  const monthRechargeProfit = rechargeEntries.filter(e => isThisMonth(e.createdAt.toDate())).reduce((s, e) => s + e.profitMargin, 0);
  const monthTransferProfit = transferEntries.filter(e => isThisMonth(e.createdAt.toDate())).reduce((s, e) => s + e.profitMargin, 0);
  const monthChallanCost = workEntries.filter(e => isThisMonth(e.date.toDate()) && e.status !== 'Rejected').reduce((s, e) => s + (e.challanAmount ?? 0), 0);
  const monthWorkProfit = monthEarning - monthChallanCost;
  const monthTotalProfit = monthWorkProfit + monthAepsProfit + monthRechargeProfit + monthTransferProfit;

  // Pending reminders
  const reminderEntries = workEntries
    .filter(e => e.status === 'Pending')
    .map(e => ({ ...e, daysPending: differenceInDays(today, e.date.toDate()) }))
    .filter(e => e.daysPending >= 3 || e.dueAmount > 0)
    .sort((a, b) => b.daysPending - a.daysPending);

  // 7-day chart (earnings only)
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const day = subDays(today, 6 - i);
    const dayStr = format(day, 'dd MMM');
    const dayKey = format(day, 'yyyy-MM-dd');
    const earned = workEntries
      .filter(e => format(e.date.toDate(), 'yyyy-MM-dd') === dayKey && e.status !== 'Rejected')
      .reduce((s, e) => s + e.paidAmount, 0);
    return { day: dayStr, earned };
  });

  // Recent entries
  const recentEntries = [...workEntries]
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
    .slice(0, 8);

  const handleMarkCompleted = async (entry: WorkEntry & { daysPending: number }) => {
    if (!entry.id) return;
    setCompletingId(entry.id);
    try {
      await updateWorkEntry(entry.id, { status: 'Completed', paidAmount: entry.totalAmount });
      toast({ title: 'Marked as Completed', description: `${entry.customerName} — ${entry.category}` });
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
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--app-font-display)' }}>Dashboard</h1>
        <Link href="/work/new">
          <Button size="sm" className="gap-1.5 shadow-sm">+ Add Work Entry</Button>
        </Link>
      </div>

      {/* ── PENDING REMINDERS ───────────────────────────────────── */}
      <section className="animate-fade-in-up">
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
        <div className="bg-card border rounded-xl overflow-hidden shadow-card">
          {reminderEntries.length === 0 ? (
            <div className="px-5 py-4 flex items-center gap-4 bg-emerald-50/60">
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
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

      {/* ── OWNER: PROFIT SUMMARY ───────────────────────────────── */}
      {isOwner && (
        <section className="animate-fade-in-up">
          <h2 className="text-sm font-semibold mb-3 text-foreground">Combined Profit Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Today's Total Profit" value={formatCurrency(todayTotalProfit)}
              sub={`Work ₹${(todayWorkProfit/1000).toFixed(1)}k · AEPS ₹${(todayAepsProfit/100).toFixed(0)} · Recharge ₹${(todayRechargeProfit/100).toFixed(0)} · Transfer ₹${(todayTransferProfit/100).toFixed(0)}`}
              icon={TrendingUp} gradient="stat-gradient-emerald" />
            <StatCard label="Month's Total Profit" value={formatCurrency(monthTotalProfit)}
              sub={`Work + AEPS + Recharge + Transfer combined`}
              icon={IndianRupee} gradient="stat-gradient-indigo" />
          </div>
          {/* Activity breakdown */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Work Entries Today', value: todayWork.length, icon: FileText, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'AEPS Today', value: aepsEntries.filter(e => isToday(e.createdAt.toDate())).length, icon: Wallet, color: 'text-sky-600 bg-sky-50' },
              { label: 'Recharges Today', value: rechargeEntries.filter(e => isToday(e.createdAt.toDate())).length, icon: Zap, color: 'text-amber-600 bg-amber-50' },
              { label: 'Transfers Today', value: transferEntries.filter(e => isToday(e.createdAt.toDate())).length, icon: ArrowRightLeft, color: 'text-violet-600 bg-violet-50' },
            ].map(s => (
              <div key={s.label} className="bg-card border rounded-xl p-4 flex items-center gap-3 shadow-card">
                <div className={`h-9 w-9 rounded-lg ${s.color} flex items-center justify-center shrink-0`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── MAIN STAT CARDS ─────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-foreground">Work Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
          <StatCard label="Today's Earning" value={formatCurrency(todaysEarning)} sub="Collected today"
            icon={IndianRupee} gradient="stat-gradient-indigo" />
          <StatCard label="This Month" value={formatCurrency(monthEarning)} sub="Monthly collected"
            icon={TrendingUp} gradient="stat-gradient-sky" />
          <StatCard label="Customers" value={String(uniqueCustomers)} sub="Unique mobiles"
            icon={Users} gradient="stat-gradient-violet" />
          <StatCard label="Pending" value={String(pendingCount)} sub="Awaiting completion"
            icon={Clock} gradient="stat-gradient-amber" />
          <StatCard label="Total Due" value={formatCurrency(totalDue)} sub="Outstanding dues"
            icon={AlertTriangle} gradient={totalDue > 0 ? 'stat-gradient-rose' : 'stat-gradient-indigo'} />
          <StatCard label="Rejected" value={String(rejectedCount)} sub="Cancelled work"
            icon={XCircle} gradient="stat-gradient-rose" />
        </div>
      </section>

      {/* ── CHART + RECENT ACTIVITY ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chart */}
        <div className="lg:col-span-3">
          <div className="bg-card border rounded-xl shadow-card p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Earnings — Last 7 Days
            </h3>
            {chartData.every(d => d.earned === 0) ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">No earnings data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v === 0 ? '0' : `₹${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Earned']}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="earned" fill="hsl(244 76% 58%)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-card border rounded-xl shadow-card overflow-hidden h-full">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Recent Activity
              </h3>
              <Link href="/work">
                <Button variant="ghost" size="sm" className="h-7 text-xs">View all</Button>
              </Link>
            </div>
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
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{entry.category}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{format(entry.date.toDate(), 'dd MMM')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{formatCurrency(entry.totalAmount)}</span>
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
