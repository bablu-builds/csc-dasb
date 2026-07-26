import { useState, useEffect } from 'react';
import { subscribeToWorkEntries, WorkEntry } from '@/lib/firestore';
import { isToday, isThisWeek, isThisMonth, format } from 'date-fns';
import { Download, BarChart2, TrendingUp, IndianRupee, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ReportsPage() {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToWorkEntries((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const exportCSV = () => {
    const headers = [
      'Date', 'Customer Name', 'Mobile', 'Category', 'Work Detail',
      'Total Amount', 'Paid Amount', 'Due Amount', 'Status', 'Address',
      'Created At', 'Completed At', 'Rejected At', 'Rejection Reason', 'Refund Amount',
    ];
    const rows = entries.map(e => [
      format(e.date.toDate(), 'yyyy-MM-dd'),
      `"${e.customerName}"`,
      e.mobile,
      `"${e.category}"`,
      `"${e.workDetail || ''}"`,
      e.totalAmount,
      e.paidAmount,
      e.dueAmount,
      e.status,
      `"${e.address || ''}"`,
      e.createdAt ? format(e.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
      e.completedAt ? format(e.completedAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
      e.rejectedAt ? format(e.rejectedAt.toDate(), 'yyyy-MM-dd HH:mm') : '',
      `"${e.rejectionReason || ''}"`,
      e.refundAmount ?? '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `csc_report_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ReportView = ({ periodEntries }: { periodEntries: WorkEntry[] }) => {
    // Rejected entries are tracked separately so they don't skew earnings
    const rejectedEntries = periodEntries.filter(e => e.status === 'Rejected');
    const activeEntries = periodEntries.filter(e => e.status !== 'Rejected');

    const totalEarned = activeEntries.reduce((sum, e) => sum + e.paidAmount, 0);
    const totalDues = activeEntries.reduce((sum, e) => sum + e.dueAmount, 0);
    const totalEntries = activeEntries.length;

    const rejectedCount = rejectedEntries.length;
    const totalRefunded = rejectedEntries.reduce((sum, e) => sum + (e.refundAmount || 0), 0);

    // Category breakdown (excluding rejected)
    const categoryStats = activeEntries.reduce((acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = { count: 0, earned: 0 };
      }
      acc[entry.category].count += 1;
      acc[entry.category].earned += entry.paidAmount;
      return acc;
    }, {} as Record<string, { count: number, earned: number }>);

    const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1].earned - a[1].earned);

    return (
      <div className="space-y-6 mt-4">
        {/* Main stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">₹{totalEarned}</div>
              <p className="text-xs text-muted-foreground mt-1">Excludes refunded/rejected work</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Work Entries</CardTitle>
              <BarChart2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{totalEntries} entries</div>
              <p className="text-xs text-muted-foreground mt-1">Pending + completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Dues Outstanding</CardTitle>
              <IndianRupee className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">₹{totalDues}</div>
            </CardContent>
          </Card>
        </div>

        {/* Rejected / Refunded breakdown */}
        {(rejectedCount > 0 || true) && (
          <Card className="border-slate-200 bg-slate-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Rejected / Refunded Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rejectedCount === 0 ? (
                <p className="text-sm text-muted-foreground">No rejected entries in this period.</p>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-2xl font-bold text-slate-700">{rejectedCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Rejected entries</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-700">₹{totalRefunded}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total refunded</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedCategories.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No data for this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-2 font-medium">Category</th>
                      <th className="text-right pb-2 font-medium">Count</th>
                      <th className="text-right pb-2 font-medium">Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedCategories.map(([category, stats]) => (
                      <tr key={category}>
                        <td className="py-3 font-medium">{category}</td>
                        <td className="py-3 text-right">{stats.count}</td>
                        <td className="py-3 text-right font-semibold">₹{stats.earned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Loading reports...</div>;

  const dailyEntries = entries.filter(e => isToday(e.date.toDate()));
  const weeklyEntries = entries.filter(e => isThisWeek(e.date.toDate(), { weekStartsOn: 1 }));
  const monthlyEntries = entries.filter(e => isThisMonth(e.date.toDate()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Business performance and analytics</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV (All Data)
        </Button>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <ReportView periodEntries={dailyEntries} />
        </TabsContent>
        <TabsContent value="weekly">
          <ReportView periodEntries={weeklyEntries} />
        </TabsContent>
        <TabsContent value="monthly">
          <ReportView periodEntries={monthlyEntries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
