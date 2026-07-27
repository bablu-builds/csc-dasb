import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToMoneyTransfers, createMoneyTransfer, MoneyTransfer } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { format, isToday, isThisMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeftRight, IndianRupee, TrendingUp, CalendarRange, Search, ShieldCheck,
  PlusCircle, ChevronUp, Loader2, X,
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
    </div>
  );
}

export default function MoneyTransferPage() {
  const { userProfile, canAccessFinancialServices } = useAuth();
  const { toast } = useToast();

  const [entries, setEntries] = useState<MoneyTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [senderMobile, setSenderMobile] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [commission, setCommission] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!canAccessFinancialServices) { setLoading(false); return; }
    const unsub = subscribeToMoneyTransfers((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsub();
  }, [canAccessFinancialServices]);

  if (!canAccessFinancialServices) return <AccessDenied />;

  // Summary stats
  const todayTransferTotal = entries.filter(e => isToday(e.createdAt.toDate())).reduce((s, e) => s + e.transferAmount, 0);
  const todayCommissionTotal = entries.filter(e => isToday(e.createdAt.toDate())).reduce((s, e) => s + e.commission, 0);
  const monthCommissionTotal = entries.filter(e => isThisMonth(e.createdAt.toDate())).reduce((s, e) => s + e.commission, 0);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e => {
      const d = e.createdAt.toDate();
      if (q && !e.senderName.toLowerCase().includes(q) &&
          !e.recipientName.toLowerCase().includes(q) &&
          !e.senderMobile.includes(q) &&
          !e.recipientNumber.includes(q)) return false;
      if (startDate && d < new Date(startDate + 'T00:00:00')) return false;
      if (endDate && d > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [entries, search, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(senderMobile)) {
      toast({ variant: 'destructive', title: 'Invalid mobile', description: 'Sender mobile must be exactly 10 digits.' });
      return;
    }
    setSubmitting(true);
    try {
      await createMoneyTransfer({
        senderName: senderName.trim(),
        senderMobile: senderMobile.trim(),
        recipientName: recipientName.trim(),
        recipientNumber: recipientNumber.trim(),
        transferAmount: Number(transferAmount),
        commission: Number(commission),
        addedBy: userProfile?.displayName || userProfile?.email || 'Unknown',
      });
      toast({ title: 'Transfer recorded', description: `${senderName} → ${recipientName}, ${formatCurrency(Number(transferAmount))}` });
      setSenderName(''); setSenderMobile(''); setRecipientName('');
      setRecipientNumber(''); setTransferAmount(''); setCommission('');
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
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Money Transfer
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Record customer money transfers and commission earned</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="shrink-0">
          {showForm ? <><ChevronUp className="h-4 w-4 mr-2" />Hide Form</> : <><PlusCircle className="h-4 w-4 mr-2" />Add New</>}
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0,1,2].map(i => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-24" /></CardContent></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Transfer Total</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayTransferTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Amount transferred today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Commission</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayCommissionTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Charges earned today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month's Commission</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthCommissionTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total commission this month</p>
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
                <Label htmlFor="senderName">Sender Name *</Label>
                <Input id="senderName" placeholder="Customer sending money"
                  value={senderName} onChange={e => setSenderName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderMobile">Sender Mobile Number *</Label>
                <Input id="senderMobile" placeholder="10-digit mobile number"
                  value={senderMobile} onChange={e => setSenderMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10} inputMode="numeric" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name *</Label>
                <Input id="recipientName" placeholder="Person receiving the money"
                  value={recipientName} onChange={e => setRecipientName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientNumber">Recipient Mobile/Account No. *</Label>
                <Input id="recipientNumber" placeholder="Mobile or account number"
                  value={recipientNumber} onChange={e => setRecipientNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferAmount">Transfer Amount (₹) *</Label>
                <Input id="transferAmount" type="number" min="1" step="1" placeholder="Amount being sent"
                  value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Commission/Charge Earned (₹) *</Label>
                <Input id="commission" type="number" min="0" step="1" placeholder="Shop's commission"
                  value={commission} onChange={e => setCommission(e.target.value)} required />
              </div>
              <div className="sm:col-span-2 flex gap-2 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Transfer'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
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
              <Input className="pl-9" placeholder="Search by sender, recipient, or mobile…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
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
            <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
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
                    <th className="text-left py-2 pr-4 font-medium">Date & Time</th>
                    <th className="text-left py-2 pr-4 font-medium">Sender</th>
                    <th className="text-left py-2 pr-4 font-medium">Recipient</th>
                    <th className="text-right py-2 pr-4 font-medium">Transfer ₹</th>
                    <th className="text-right py-2 pr-4 font-medium">Commission</th>
                    <th className="text-left py-2 font-medium">Added By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(entry => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {format(entry.createdAt.toDate(), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{entry.senderName}</p>
                        <p className="text-xs text-muted-foreground">{entry.senderMobile}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p>{entry.recipientName}</p>
                        <p className="text-xs text-muted-foreground">{entry.recipientNumber}</p>
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold tabular-nums">{formatCurrency(entry.transferAmount)}</td>
                      <td className="py-3 pr-4 text-right font-medium text-green-700 tabular-nums">{formatCurrency(entry.commission)}</td>
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
