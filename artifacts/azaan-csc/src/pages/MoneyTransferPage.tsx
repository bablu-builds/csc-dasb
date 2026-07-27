import { useState, useEffect } from 'react';
import { subscribeToMoneyTransfers, createMoneyTransfer, MoneyTransfer } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isToday, isThisMonth, format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
    </div>
  );
}

export default function MoneyTransferPage() {
  const [entries, setEntries] = useState<MoneyTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { displayName } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ name: '', mobileOrAccount: '', amount: '', profitMargin: '' });

  useEffect(() => {
    const unsub = subscribeToMoneyTransfers((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsub();
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
      setShowForm(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

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
        </Button>
      </div>

      {/* Summary Cards */}
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
    </div>
  );
}
