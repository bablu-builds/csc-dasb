import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { updateWorkEntry, subscribeToWorkEntries, WorkEntry, addPaymentToEntry } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { WorkEntryForm, WorkEntryFormData } from '@/components/WorkEntryForm';
<<<<<<< HEAD
import { ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, Plus, IndianRupee, CreditCard } from 'lucide-react';
=======
import { ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, UserCircle2 } from 'lucide-react';
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Timestamp } from 'firebase/firestore';
import { format, formatDistanceStrict } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

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
    if (!id) return;
    setIsSubmitting(true);
    try {
      // Note: addedBy is intentionally excluded from updates — it's set at creation only
      await updateWorkEntry(id, data);
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
      await addPaymentToEntry(id, { amount: amt, addedBy: displayName }, entry.totalAmount, entry.paidAmount);
      toast({ title: 'Payment Recorded', description: `${formatCurrency(amt)} added successfully.` });
      setPaymentOpen(false);
      setPaymentAmount('');
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

<<<<<<< HEAD
  // Payment history — merge legacy paidAmount with payments array
  const payments = entry.payments ?? [];
  const hasPaymentHistory = payments.length > 0;
=======
  const resolvedAt = entry.status === 'Completed' ? entry.completedAt : entry.status === 'Rejected' ? entry.rejectedAt : null;
  const duration = resolvedAt && entry.createdAt
    ? formatDistanceStrict(resolvedAt.toDate(), entry.createdAt.toDate())
    : null;
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466

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

<<<<<<< HEAD
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
            </div>
            {entry.status !== 'Rejected' && entry.dueAmount > 0 && (
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
                <div>
                  <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                  <span className="text-xs text-muted-foreground ml-3">
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
=======
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

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <WorkEntryForm 
          initialData={initialData} 
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting} 
        />
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
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
        <WorkEntryForm initialData={initialData} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Outstanding due: <span className="font-bold text-red-600">{formatCurrency(entry.dueAmount)}</span>
            </p>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Enter payment amount"
                className="pl-9"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                max={entry.dueAmount}
              />
            </div>
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
