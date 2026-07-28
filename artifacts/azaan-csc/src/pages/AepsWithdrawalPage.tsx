import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToAepsWithdrawals, createAepsWithdrawal, AepsWithdrawal } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { format, isToday, isThisMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Fingerprint, IndianRupee, TrendingUp, Hash, CalendarRange, Search, ShieldCheck,
  PlusCircle, ChevronUp, Loader2, X,
} from 'lucide-react';

const INDIAN_BANKS = [
  'State Bank of India (SBI)', 'Punjab National Bank (PNB)', 'Bank of Baroda (BOB)',
  'Canara Bank', 'Union Bank of India', 'Bank of India', 'Indian Bank',
  'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'IndusInd Bank',
  'Yes Bank', 'IDBI Bank', 'Central Bank of India', 'UCO Bank',
  'Indian Overseas Bank', 'Bank of Maharashtra', 'Punjab & Sind Bank',
  'Bandhan Bank', 'South Indian Bank', 'Federal Bank', 'RBL Bank',
];

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">Access Restricted</h2>
      <p className="text-muted-foreground max-w-xs">
        You don't have permission to access AEPS Withdrawal. Contact the Owner to enable access.
      </p>
    </div>
  );
}

export default function AepsWithdrawalPage() {
  const { userProfile, canAccessFinancialServices } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<AepsWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [bankName, setBankName] = useState('');
  const [mobile, setMobile] = useState('');
  const [amount, setAmount] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!canAccessFinancialServices) { setLoading(false); return; }
    const unsub = subscribeToAepsWithdrawals((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsub();
  }, [canAccessFinancialServices]);

  // Permission guard — after all hooks
  if (!canAccessFinancialServices) return <AccessDenied />;

  // Summary stats (from all entries, not filtered)
  const todayTotal = entries.filter(e => isToday(e.createdAt.toDate())).reduce((s, e) => s + e.amount, 0);
  const todayCount = entries.filter(e => isToday(e.createdAt.toDate())).length;
  const todayProfit = entries.filter(e => isToday(e.createdAt.toDate())).reduce((s, e) => s + (e.profitMargin ?? 0), 0);
  const monthTotal = entries.filter(e => isThisMonth(e.createdAt.toDate())).reduce((s, e) => s + e.amount, 0);
  const monthProfit = entries.filter(e => isThisMonth(e.createdAt.toDate())).reduce((s, e) => s + (e.profitMargin ?? 0), 0);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => {
      const d = e.createdAt.toDate();
      if (q && !e.customerName.toLowerCase().includes(q) &&
          !e.bankName.toLowerCase().includes(q) &&
          !(e.mobile ?? '').includes(q)) return false;
      if (startDate && d < new Date(startDate + 'T00:00:00')) return false;
      if (endDate && d > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [entries, search, startDate, endDate]);

  const resetForm = () => {
    setCustomerName(''); setBankName(''); setMobile(''); setAmount(''); setProfitMargin('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile && !/^\d{10}$/.test(mobile)) {
      toast({ variant: 'destructive', title: 'Invalid mobile', description: 'Mobile number must be exactly 10 digits.' });
      return;
    }
    setSubmitting(true);
    try {
      await createAepsWithdrawal({
        customerName: customerName.trim(),
        bankName: bankName.trim(),
        mobile: mobile.trim() || undefined,
        amount: Number(amount),
        profitMargin: Number(profitMargin),
        addedBy: userProfile?.displayName || userProfile?.email || 'Unknown',
      });
      toast({ title: 'Withdrawal recorded', description: `${customerName} — ${formatCurrency(Number(amount))}` });
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => { setSearch(''); setStartDate(''); setEndDate(''); };
  const hasFilters = search || startDate || endDate;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Fingerprint className="h-6 w-6 text-primary" />
            AEPS Withdrawal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Record Aadhaar-enabled payment system withdrawals</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="shrink-0">
          {showForm ? <><ChevronUp className="h-4 w-4 mr-2" />Hide Form</> : <><PlusCircle className="h-4 w-4 mr-2" />Add New</>}
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[0,1,2,3,4].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-24" /></CardContent></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Withdrawal</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total processed today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">{formatCurrency(todayProfit)}</div>
              <p className="text-xs text-muted-foreground mt-1">Commission earned today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Transactions</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Withdrawals processed today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Month's Withdrawal</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total processed this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Month's Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">{formatCurrency(monthProfit)}</div>
              <p className="text-xs text-muted-foreground mt-1">Commission earned this month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add New Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add New Withdrawal</CardTitle>
            <CardDescription>Fields marked * are required. Mobile number is optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input id="customerName" placeholder="e.g. Ramesh Kumar" value={customerName}
                  onChange={e => setCustomerName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input id="bankName" list="aeps-banks" placeholder="e.g. State Bank of India"
                  value={bankName} onChange={e => setBankName(e.target.value)} required />
                <datalist id="aeps-banks">
                  {INDIAN_BANKS.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Customer Mobile Number</Label>
                <Input id="mobile" placeholder="10-digit number (optional)" value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Withdrawal Amount (₹) *</Label>
                <Input id="amount" type="number" min="1" step="1" placeholder="e.g. 5000"
                  value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profitMargin">Profit Margin (₹) *</Label>
                <Input id="profitMargin" type="number" min="0" step="1" placeholder="Commission/profit earned"
                  value={profitMargin} onChange={e => setProfitMargin(e.target.value)} required />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Withdrawal'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { resetForm(); setShowForm(false); }} className="shrink-0">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter + List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, bank, or mobile…"
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
              {[0,1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Fingerprint className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>{hasFilters ? 'No entries match your search or filters.' : 'No withdrawal entries yet. Add the first one above.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium whitespace-nowrap">Date & Time</th>
                    <th className="text-left py-2 pr-4 font-medium">Customer</th>
                    <th className="text-left py-2 pr-4 font-medium">Bank</th>
                    <th className="text-left py-2 pr-4 font-medium">Mobile</th>
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
                      <td className="py-3 pr-4 font-medium">{entry.customerName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{entry.bankName}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{entry.mobile || '—'}</td>
                      <td className="py-3 pr-4 text-right font-semibold tabular-nums">{formatCurrency(entry.amount)}</td>
                      <td className="py-3 pr-4 text-right font-medium text-emerald-700 tabular-nums">
                        {formatCurrency(entry.profitMargin ?? 0)}
                      </td>
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
    </div>
  );
}
