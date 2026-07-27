<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { subscribeToMoneyTransfers, createMoneyTransfer, MoneyTransfer } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isToday, isThisMonth, format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { Card } from '@/components/ui/card';
=======
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToMoneyTransfers, createMoneyTransfer, MoneyTransfer } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { format, isToday, isThisMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
<<<<<<< HEAD
import { ArrowRightLeft, Plus, TrendingUp, IndianRupee, X, Loader2, CreditCard } from 'lucide-react';

function TransferSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
=======
import {
  ArrowLeftRight, IndianRupee, TrendingUp, CalendarRange, Search,
  ShieldCheck, PlusCircle, ChevronUp, Loader2, X,
} from 'lucide-react';

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">Access Restricted</h2>
      <p className="text-muted-foreground max-w-xs">
        You don't have permission to access Money Transfer. Contact the Owner to enable access.
      </p>
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
    </div>
  );
}

export default function MoneyTransferPage() {
<<<<<<< HEAD
  const [entries, setEntries] = useState<MoneyTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { displayName } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ name: '', mobileOrAccount: '', amount: '', profitMargin: '' });

  useEffect(() => {
=======
  const { userProfile, canAccessFinancialServices } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<MoneyTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [mobileOrAccount, setMobileOrAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!canAccessFinancialServices) { setLoading(false); return; }
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
    const unsub = subscribeToMoneyTransfers((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsub();
<<<<<<< HEAD
  }, []);

  const todayEntries = entries.filter(e => isToday(e.createdAt.toDate()));
  const monthEntries = entries.filter(e => isThisMonth(e.createdAt.toDate()));
  const todayAmount = todayEntries.reduce((s, e) => s + e.amount, 0);
  const todayProfit = todayEntries.reduce((s, e) => s + e.profitMargin, 0);
  const monthAmount = monthEntries.reduce((s, e) => s + e.amount, 0);
  const monthProfit = monthEntries.reduce((s, e) => s + e.profitMargin, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobileOrAccount || !form.amount || !form.profitMargin) {
      toast({ variant: 'destructive', title: 'All fields are required' });
      return;
    }
    setSubmitting(true);
    try {
      await createMoneyTransfer({
        name: form.name.trim(),
        mobileOrAccount: form.mobileOrAccount.trim(),
        amount: parseFloat(form.amount),
        profitMargin: parseFloat(form.profitMargin),
        addedBy: displayName,
      });
      toast({ title: 'Transfer recorded', description: `${form.name} — ${formatCurrency(parseFloat(form.amount))}` });
      setForm({ name: '', mobileOrAccount: '', amount: '', profitMargin: '' });
=======
  }, [canAccessFinancialServices]);

  // Permission guard — after all hooks
  if (!canAccessFinancialServices) return <AccessDenied />;

  // Summary stats
  const todayAmountTotal = entries
    .filter(e => isToday(e.createdAt.toDate()))
    .reduce((s, e) => s + e.amount, 0);
  const todayProfitTotal = entries
    .filter(e => isToday(e.createdAt.toDate()))
    .reduce((s, e) => s + e.profitMargin, 0);
  const monthProfitTotal = entries
    .filter(e => isThisMonth(e.createdAt.toDate()))
    .reduce((s, e) => s + e.profitMargin, 0);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => {
      const d = e.createdAt.toDate();
      if (q &&
        !e.name.toLowerCase().includes(q) &&
        !e.mobileOrAccount.toLowerCase().includes(q)) return false;
      if (startDate && d < new Date(startDate + 'T00:00:00')) return false;
      if (endDate && d > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [entries, search, startDate, endDate]);

  const resetForm = () => { setName(''); setMobileOrAccount(''); setAmount(''); setProfitMargin(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createMoneyTransfer({
        name: name.trim(),
        mobileOrAccount: mobileOrAccount.trim(),
        amount: Number(amount),
        profitMargin: Number(profitMargin),
        addedBy: userProfile?.displayName || userProfile?.email || 'Unknown',
      });
      toast({ title: 'Transfer recorded', description: `${name} — ${formatCurrency(Number(amount))}` });
      resetForm();
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
      setShowForm(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

<<<<<<< HEAD
  const inp = "h-10 bg-background border-border";

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--app-font-display)' }}>
            <ArrowRightLeft className="h-6 w-6 text-primary" /> Money Transfer
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track NEFT/IMPS transfers and commission earned</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="gap-2 shrink-0">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Transfer'}
=======
  const clearFilters = () => { setSearch(''); setStartDate(''); setEndDate(''); };
  const hasFilters = search || startDate || endDate;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Money Transfer
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Record customer money transfers and profit earned</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="shrink-0">
          {showForm
            ? <><ChevronUp className="h-4 w-4 mr-2" />Hide Form</>
            : <><PlusCircle className="h-4 w-4 mr-2" />Add New</>}
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
        </Button>
      </div>

      {/* Summary Cards */}
<<<<<<< HEAD
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Transfers", value: formatCurrency(todayAmount), sub: `${todayEntries.length} done`, icon: ArrowRightLeft, grad: 'stat-gradient-sky' },
          { label: "Today's Profit", value: formatCurrency(todayProfit), sub: 'Commission', icon: TrendingUp, grad: 'stat-gradient-emerald' },
          { label: 'Month Transfers', value: formatCurrency(monthAmount), sub: `${monthEntries.length} done`, icon: IndianRupee, grad: 'stat-gradient-indigo' },
          { label: 'Month Profit', value: formatCurrency(monthProfit), sub: 'Total commission', icon: TrendingUp, grad: 'stat-gradient-violet' },
        ].map(c => (
          <Card key={c.label} className="overflow-hidden border-0 shadow-card animate-fade-in-up">
            <div className={`${c.grad} p-4 text-white`}>
              <div className="flex justify-between items-start mb-3">
                <p className="text-white/80 text-xs font-medium">{c.label}</p>
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <c.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{c.value}</div>
              <p className="text-white/70 text-xs mt-1">{c.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-card border rounded-xl p-6 shadow-card animate-fade-in-up">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Record New Transfer
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Recipient Name *</Label>
              <Input className={inp} placeholder="Full name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mobile / Account No. *</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className={`${inp} pl-9`} placeholder="Mobile or account" value={form.mobileOrAccount}
                  onChange={e => setForm(f => ({ ...f, mobileOrAccount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Transfer Amount (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className={`${inp} pl-9`} type="number" placeholder="0" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Profit Margin (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className={`${inp} pl-9`} type="number" placeholder="Commission" value={form.profitMargin}
                  onChange={e => setForm(f => ({ ...f, profitMargin: e.target.value }))} />
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
              <Button type="submit" disabled={submitting} className="h-10 px-8 font-semibold">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Transfer
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/20 flex items-center justify-between">
          <span className="font-semibold text-sm">All Transfers</span>
          <span className="text-xs text-muted-foreground">{loading ? '...' : `${entries.length} total`}</span>
        </div>
        {loading ? <TransferSkeleton /> : entries.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No transfers recorded yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {entries.map(entry => (
              <div key={entry.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold text-sm">{entry.name}</span>
                  </div>
                  <div className="ml-10 mt-0.5 text-xs text-muted-foreground">
                    {entry.mobileOrAccount} · {format(entry.createdAt.toDate(), 'dd MMM yyyy, h:mm a')}
                  </div>
                </div>
                <div className="ml-10 sm:ml-0 flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-bold">{formatCurrency(entry.amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Profit</p>
                    <p className="font-bold text-emerald-700">{formatCurrency(entry.profitMargin)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
=======
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <Card key={i}><CardContent className="pt-6">
              <Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-24" />
            </CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Transfer Total</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayAmountTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Amount transferred today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayProfitTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Profit earned today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month's Profit</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthProfitTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total profit this month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add New Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add New Transfer</CardTitle>
            <CardDescription>All fields are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" placeholder="Customer name"
                  value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobileOrAccount">Mobile / Account Number *</Label>
                <Input id="mobileOrAccount" placeholder="Mobile or account number"
                  value={mobileOrAccount} onChange={e => setMobileOrAccount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input id="amount" type="number" min="1" step="1" placeholder="Amount transferred"
                  value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profitMargin">Profit Margin (₹) *</Label>
                <Input id="profitMargin" type="number" min="0" step="1" placeholder="Commission/profit earned"
                  value={profitMargin} onChange={e => setProfitMargin(e.target.value)} required />
              </div>
              <div className="sm:col-span-2 flex gap-2 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                    : 'Save Transfer'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { resetForm(); setShowForm(false); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search + Filter + List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name or mobile/account number…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input type="date" className="w-36" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <span className="text-muted-foreground text-sm">–</span>
              <Input type="date" className="w-36" value={endDate} onChange={e => setEndDate(e.target.value)} />
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>{hasFilters ? 'No entries match your search or filters.' : 'No transfer entries yet. Add the first one above.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium whitespace-nowrap">Date & Time</th>
                    <th className="text-left py-2 pr-4 font-medium">Name</th>
                    <th className="text-left py-2 pr-4 font-medium">Mobile / Account</th>
                    <th className="text-right py-2 pr-4 font-medium">Amount</th>
                    <th className="text-right py-2 pr-4 font-medium">Profit</th>
                    <th className="text-left py-2 font-medium">Added By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(entry => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {format(entry.createdAt.toDate(), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="py-3 pr-4 font-medium">{entry.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{entry.mobileOrAccount}</td>
                      <td className="py-3 pr-4 text-right font-semibold tabular-nums">{formatCurrency(entry.amount)}</td>
                      <td className="py-3 pr-4 text-right font-medium text-green-700 tabular-nums">{formatCurrency(entry.profitMargin)}</td>
                      <td className="py-3 text-muted-foreground text-xs italic">{entry.addedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-3">
                Showing {filtered.length} of {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
    </div>
  );
}
