import { useState, useEffect } from 'react';
import { subscribeToWorkEntries, WorkEntry } from '@/lib/firestore';
import { format, differenceInDays } from 'date-fns';
import { Link } from 'wouter';
import { Search, Clock, Phone, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/contexts/SettingsContext';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';

function PendingSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 md:p-6 flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-7 w-28 rounded" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-full max-w-xs" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-9 w-28 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PendingWorkPage() {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const { categories } = useSettings();

  useEffect(() => {
    const unsubscribe = subscribeToWorkEntries((data) => {
      setEntries(data.filter(e => e.status === 'Pending'));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const today = new Date();

  const filteredEntries = entries
    .map(e => ({ ...e, daysPending: differenceInDays(today, e.date.toDate()) }))
    .filter(e => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q || e.customerName.toLowerCase().includes(q) || e.mobile.includes(q);
      const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => b.daysPending - a.daysPending);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-amber-700 flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Pending Work
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? 'Loading...' : `${filteredEntries.length} pending entries`}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3 bg-muted/20">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-background">
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

        <div className="divide-y">
          {loading ? (
            <PendingSkeleton />
          ) : filteredEntries.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 text-green-600 mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="text-lg font-medium">
                {entries.length === 0 ? 'No pending work!' : 'No results found'}
              </p>
              <p className="text-sm mt-1">
                {entries.length === 0
                  ? 'All work is completed — great job!'
                  : 'Try clearing your search or category filter'}
              </p>
            </div>
          ) : (
            filteredEntries.map(entry => {
              const isVeryUrgent = entry.daysPending > 7;
              const isUrgent = entry.daysPending >= 3 && entry.daysPending <= 7;

              return (
                <div
                  key={entry.id}
                  className={`p-4 md:p-6 flex flex-col md:flex-row gap-6 transition-colors
                    ${isVeryUrgent ? 'bg-red-50/40 hover:bg-red-50/70' : ''}
                    ${isUrgent ? 'bg-amber-50/40 hover:bg-amber-50/70' : ''}
                    ${!isVeryUrgent && !isUrgent ? 'hover:bg-muted/30' : ''}
                  `}
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <h3 className="font-bold text-lg">{entry.customerName}</h3>
                      <div className="flex items-center text-muted-foreground text-sm bg-background px-2 py-1 rounded border w-fit">
                        <Phone className="h-3 w-3 mr-1.5" />
                        {entry.mobile}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                      <Badge variant="secondary">{entry.category}</Badge>
                      <span className="text-muted-foreground">
                        Added: {format(entry.date.toDate(), 'dd MMM yyyy')}
                      </span>
                    </div>

                    {entry.workDetail && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">
                        {entry.workDetail}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col justify-between items-end gap-4 min-w-[180px]">
                    <div className="w-full sm:w-auto md:w-full flex justify-between md:justify-end items-center gap-4">
                      <div className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-full text-xs border
                        ${isVeryUrgent ? 'text-red-700 bg-red-100 border-red-200' :
                          isUrgent ? 'text-amber-700 bg-amber-100 border-amber-200' :
                          entry.daysPending === 0 ? 'text-green-700 bg-green-100 border-green-200' :
                          'text-blue-700 bg-blue-100 border-blue-200'}
                      `}>
                        <Clock className="h-3.5 w-3.5" />
                        {entry.daysPending > 0 ? `${entry.daysPending} days` : 'Today'}
                      </div>

                      {entry.dueAmount > 0 && (
                        <div className="text-right">
                          <span className="block text-xs text-red-500 font-medium">Due</span>
                          <span className="font-bold text-red-600 text-lg">{formatCurrency(entry.dueAmount)}</span>
                        </div>
                      )}
                    </div>

                    <Link href={`/work/${entry.id}/edit`} className="w-full sm:w-auto">
                      <Button
                        className="w-full"
                        variant={isVeryUrgent ? 'destructive' : 'default'}
                      >
                        Update Status
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
