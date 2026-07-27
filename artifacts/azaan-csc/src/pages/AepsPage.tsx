import { useState, useEffect } from 'react';
import { subscribeToAepsWithdrawals, createAepsWithdrawal, AepsWithdrawal } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isToday, isThisMonth, format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Plus, TrendingUp, IndianRupee, X, Loader2, Users, Banknote } from 'lucide-react';

function AepsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-xl flex gap-4 bg-card">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function AepsPage() {
  const [entries, setEntries] = useState<AepsWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { displayName } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({ customerName: '', bankName: '', mobile: '', amount: '', profitMargin: '' });

  useEffect(() => {
    const unsub = subscribeToAepsWithdrawals((data) => {
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
    if (!form.customerName || !form.bankName || !form.amount || !form.profitMargin) {
      toast({ variant: 'destructive', title: 'All required fields must be filled' });
      return;
    }
    setSubmitting(true);
    try {
      await createAepsWithdrawal({
        customerName: form.customerName.trim(),
        bankName: form.bankName.trim(),
        mobile: form.mobile.trim() || undefined,
        amount: parseFloat(form.amount),
        profitMargin: parseFloat(form.profitMargin),
        addedBy: displayName,
      });
      toast({ title: 'Withdrawal recorded', description: `${form.customerName} — ${formatCurrency(parseFloat(form.amount))}` });
      setForm({ customerName: '', bankName: '', mobile: '', amount: '', profitMargin: '' });
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
            <Wallet className="h-6 w-6 text-primary" /> AEPS Withdrawal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Aadhaar Enabled Payment System — track withdrawals & profit</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} className="gap-2 shrink-0">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'New Withdrawal'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {[
          { label: "Today's Withdrawals", value: formatCurrency(todayAmount), sub: `${todayEntries.length} transactions`, icon: Banknote, grad: 'stat-gradient-sky' },
          { label: "Today's Profit", value: formatCurrency(todayProfit), sub: 'Commission earned', icon: TrendingUp, grad: 'stat-gradient-emerald' },
          { label: 'Month Withdrawals', value: formatCurrency(monthAmount), sub: `${monthEntries.length} transactions`, icon: IndianRupee, grad: 'stat-gradient-indigo' },
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
            <Plus className="h-4 w-4 text-primary" /> Record New Withdrawal
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input className={inp} placeholder="Full name" value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Bank Name *</Label>
              <Input className={inp} placeholder="e.g. SBI, BOI" value={form.bankName}
                onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mobile (optional)</Label>
              <Input className={inp} placeholder="10-digit mobile" maxLength={10} value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Withdrawal Amount (₹) *</Label>
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
                <Input className={`${inp} pl-9`} type="number" placeholder="Commission earned" value={form.profitMargin}
                  onChange={e => setForm(f => ({ ...f, profitMargin: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting} className="w-full h-10 font-semibold">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Withdrawal
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b bg-muted/20 flex items-center justify-between">
          <span className="font-semibold text-sm">All Withdrawals</span>
          <span className="text-xs text-muted-foreground">{loading ? '...' : `${entries.length} total`}</span>
        </div>
        {loading ? (
          <div className="p-4"><AepsSkeleton /></div>
        ) : entries.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No withdrawals recorded yet</p>
            <p className="text-xs mt-1">Click "New Withdrawal" to add the first entry</p>
          </div>
        ) : (
          <div className="divide-y">
            {entries.map(entry => (
              <div key={entry.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm">{entry.customerName}</span>
                      {entry.mobile && <span className="text-xs text-muted-foreground ml-2">{entry.mobile}</span>}
                    </div>
                  </div>
                  <div className="ml-10 mt-0.5 text-xs text-muted-foreground">
                    {entry.bankName} · {format(entry.createdAt.toDate(), 'dd MMM yyyy, h:mm a')}
                  </div>
                </div>
                <div className="ml-10 sm:ml-0 flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Withdrawal</p>
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
