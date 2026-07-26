import { useState, useEffect } from 'react';
import { WorkEntry } from '@/lib/firestore';
import { subscribeToDeletedEntries, restoreWorkEntry } from '@/lib/firestore';
import { format } from 'date-fns';
import { Trash2, RotateCcw, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';

function StatusBadge({ status }: { status: WorkEntry['status'] }) {
  if (status === 'Completed') return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-xs">Completed</Badge>;
  if (status === 'Rejected') return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 text-xs">Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent text-xs">Pending</Badge>;
}

export default function DeletedItemsPage() {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeToDeletedEntries((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRestore = async (entry: WorkEntry) => {
    if (!entry.id) return;
    setRestoringId(entry.id);
    try {
      await restoreWorkEntry(entry.id);
      toast({
        title: 'Entry Restored',
        description: `${entry.customerName} — ${entry.category} has been moved back to the active list.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error restoring entry', description: err.message });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-muted-foreground" />
          Deleted Items
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deleted entries are kept here safely — restore any item to bring it back.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        <strong>Recycle Bin:</strong> Nothing here is permanently deleted. Click <strong>Restore</strong> on any entry to move it back to your active work list.
      </div>

      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <PackageOpen className="h-7 w-7 opacity-40" />
            </div>
            <p className="font-medium">Recycle bin is empty</p>
            <p className="text-xs mt-1">Deleted work entries will appear here</p>
          </div>
        ) : (
          <div className="divide-y">
            {entries.map(entry => (
              <div key={entry.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{entry.customerName}</span>
                    <span className="text-sm text-muted-foreground font-mono">{entry.mobile}</span>
                    <StatusBadge status={entry.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="font-normal text-xs">{entry.category}</Badge>
                    <span>Total: <span className="font-medium text-foreground">{formatCurrency(entry.totalAmount)}</span></span>
                    {entry.dueAmount > 0 && (
                      <span className="text-red-600">Due: {formatCurrency(entry.dueAmount)}</span>
                    )}
                    <span>Work date: {format(entry.date.toDate(), 'dd MMM yyyy')}</span>
                  </div>
                  {entry.deletedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Deleted on {format(entry.deletedAt.toDate(), 'dd MMM yyyy, h:mm a')}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => handleRestore(entry)}
                  disabled={restoringId === entry.id}
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${restoringId === entry.id ? 'animate-spin' : ''}`} />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && entries.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {entries.length} deleted {entries.length === 1 ? 'entry' : 'entries'} — all recoverable
        </p>
      )}
    </div>
  );
}
