import { useState, useEffect, useMemo } from 'react';
import { subscribeToWorkEntries, deleteWorkEntry, WorkEntry } from '@/lib/firestore';
import { useSettings } from '@/contexts/SettingsContext';
import { format, formatDistanceStrict } from 'date-fns';
import { Link } from 'wouter';
import {
  Search, MoreHorizontal, Edit, Trash2, History, Clock, CheckCircle2, XCircle,
  ArrowUpDown, ArrowUp, ArrowDown, PlusCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';

type SortField = 'date' | 'totalAmount' | 'dueAmount' | 'status' | 'customerName';
type SortDir = 'asc' | 'desc';

function StatusBadge({ status }: { status: WorkEntry['status'] }) {
  if (status === 'Completed') return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200">Completed</Badge>;
  if (status === 'Rejected') return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200">Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent">Pending</Badge>;
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
  return dir === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" />
    : <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b">
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-32 mb-1" /><Skeleton className="h-3 w-24" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
          <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-20 mx-auto rounded-full" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-7 w-7 ml-auto rounded" /></td>
        </tr>
      ))}
    </>
  );
}

export default function WorkListPage() {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const { categories } = useSettings();
  const { toast } = useToast();

  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [selectedMobile, setSelectedMobile] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToWorkEntries((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteWorkEntry(entryToDelete);
      toast({ title: 'Entry deleted', description: 'Work entry removed successfully.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error deleting', description: err.message });
    } finally {
      setEntryToDelete(null);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const filtered = entries.filter(e => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q ||
        e.customerName.toLowerCase().includes(q) ||
        e.mobile.includes(q) ||
        e.category.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.toMillis() - b.date.toMillis();
      else if (sortField === 'totalAmount') cmp = a.totalAmount - b.totalAmount;
      else if (sortField === 'dueAmount') cmp = a.dueAmount - b.dueAmount;
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'customerName') cmp = a.customerName.localeCompare(b.customerName);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [entries, searchTerm, statusFilter, categoryFilter, sortField, sortDir]);

  const mobileHistoryEntries = selectedMobile ? entries.filter(e => e.mobile === selectedMobile) : [];

  const ThHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} current={sortField} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Work</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? 'Loading...' : `${filteredAndSorted.length} of ${entries.length} entries`}
          </p>
        </div>
        <Link href="/work/new">
          <Button className="gap-2"><PlusCircle className="h-4 w-4" />Add New Entry</Button>
        </Link>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, mobile, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
              <tr>
                <ThHeader field="date" label="Date" />
                <ThHeader field="customerName" label="Customer" />
                <th className="px-4 py-3 font-medium">Category</th>
                <ThHeader field="totalAmount" label="Total" className="text-right" />
                <ThHeader field="dueAmount" label="Due" className="text-right" />
                <ThHeader field="status" label="Status" className="text-center" />
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Search className="h-10 w-10 mb-3 opacity-20" />
                      <p className="font-medium">No entries found</p>
                      <p className="text-xs mt-1">
                        {entries.length === 0
                          ? 'Add your first work entry to get started'
                          : 'Try adjusting your search or filters'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map(entry => (
                  <tr
                    key={entry.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${entry.status === 'Rejected' ? 'opacity-70' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {format(entry.date.toDate(), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{entry.customerName}</div>
                      <button
                        onClick={() => setSelectedMobile(entry.mobile)}
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <History className="h-3 w-3" />
                        {entry.mobile}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-normal">{entry.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(entry.totalAmount)}
                      {entry.status === 'Rejected' && entry.refundAmount ? (
                        <span className="block text-xs text-red-500 font-normal">Refund: {formatCurrency(entry.refundAmount)}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.dueAmount > 0 ? (
                        <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          {formatCurrency(entry.dueAmount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/work/${entry.id}/edit`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" /> Update
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setEntryToDelete(entry.id!)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this work entry and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer History Modal */}
      <Dialog open={!!selectedMobile} onOpenChange={(open) => !open && setSelectedMobile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Customer History: <span className="font-mono text-primary">{selectedMobile}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {mobileHistoryEntries.map(entry => {
              const resolvedAt = entry.status === 'Completed' ? entry.completedAt : entry.status === 'Rejected' ? entry.rejectedAt : null;
              const duration = resolvedAt && entry.createdAt
                ? formatDistanceStrict(resolvedAt.toDate(), entry.createdAt.toDate())
                : null;
              return (
                <div key={entry.id} className={`border rounded-lg p-4 space-y-3 ${entry.status === 'Rejected' ? 'border-red-200 bg-red-50/30' : ''}`}>
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                      <div className="font-semibold">{entry.customerName}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{format(entry.date.toDate(), 'dd MMM yyyy')}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary">{entry.category}</Badge>
                        <StatusBadge status={entry.status} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium">Total: {formatCurrency(entry.totalAmount)}</div>
                      {entry.dueAmount > 0 && <div className="text-sm text-red-600 mt-0.5">Due: {formatCurrency(entry.dueAmount)}</div>}
                      {entry.status === 'Rejected' && entry.refundAmount
                        ? <div className="text-sm text-red-600 mt-0.5">Refund: {formatCurrency(entry.refundAmount)}</div>
                        : null}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    {entry.createdAt && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Created: {format(entry.createdAt.toDate(), 'dd MMM yyyy, h:mm a')}
                      </div>
                    )}
                    {entry.status === 'Completed' && entry.completedAt ? (
                      <div className="flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed: {format(entry.completedAt.toDate(), 'dd MMM yyyy, h:mm a')}
                        {duration && <span className="ml-1 text-muted-foreground">(in {duration})</span>}
                      </div>
                    ) : entry.status === 'Rejected' && entry.rejectedAt ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-red-700">
                          <XCircle className="h-3 w-3" />
                          Rejected: {format(entry.rejectedAt.toDate(), 'dd MMM yyyy, h:mm a')}
                          {duration && <span className="ml-1 text-muted-foreground">(after {duration})</span>}
                        </div>
                        {entry.rejectionReason && <div className="text-muted-foreground ml-4">Reason: {entry.rejectionReason}</div>}
                      </div>
                    ) : entry.status === 'Pending' ? (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Clock className="h-3 w-3" />
                        Still pending
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
