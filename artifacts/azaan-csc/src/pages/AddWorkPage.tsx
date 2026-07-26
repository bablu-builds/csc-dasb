import { useState } from 'react';
import { useLocation } from 'wouter';
import { createWorkEntry } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { WorkEntryForm, WorkEntryFormData } from '@/components/WorkEntryForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Timestamp } from 'firebase/firestore';

export default function AddWorkPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Omit<WorkEntryFormData, 'date'> & { date: Timestamp }) => {
    setIsSubmitting(true);
    try {
      await createWorkEntry(data);
      toast({
        title: "Work Added Successfully",
        description: `${data.customerName} - ${data.category}`,
      });
      setLocation('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving work",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Work Entry</h1>
          <p className="text-muted-foreground">Fill in the customer and work details below</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <WorkEntryForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
