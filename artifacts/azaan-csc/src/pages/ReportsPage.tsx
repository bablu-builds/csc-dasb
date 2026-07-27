import { useState, useEffect } from 'react';
<<<<<<< HEAD
import {
  subscribeToWorkEntries, WorkEntry,
  subscribeToAepsWithdrawals, AepsWithdrawal,
  subscribeToElectricRecharges, ElectricRecharge,
  subscribeToMoneyTransfers, MoneyTransfer,
} from '@/lib/firestore';
import { isToday, isThisWeek, isThisMonth, format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Download, BarChart2, TrendingUp, IndianRupee, XCircle, Wallet, Zap, ArrowRightLeft, Receipt, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
=======
import { subscribeToWorkEntries, WorkEntry } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { isToday, isThisWeek, isThisMonth, format } from 'date-fns';
import { ShieldCheck, Download, BarChart2, TrendingUp, IndianRupee, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';

const CHART_COLORS = ['#4f46e5','#7c3aed','#0284c7','#059669','#d97706','#dc2626','#9333ea','#0891b2','#16a34a','#ea580c'];

type Period = 'today' | 'week' | 'month' | 'custom';

function ReportsSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0,1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function SummaryCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[]) {
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
}

export default function ReportsPage() {
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [aepsEntries, setAepsEntries] = useState<AepsWithdrawal[]>([]);
  const [rechargeEntries, setRechargeEntries] = useState<ElectricRecharge[]>([]);
  const [transferEntries, setTransferEntries] = useState<MoneyTransfer[]>([]);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
=======
  const { role } = useAuth();
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466

  // Only subscribe when user is the owner (role may be null while loading)
  useEffect(() => {
<<<<<<< HEAD
    let done = 0;
    const finish = () => { done++; if (done === 4) setLoading(false); };
    const u1 = subscribeToWorkEntries(d => { setWorkEntries(d); finish(); });
    const u2 = subscribeToAepsWithdrawals(d => { setAepsEntries(d); finish(); });
    const u3 = subscribeToElectricRecharges(d => { setRechargeEntries(d); finish(); });
    const u4 = subscribeToMoneyTransfers(d => { setTransferEntries(d); finish(); });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);
=======
    if (role !== 'owner') { setLoading(false); return; }
    const unsubscribe = subscribeToWorkEntries((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [role]);

  // Staff cannot see the Reports page — must be after all hooks
  if (role === 'staff') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-xs">
          Income reports are only visible to the Owner. Contact your owner if you need this information.
        </p>
      </div>
    );
  }
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466

  // Filter by period
  const inPeriod = (date: Date): boolean => {
    if (period === 'today') return isToday(date);
    if (period === 'week') return isThisWeek(date, { weekStartsOn: 1 });
    if (period === 'month') return isThisMonth(date);
    if (period === 'custom' && customFrom && customTo) {
      return isWithinInterval(date, { start: startOfDay(parseISO(customFrom)), end: endOfDay(parseISO(customTo)) });
    }
    return isThisMonth(date);
  };

  const filteredWork = workEntries.filter(e => inPeriod(e.date.toDate()));
  const filteredAeps = aepsEntries.filter(e => inPeriod(e.createdAt.toDate()));
  const filteredRecharge = rechargeEntries.filter(e => inPeriod(e.createdAt.toDate()));
  const filteredTransfer = transferEntries.filter(e => inPeriod(e.createdAt.toDate()));

  const activeWork = filteredWork.filter(e => e.status !== 'Rejected');
  const rejectedWork = filteredWork.filter(e => e.status === 'Rejected');

  // Profit breakdown
  const workEarned = activeWork.reduce((s, e) => s + e.paidAmount, 0);
  const workChallan = activeWork.reduce((s, e) => s + (e.challanAmount ?? 0), 0);
  const workProfit = workEarned - workChallan;
  const aepsProfit = filteredAeps.reduce((s, e) => s + e.profitMargin, 0);
  const rechargeProfit = filteredRecharge.reduce((s, e) => s + e.profitMargin, 0);
  const transferProfit = filteredTransfer.reduce((s, e) => s + e.profitMargin, 0);
  const totalProfit = workProfit + aepsProfit + rechargeProfit + transferProfit;

  const totalDues = activeWork.reduce((s, e) => s + e.dueAmount, 0);

  // Category breakdown
  const categoryStats = activeWork.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = { count: 0, earned: 0, challan: 0 };
    acc[e.category].count++;
    acc[e.category].earned += e.paidAmount;
    acc[e.category].challan += e.challanAmount ?? 0;
    return acc;
  }, {} as Record<string, { count: number; earned: number; challan: number }>);
  const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1].earned - a[1].earned);

  const chartData = sortedCategories.slice(0, 10).map(([name, stats]) => ({
    name: name.length > 14 ? name.slice(0, 14) + '…' : name,
    fullName: name,
    earned: stats.earned,
    count: stats.count,
  }));

  const profitBreakdown = [
    { name: 'Work/Certs', value: Math.max(0, workProfit), color: '#4f46e5' },
    { name: 'AEPS', value: aepsProfit, color: '#0284c7' },
    { name: 'Recharge', value: rechargeProfit, color: '#d97706' },
    { name: 'Transfers', value: transferProfit, color: '#059669' },
  ].filter(d => d.value > 0);

  const periodLabel = period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'Custom Range';

  // CSV exports
  const exportWork = () => {
    const headers = ['Date','Customer','Mobile','Category','Total','Paid','Due','Challan','Status'];
    const rows = filteredWork.map(e => [
      format(e.date.toDate(), 'yyyy-MM-dd'), `"${e.customerName}"`, e.mobile, `"${e.category}"`,
      e.totalAmount, e.paidAmount, e.dueAmount, e.challanAmount ?? 0, e.status,
    ].join(','));
    downloadCSV('work_report', headers, rows);
  };
  const exportAeps = () => {
    const headers = ['Date','Customer','Bank','Mobile','Amount','Profit'];
    const rows = filteredAeps.map(e => [
      format(e.createdAt.toDate(), 'yyyy-MM-dd'), `"${e.customerName}"`, `"${e.bankName}"`,
      e.mobile ?? '', e.amount, e.profitMargin,
    ].join(','));
    downloadCSV('aeps_report', headers, rows);
  };
  const exportRecharge = () => {
    const headers = ['Date','Customer','ConsumerNo','Mobile','Amount','Profit'];
    const rows = filteredRecharge.map(e => [
      format(e.createdAt.toDate(), 'yyyy-MM-dd'), `"${e.customerName}"`, e.consumerNumber,
      e.mobile ?? '', e.rechargeAmount, e.profitMargin,
    ].join(','));
    downloadCSV('recharge_report', headers, rows);
  };
  const exportTransfer = () => {
    const headers = ['Date','Name','Account/Mobile','Amount','Profit'];
    const rows = filteredTransfer.map(e => [
      format(e.createdAt.toDate(), 'yyyy-MM-dd'), `"${e.name}"`,
      e.mobileOrAccount, e.amount, e.profitMargin,
    ].join(','));
    downloadCSV('transfer_report', headers, rows);
  };

  const tab = "text-xs font-medium";

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--app-font-display)' }}>Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Business performance and analytics</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="bg-card border rounded-xl p-4 shadow-card flex flex-wrap items-end gap-4">
        <div className="flex gap-2 flex-wrap">
          {(['today','week','month','custom'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                ${period === p ? 'bg-primary text-white border-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Custom Range'}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" className="h-9 text-sm" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" className="h-9 text-sm" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {loading ? <ReportsSkeleton /> : (
        <Tabs defaultValue="profit" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto bg-muted p-1 rounded-xl">
            {[
              { value: 'profit', label: '📊 Overall Profit' },
              { value: 'work', label: '📋 Work / CSC' },
              { value: 'challan', label: '🧾 Challan' },
              { value: 'aeps', label: '💳 AEPS' },
              { value: 'recharge', label: '⚡ Recharge' },
              { value: 'transfer', label: '↔️ Transfer' },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs font-medium rounded-lg data-[state=active]:shadow-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── OVERALL PROFIT ─────────────────────────────────── */}
          <TabsContent value="profit" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard label="Total Profit" value={formatCurrency(totalProfit)} sub={`${periodLabel} combined`}
                icon={Target} color="bg-primary/10 text-primary" />
              <SummaryCard label="Work/Cert Profit" value={formatCurrency(Math.max(0, workProfit))}
                sub={`Earned ₹${(workEarned/1000).toFixed(1)}k − Challan ₹${(workChallan/1000).toFixed(1)}k`}
                icon={IndianRupee} color="bg-indigo-50 text-indigo-600" />
              <SummaryCard label="Financial Profit" value={formatCurrency(aepsProfit + rechargeProfit + transferProfit)}
                sub="AEPS + Recharge + Transfer" icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
              <SummaryCard label="Total Dues" value={formatCurrency(totalDues)}
                sub="Outstanding from customers" icon={XCircle} color="bg-red-50 text-red-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Profit breakdown pie */}
              <div className="bg-card border rounded-xl p-5 shadow-card">
                <h3 className="font-semibold text-sm mb-4">Profit by Source</h3>
                {profitBreakdown.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">No profit data for this period</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={profitBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {profitBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Source breakdown table */}
              <div className="bg-card border rounded-xl p-5 shadow-card">
                <h3 className="font-semibold text-sm mb-4">Source Summary — {periodLabel}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs uppercase">
                      <th className="text-left pb-2 font-medium">Source</th>
                      <th className="text-right pb-2 font-medium">Volume</th>
                      <th className="text-right pb-2 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-muted/20">
                      <td className="py-2.5 flex items-center gap-2"><IndianRupee className="h-3.5 w-3.5 text-primary" /> Work/Certs</td>
                      <td className="py-2.5 text-right text-muted-foreground">{activeWork.length} entries</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-700">{formatCurrency(Math.max(0, workProfit))}</td>
                    </tr>
                    <tr className="hover:bg-muted/20">
                      <td className="py-2.5 flex items-center gap-2"><Wallet className="h-3.5 w-3.5 text-sky-600" /> AEPS</td>
                      <td className="py-2.5 text-right text-muted-foreground">{filteredAeps.length} txns</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-700">{formatCurrency(aepsProfit)}</td>
                    </tr>
                    <tr className="hover:bg-muted/20">
                      <td className="py-2.5 flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-600" /> Recharge</td>
                      <td className="py-2.5 text-right text-muted-foreground">{filteredRecharge.length} txns</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-700">{formatCurrency(rechargeProfit)}</td>
                    </tr>
                    <tr className="hover:bg-muted/20">
                      <td className="py-2.5 flex items-center gap-2"><ArrowRightLeft className="h-3.5 w-3.5 text-violet-600" /> Transfers</td>
                      <td className="py-2.5 text-right text-muted-foreground">{filteredTransfer.length} txns</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-700">{formatCurrency(transferProfit)}</td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr>
                      <td className="pt-2.5 font-bold">Total Profit</td>
                      <td className="pt-2.5 text-right text-muted-foreground">
                        {activeWork.length + filteredAeps.length + filteredRecharge.length + filteredTransfer.length}
                      </td>
                      <td className="pt-2.5 text-right font-bold text-emerald-700">{formatCurrency(totalProfit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── WORK / CSC ─────────────────────────────────────── */}
          <TabsContent value="work" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportWork} className="gap-2">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard label="Total Earned" value={formatCurrency(workEarned)} sub={`${activeWork.length} entries`}
                icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
              <SummaryCard label="Total Dues" value={formatCurrency(totalDues)} sub="Still outstanding"
                icon={IndianRupee} color="bg-red-50 text-red-500" />
              <SummaryCard label="Rejected" value={String(rejectedWork.length)} sub={`${formatCurrency(rejectedWork.reduce((s,e)=>s+(e.refundAmount??0),0))} refunded`}
                icon={XCircle} color="bg-slate-100 text-slate-500" />
            </div>

            {sortedCategories.length > 0 && (
              <div className="bg-card border rounded-xl shadow-card">
                <div className="px-5 py-4 border-b flex justify-between items-center">
                  <h3 className="font-semibold text-sm">Category Breakdown</h3>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                        tickFormatter={v => v === 0 ? '₹0' : `₹${(v/1000).toFixed(1)}k`} />
                      <Tooltip formatter={(v: number, _, p: any) => [formatCurrency(v), p.payload.fullName]}
                        contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="earned" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto px-5 pb-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs uppercase">
                        <th className="text-left pb-2 font-medium">Category</th>
                        <th className="text-right pb-2 font-medium">Entries</th>
                        <th className="text-right pb-2 font-medium">Earned</th>
                        <th className="text-right pb-2 font-medium">Challan</th>
                        <th className="text-right pb-2 font-medium">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedCategories.map(([cat, stats]) => (
                        <tr key={cat} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 font-medium">{cat}</td>
                          <td className="py-2.5 text-right text-muted-foreground">{stats.count}</td>
                          <td className="py-2.5 text-right font-semibold">{formatCurrency(stats.earned)}</td>
                          <td className="py-2.5 text-right text-red-500">{formatCurrency(stats.challan)}</td>
                          <td className="py-2.5 text-right font-bold text-emerald-700">{formatCurrency(stats.earned - stats.challan)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2">
                      <tr>
                        <td className="pt-2.5 font-bold">Total</td>
                        <td className="pt-2.5 text-right font-bold">{sortedCategories.reduce((s,[,v])=>s+v.count,0)}</td>
                        <td className="pt-2.5 text-right font-bold">{formatCurrency(workEarned)}</td>
                        <td className="pt-2.5 text-right font-bold text-red-500">{formatCurrency(workChallan)}</td>
                        <td className="pt-2.5 text-right font-bold text-emerald-700">{formatCurrency(workProfit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── CHALLAN ────────────────────────────────────────── */}
          <TabsContent value="challan" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard label="Total Challan Spent" value={formatCurrency(workChallan)} sub={`${periodLabel}`}
                icon={Receipt} color="bg-amber-50 text-amber-600" />
              <SummaryCard label="Entries with Challan"
                value={String(activeWork.filter(e => (e.challanAmount ?? 0) > 0).length)}
                sub="Have challan recorded" icon={BarChart2} color="bg-indigo-50 text-primary" />
              <SummaryCard label="Challan-Net Profit" value={formatCurrency(Math.max(0, workProfit))}
                sub="After deducting challans" icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
            </div>

            <div className="bg-card border rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/20">
                <h3 className="font-semibold text-sm">Challan Detail by Category</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Category</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Entries</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Total Challan</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Avg / Entry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedCategories.filter(([,s])=>s.challan>0).map(([cat,stats]) => (
                      <tr key={cat} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium">{cat}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{stats.count}</td>
                        <td className="px-5 py-3 text-right font-semibold text-amber-600">{formatCurrency(stats.challan)}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">{formatCurrency(Math.round(stats.challan/stats.count))}</td>
                      </tr>
                    ))}
                    {sortedCategories.filter(([,s])=>s.challan>0).length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground text-sm">No challan data recorded for this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── AEPS ───────────────────────────────────────────── */}
          <TabsContent value="aeps" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportAeps} className="gap-2">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard label="Total Processed" value={formatCurrency(filteredAeps.reduce((s,e)=>s+e.amount,0))}
                sub={`${filteredAeps.length} withdrawals`} icon={Wallet} color="bg-sky-50 text-sky-600" />
              <SummaryCard label="Total Profit" value={formatCurrency(aepsProfit)} sub="Commission earned"
                icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
              <SummaryCard label="Avg Profit/Txn" value={filteredAeps.length ? formatCurrency(Math.round(aepsProfit/filteredAeps.length)) : '₹0'}
                sub="Per withdrawal" icon={IndianRupee} color="bg-indigo-50 text-primary" />
            </div>
            <div className="bg-card border rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/20"><h3 className="font-semibold text-sm">AEPS Transactions</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Bank</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Amount</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAeps.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">No AEPS data for this period</td></tr>
                    ) : filteredAeps.map(e => (
                      <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 text-muted-foreground">{format(e.createdAt.toDate(),'dd MMM yyyy')}</td>
                        <td className="px-5 py-3 font-medium">{e.customerName}</td>
                        <td className="px-5 py-3 text-muted-foreground">{e.bankName}</td>
                        <td className="px-5 py-3 text-right font-semibold">{formatCurrency(e.amount)}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-700">{formatCurrency(e.profitMargin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── RECHARGE ───────────────────────────────────────── */}
          <TabsContent value="recharge" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportRecharge} className="gap-2">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard label="Total Recharged" value={formatCurrency(filteredRecharge.reduce((s,e)=>s+e.rechargeAmount,0))}
                sub={`${filteredRecharge.length} recharges`} icon={Zap} color="bg-amber-50 text-amber-600" />
              <SummaryCard label="Total Profit" value={formatCurrency(rechargeProfit)} sub="Commission"
                icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
              <SummaryCard label="Avg Profit/Txn" value={filteredRecharge.length ? formatCurrency(Math.round(rechargeProfit/filteredRecharge.length)) : '₹0'}
                sub="Per recharge" icon={IndianRupee} color="bg-indigo-50 text-primary" />
            </div>
            <div className="bg-card border rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/20"><h3 className="font-semibold text-sm">Recharge Transactions</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Customer</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Consumer No.</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Amount</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRecharge.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">No recharge data for this period</td></tr>
                    ) : filteredRecharge.map(e => (
                      <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 text-muted-foreground">{format(e.createdAt.toDate(),'dd MMM yyyy')}</td>
                        <td className="px-5 py-3 font-medium">{e.customerName}</td>
                        <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{e.consumerNumber}</td>
                        <td className="px-5 py-3 text-right font-semibold">{formatCurrency(e.rechargeAmount)}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-700">{formatCurrency(e.profitMargin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── MONEY TRANSFER ─────────────────────────────────── */}
          <TabsContent value="transfer" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportTransfer} className="gap-2">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard label="Total Transferred" value={formatCurrency(filteredTransfer.reduce((s,e)=>s+e.amount,0))}
                sub={`${filteredTransfer.length} transfers`} icon={ArrowRightLeft} color="bg-violet-50 text-violet-600" />
              <SummaryCard label="Total Profit" value={formatCurrency(transferProfit)} sub="Commission"
                icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
              <SummaryCard label="Avg Profit/Txn" value={filteredTransfer.length ? formatCurrency(Math.round(transferProfit/filteredTransfer.length)) : '₹0'}
                sub="Per transfer" icon={IndianRupee} color="bg-indigo-50 text-primary" />
            </div>
            <div className="bg-card border rounded-xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/20"><h3 className="font-semibold text-sm">Transfer Transactions</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b text-xs uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Recipient</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Account/Mobile</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Amount</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTransfer.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">No transfer data for this period</td></tr>
                    ) : filteredTransfer.map(e => (
                      <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 text-muted-foreground">{format(e.createdAt.toDate(),'dd MMM yyyy')}</td>
                        <td className="px-5 py-3 font-medium">{e.name}</td>
                        <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{e.mobileOrAccount}</td>
                        <td className="px-5 py-3 text-right font-semibold">{formatCurrency(e.amount)}</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-700">{formatCurrency(e.profitMargin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
