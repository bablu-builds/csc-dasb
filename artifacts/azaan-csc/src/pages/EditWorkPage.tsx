import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { updateWorkEntry, subscribeToWorkEntries, WorkEntry, addPaymentToEntry } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { WorkEntryForm, WorkEntryFormData } from '@/components/WorkEntryForm';
import { ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, Plus, IndianRupee, CreditCard, UserCircle2, Banknote, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Timestamp } from 'firebase/firestore';
import { format, formatDistanceStrict } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Small badge showing Cash (green) or Online (blue) payment mode. */
function PaymentModeBadge({ mode }: { mode?: 'Cash' | 'Online' }) {
  const m = mode ?? 'Cash';
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
      m === 'Online' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
    )}>
      {m === 'Online' ? <Wifi className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
      {m}
    </span>
  );
}

export default function EditWorkPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { displayName } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entry, setEntry] = useState<WorkEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online'>('Cash');
  const [addingPayment, setAddingPayment] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToWorkEntries((entries) => {
      const found = entries.find(e => e.id === id);
      if (found) setEntry(found);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleSubmit = async (data: Omit<WorkEntryFormData, 'date'> & { date: Timestamp }) => {
    if (!id || !entry) return;
    setIsSubmitting(true);
    try {
      // Strip paidAmount and paymentMode — payments are managed exclusively via the Payment History section.
      const { paidAmount: _ignored, paymentMode: _pm, ...updateData } = data;
      await updateWorkEntry(id, updateData, entry.paidAmount);
      toast({ title: "Work Updated Successfully" });
      setLocation('/work');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error updating work", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPayment = async () => {
    if (!id || !entry || !paymentAmount) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;
    setAddingPayment(true);
    try {
      await addPaymentToEntry(id, { amount: amt, addedBy: displayName, paymentMode }, entry.totalAmount, entry.paidAmount);
      toast({ title: 'Payment Recorded', description: `${formatCurrency(amt)} (${paymentMode}) added successfully.` });
      setPaymentOpen(false);
      setPaymentAmount('');
      setPaymentMode('Cash');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setAddingPayment(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center p-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!entry) return (
    <div className="text-center p-16">
      <h2 className="text-xl font-bold">Entry not found</h2>
      <Button onClick={() => setLocation('/work')} className="mt-4">Back to Work List</Button>
    </div>
  );

  const initialData: Partial<WorkEntryFormData> = {
    ...entry,
    challanAmount: entry.challanAmount ?? 0,
    date: entry.date.toDate(),
  };

  // Payment history — merge legacy paidAmount with payments array
  const payments = entry.payments ?? [];
  const hasPaymentHistory = payments.length > 0;

  // Duration calculation for completed/rejected entries
  const resolvedAt = entry.status === 'Completed' ? entry.completedAt : entry.status === 'Rejected' ? entry.rejectedAt : null;
  const duration = resolvedAt && entry.createdAt
    ? formatDistanceStrict(resolvedAt.toDate(), entry.createdAt.toDate())
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--app-font-display)' }}>Edit Work Entry</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{entry.customerName} — {entry.category}</p>
        </div>
      </div>

      {/* Entry metadata — read-only info strip */}
      <div className="bg-muted/40 border rounded-lg px-4 py-3 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1.5">
        {entry.addedBy && (
          <span className="flex items-center gap-1.5">
            <UserCircle2 className="h-3.5 w-3.5" />
            Added by: <span className="font-medium text-foreground">{entry.addedBy}</span>
          </span>
        )}
        {entry.createdAt && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Created: {format(entry.createdAt.toDate(), 'dd MMM yyyy, h:mm a')}
          </span>
        )}
        {entry.status === 'Completed' && entry.completedAt && (
          <span className="flex items-center gap-1.5 text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed: {format(entry.completedAt.toDate(), 'dd MMM yyyy, h:mm a')}
            {duration && <span className="text-muted-foreground ml-1">(in {duration})</span>}
          </span>
        )}
        {entry.status === 'Rejected' && entry.rejectedAt && (
          <span className="flex items-center gap-1.5 text-red-700">
            <XCircle className="h-3.5 w-3.5" />
            Rejected: {format(entry.rejectedAt.toDate(), 'dd MMM yyyy, h:mm a')}
            {duration && <span className="text-muted-foreground ml-1">(after {duration})</span>}
          </span>
        )}
      </div>

      {/* Payment history card */}
      <div className="bg-card border rounded-xl shadow-card">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Payment History</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="ml-2 font-bold text-sm">{formatCurrency(entry.totalAmount)}</span>
              {entry.dueAmount > 0 && (
                <span className="ml-3 text-red-600 font-semibold text-sm">Due: {formatCurrency(entry.dueAmount)}</span>
              )}
              {entry.dueAmount < 0 && (
                <span className="ml-3 text-blue-600 font-semibold text-sm">
                  Overpaid by {formatCurrency(Math.abs(entry.dueAmount))}
                </span>
              )}
            </div>
            {/* Show "Add Payment" for all non-Rejected entries — overpayment is allowed */}
            {entry.status !== 'Rejected' && (
              <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setPaymentOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Payment
              </Button>
            )}
          </div>
        </div>

        <div className="divide-y">
          {!hasPaymentHistory ? (
            <div className="px-6 py-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <IndianRupee className="h-3.5 w-3.5" />
                Initial: {formatCurrency(entry.paidAmount)} on {format(entry.createdAt?.toDate() ?? new Date(), 'dd MMM yyyy')}
              </span>
            </div>
          ) : (
            payments.map((p, i) => (
              <div key={i} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                  <PaymentModeBadge mode={p.paymentMode} />
                  <span className="text-xs text-muted-foreground">
                    {p.paidAt ? format(p.paidAt.toDate(), 'dd MMM yyyy, h:mm a') : 'Legacy entry'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{p.addedBy}</span>
              </div>
            ))
          )}
        </div>

        {hasPaymentHistory && entry.paidAmount > 0 && (
          <div className="px-6 py-3 border-t bg-muted/20 flex justify-between text-sm">
            <span className="font-semibold">Total Paid</span>
            <span className="font-bold text-emerald-700">{formatCurrency(entry.paidAmount)}</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-card border rounded-xl shadow-card px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Status Timeline</p>
        <div className="space-y-2">
          {entry.createdAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Created: {format(entry.createdAt.toDate(), 'dd MMM yyyy, h:mm a')}
            </div>
          )}
          {entry.status === 'Completed' && entry.completedAt && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed: {format(entry.completedAt.toDate(), 'dd MMM yyyy, h:mm a')}
              {entry.createdAt && (
                <span className="text-muted-foreground font-normal ml-1">
                  (in {formatDistanceStrict(entry.completedAt.toDate(), entry.createdAt.toDate())})
                </span>
              )}
            </div>
          )}
          {entry.status === 'Rejected' && entry.rejectedAt && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-red-700 font-medium">
                <XCircle className="h-3.5 w-3.5" />
                Rejected: {format(entry.rejectedAt.toDate(), 'dd MMM yyyy, h:mm a')}
              </div>
              {entry.rejectionReason && (
                <p className="text-xs text-muted-foreground ml-5">Reason: {entry.rejectionReason}</p>
              )}
              {entry.refundAmount ? (
                <p className="text-xs text-red-500 ml-5">Refund: {formatCurrency(entry.refundAmount)}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-card border rounded-xl p-6 shadow-card">
        <p className="text-sm font-semibold mb-5 text-muted-foreground uppercase tracking-wide text-xs">Update Entry Details</p>
        <WorkEntryForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEditing={true}
          currentPaidAmount={entry.paidAmount}
        />
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={(open) => {
        setPaymentOpen(open);
        if (!open) { setPaymentAmount(''); setPaymentMode('Cash'); }
      }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {entry.dueAmount > 0 ? (
              <p className="text-sm text-muted-foreground">
                Outstanding due: <span className="font-bold text-red-600">{formatCurrency(entry.dueAmount)}</span>
              </p>
            ) : entry.dueAmount < 0 ? (
              <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                This entry is already overpaid by <strong>{formatCurrency(Math.abs(entry.dueAmount))}</strong>. Recording another payment will increase the credit.
              </p>
            ) : (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                This entry is fully paid. Recording a payment will create an overpayment/credit.
              </p>
            )}

            {/* Amount */}
            <div className="relative">
              <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Enter payment amount"
                className="pl-9"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                onFocus={e => e.target.select()}
                min={0}
              />
            </div>

            {/* Payment Mode toggle */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Payment Mode</p>
              <div className="flex h-9 rounded-md border border-border overflow-hidden">
                <button type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors",
                    paymentMode === 'Cash'
                      ? "bg-emerald-600 text-white"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}>
                  <Banknote className="h-3.5 w-3.5" /> Cash
                </button>
                <button type="button"
                  onClick={() => setPaymentMode('Online')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors border-l border-border",
                    paymentMode === 'Online'
                      ? "bg-blue-600 text-white"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}>
                  <Wifi className="h-3.5 w-3.5" /> Online
                </button>
              </div>
            </div>

            {/* Soft warning when payment exceeds outstanding due */}
            {paymentAmount && entry.dueAmount > 0 && parseFloat(paymentAmount) > entry.dueAmount && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                ⚠ This payment exceeds the outstanding due by{' '}
                <strong>{formatCurrency(parseFloat(paymentAmount) - entry.dueAmount)}</strong> — the entry will be marked as overpaid.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Recorded by: <strong>{displayName}</strong> · Date/time auto-set
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={addingPayment || !paymentAmount}>
              {addingPayment && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
