import { useState, useEffect } from 'react';
import { WorkEntry, subscribeToWorkEntries } from '@/lib/firestore';
import { isToday, isThisMonth, differenceInDays, subDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee, Users, Clock, AlertTriangle, FileText, XCircle, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isConfigured } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// Demo data shown when Firebase is not yet connected
const DEMO_ENTRIES: WorkEntry[] = [
  { id: '1', customerName: 'Ravi Kumar', mobile: '9876543210', category: 'PAN Card', workDetail: 'New PAN card application', date: Timestamp.fromDate(new Date()), totalAmount: 150, paidAmount: 150, dueAmount: 0, status: 'Completed', address: 'Mohalla Ganj', createdAt: Timestamp.fromDate(new Date()) },
  { id: '2', customerName: 'Sunita Devi', mobile: '9123456780', category: 'Aadhar Card', workDetail: 'Address update', date: Timestamp.fromDate(subDays(new Date(), 2)), totalAmount: 100, paidAmount: 50, dueAmount: 50, status: 'Pending', address: 'Station Road', createdAt: Timestamp.fromDate(subDays(new Date(), 2)) },
  { id: '3', customerName: 'Mohd. Salim', mobile: '9988776655', category: 'Railway/Bus Ticket Booking', workDetail: 'Patna to Delhi - 2 tickets', date: Timestamp.fromDate(subDays(new Date(), 5)), totalAmount: 500, paidAmount: 300, dueAmount: 200, status: 'Pending', address: 'Civil Lines', createdAt: Timestamp.fromDate(subDays(new Date(), 5)) },
  { id: '4', customerName: 'Geeta Sharma', mobile: '9876500001', category: 'Jati Praman Patra', workDetail: 'Caste certificate for college', date: Timestamp.fromDate(subDays(new Date(), 9)), totalAmount: 200, paidAmount: 0, dueAmount: 200, status: 'Pending', address: 'Purana Bazar', createdAt: Timestamp.fromDate(subDays(new Date(), 9)) },
  { id: '5', customerName: 'Ajay Singh', mobile: '9012345678', category: 'Driving Licence (DL)', workDetail: 'DL renewal', date: Timestamp.fromDate(new Date()), totalAmount: 300, paidAmount: 300, dueAmount: 0, status: 'Completed', address: 'Shastri Nagar', createdAt: Timestamp.fromDate(new Date()) },
  { id: '6', customerName: 'Priya Yadav', mobile: '8800123456', category: 'Bijli Bill Payment', workDetail: 'July electricity bill', date: Timestamp.fromDate(subDays(new Date(), 1)), totalAmount: 850, paidAmount: 850, dueAmount: 0, status: 'Completed', address: 'Nehru Colony', createdAt: Timestamp.fromDate(subDays(new Date(), 1)) },
  { id: '7', customerName: 'Ramesh Paswan', mobile: '7700654321', category: 'Ration Card', workDetail: 'New ration card member addition', date: Timestamp.fromDate(subDays(new Date(), 12)), totalAmount: 250, paidAmount: 100, dueAmount: 150, status: 'Pending', address: 'Indira Nagar', createdAt: Timestamp.fromDate(subDays(new Date(), 12)) },
  { id: '8', customerName: 'Salma Begum', mobile: '9900112233', category: 'Voter ID Card', workDetail: 'New voter card', date: Timestamp.fromDate(subDays(new Date(), 3)), totalAmount: 150, paidAmount: 100, dueAmount: 0, status: 'Rejected', address: 'Qazi Mohalla', createdAt: Timestamp.fromDate(subDays(new Date(), 3)), rejectionReason: 'Wrong documents', refundAmount: 100 },
];

function StatusBadge({ status }: { status: WorkEntry['status'] }) {
  if (status === 'Completed') return <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 text-xs">Completed</Badge>;
  if (status === 'Rejected') return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 text-xs">Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent text-xs">Pending</Badge>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-20 mb-1" /><Skeleton className="h-3 w-16" /></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setEntries(DEMO_ENTRIES);
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToWorkEntries((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const today = new Date();

  const todaysEarnings = entries
    .filter(e => isToday(e.date.toDate()) && e.status !== 'Rejected')
    .reduce((sum, e) => sum + e.paidAmount, 0);

  const monthEarnings = entries
    .filter(e => isThisMonth(e.date.toDate()) && e.status !== 'Rejected')
    .reduce((sum, e) => sum + e.paidAmount, 0);

  const uniqueCustomers = new Set(entries.map(e => e.mobile)).size;
  const pendingCount = entries.filter(e => e.status === 'Pending').length;
  const totalDue = entries.reduce((sum, e) => sum + e.dueAmount, 0);
  const rejectedEntries = entries.filter(e => e.status === 'Rejected');
  const rejectedCount = rejectedEntries.length;
  const totalRefunded = rejectedEntries.reduce((sum, e) => sum + (e.refundAmount || 0), 0);

  // Last 7 days earnings chart data
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const day = subDays(today, 6 - i);
    const dayStr = format(day, 'dd MMM');
    const earned = entries
      .filter(e => {
        const d = e.date.toDate();
        return format(d, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') && e.status !== 'Rejected';
      })
      .reduce((sum, e) => sum + e.paidAmount, 0);
    return { day: dayStr, earned };
  });

  // Pending entries sorted by urgency
  const pendingEntries = entries
    .filter(e => e.status === 'Pending')
    .map(e => ({ ...e, daysPending: differenceInDays(today, e.date.toDate()) }))
    .sort((a, b) => b.daysPending - a.daysPending)
    .slice(0, 8);

  // Recent activity: last 8 entries by createdAt
  const recentEntries = [...entries]
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
    .slice(0, 8);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Link href="/work/new">
          <Button size="sm">+ Add Work Entry</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-primary/5 border-primary/20 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-primary uppercase tracking-wide">Today's Earning</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(todaysEarnings)}</div>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This Month</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthEarnings)}</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly earned</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customers</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique customers</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending</CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Incomplete work</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm hover:shadow-md transition-shadow ${totalDue > 0 ? 'bg-red-50 border-red-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-xs font-medium uppercase tracking-wide ${totalDue > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>Total Due</CardTitle>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${totalDue > 0 ? 'bg-red-100' : 'bg-muted'}`}>
              <AlertTriangle className={`h-4 w-4 ${totalDue > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDue > 0 ? 'text-red-700' : ''}`}>{formatCurrency(totalDue)}</div>
            <p className={`text-xs mt-1 ${totalDue > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>Outstanding dues</p>
          </CardContent>
        </Card>

        <Card className={`shadow-sm hover:shadow-md transition-shadow ${rejectedCount > 0 ? 'bg-slate-50 border-slate-200' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rejected</CardTitle>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">{rejectedCount}</div>
            <p className="text-xs mt-1 text-slate-500">
              {totalRefunded > 0 ? `${formatCurrency(totalRefunded)} refunded` : 'No refunds'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Earnings — Last 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.every(d => d.earned === 0) ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No earnings data yet — add work entries to see the chart</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v === 0 ? '0' : `₹${(v / 1000).toFixed(v >= 1000 ? 1 : 0)}${v >= 1000 ? 'k' : ''}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Earned']}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="earned" fill="hsl(221 79% 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Pending Work */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Urgent Pending Work
            </h2>
            <Link href="/pending">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>

          <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
            {pendingEntries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
                <p className="font-medium text-sm">All clear!</p>
                <p className="text-xs mt-1">No pending work right now</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingEntries.map(entry => {
                  const isVeryUrgent = entry.daysPending > 7;
                  const isUrgent = entry.daysPending >= 3 && entry.daysPending <= 7;
                  return (
                    <div
                      key={entry.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors
                        ${isVeryUrgent ? 'bg-red-50/60 hover:bg-red-50' : ''}
                        ${isUrgent ? 'bg-amber-50/60 hover:bg-amber-50' : ''}
                        ${!isVeryUrgent && !isUrgent ? 'hover:bg-muted/40' : ''}
                      `}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{entry.customerName}</span>
                          <span className="text-xs text-muted-foreground font-mono hidden sm:block">{entry.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{entry.category}</span>
                          <span className={`text-xs font-medium ${isVeryUrgent ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-blue-600'}`}>
                            {entry.daysPending > 0 ? `${entry.daysPending}d pending` : 'Today'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {entry.dueAmount > 0 && (
                          <span className="font-bold text-red-600 text-sm">{formatCurrency(entry.dueAmount)}</span>
                        )}
                        <Link href={`/work/${entry.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs">Update</Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Activity
            </h2>
            <Link href="/work">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>

          <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
            {recentEntries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <FileText className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No entries yet</p>
                <p className="text-xs mt-1">Click "Add Work Entry" to get started</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentEntries.map(entry => (
                  <div key={entry.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{entry.customerName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{entry.category}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{format(entry.date.toDate(), 'dd MMM')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{formatCurrency(entry.totalAmount)}</span>
                      <StatusBadge status={entry.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
