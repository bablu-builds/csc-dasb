import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { updateWorkEntry, subscribeToWorkEntries, WorkEntry } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { WorkEntryForm, WorkEntryFormData } from '@/components/WorkEntryForm';
import { ArrowLeft, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
