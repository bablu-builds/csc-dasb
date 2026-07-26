import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { updateWorkEntry, subscribeToWorkEntries, WorkEntry } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { WorkEntryForm, WorkEntryFormData } from '@/components/WorkEntryForm';
import { ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Timestamp } from 'firebase/firestore';
import { format, formatDistanceStrict } from 'date-fns';

export default function EditWorkPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entry, setEntry] = useState<WorkEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToWorkEntries((entries) => {
      const found = entries.find(e => e.id === id);
      if (found) {
        setEntry(found);
      }
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
      toast({
        title: "Work Updated Successfully",
      });
      setLocation('/work');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating work",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="text-center p-12">
        <h2 className="text-xl font-bold">Entry not found</h2>
        <Button onClick={() => setLocation('/work')} className="mt-4">Back to Work List</Button>
      </div>
    );
  }

  const initialData: Partial<WorkEntryFormData> = {
    ...entry,
    date: entry.date.toDate(),
  };

  const resolvedAt = entry.status === 'Completed' ? entry.completedAt : entry.status === 'Rejected' ? entry.rejectedAt : null;
  const duration = resolvedAt && entry.createdAt
    ? formatDistanceStrict(resolvedAt.toDate(), entry.createdAt.toDate())
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Work Entry</h1>
          <p className="text-muted-foreground">Update the details below</p>
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

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <WorkEntryForm 
          initialData={initialData} 
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting} 
        />
      </div>
    </div>
  );
}
