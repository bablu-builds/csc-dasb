import { useState, useEffect } from 'react';
import { subscribeToWorkEntries, deleteWorkEntry, WorkEntry } from '@/lib/firestore';
import { useSettings } from '@/contexts/SettingsContext';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { Search, Filter, MoreHorizontal, Edit, Trash2, IndianRupee, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function WorkListPage() {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const { categories } = useSettings();
  const { toast } = useToast();
  
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  
  // Mobile Number History Modal state
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
      toast({ title: "Entry deleted successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error deleting", description: err.message });
    } finally {
      setEntryToDelete(null);
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = 
      e.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.mobile.includes(searchTerm) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const mobileHistoryEntries = selectedMobile ? entries.filter(e => e.mobile === selectedMobile) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Work</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and view all customer requests</p>
        </div>
        <Link href="/work/new">
          <Button>Add New Entry</Button>
        </Link>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, mobile, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
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
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Total ₹</th>
                <th className="px-4 py-3 font-medium text-right">Due ₹</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground animate-pulse">Loading...</td></tr>
              ) : filteredEntries.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No entries found</td></tr>
              ) : (
                filteredEntries.map(entry => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    <td className="px-4 py-3 text-right">
                      {entry.totalAmount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {entry.dueAmount > 0 ? (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-sm">{entry.dueAmount}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={entry.status === 'Completed' ? 'outline' : 'default'} 
                        className={entry.status === 'Pending' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent' : 'text-green-700 bg-green-50 border-green-200'}
                      >
                        {entry.status === 'Pending' ? 'Pending' : 'Completed'}
                      </Badge>
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this work entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedMobile} onOpenChange={(open) => !open && setSelectedMobile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Customer History: <span className="font-mono text-primary">{selectedMobile}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {mobileHistoryEntries.map(entry => (
              <div key={entry.id} className="border rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="font-semibold">{entry.customerName}</div>
                  <div className="text-sm text-muted-foreground mt-1">{format(entry.date.toDate(), 'dd MMM yyyy')}</div>
                  <div className="mt-2"><Badge variant="secondary">{entry.category}</Badge></div>
                </div>
                <div className="text-right flex flex-col justify-between">
                  <div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${entry.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {entry.status}
                    </span>
                  </div>
                  <div className="mt-3 text-sm">
                    Total: ₹{entry.totalAmount}
                    {entry.dueAmount > 0 && <span className="text-red-600 ml-2 block sm:inline">Due: ₹{entry.dueAmount}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
