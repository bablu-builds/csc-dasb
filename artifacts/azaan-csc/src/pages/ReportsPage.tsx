import { useState, useEffect } from 'react';
import { subscribeToWorkEntries, WorkEntry } from '@/lib/firestore';
import { isToday, isThisWeek, isThisMonth, format } from 'date-fns';
import { Download, BarChart2, TrendingUp, IndianRupee } from 'lucide-react';
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
    const headers = ['Date', 'Customer Name', 'Mobile', 'Category', 'Work Detail', 'Total Amount', 'Paid Amount', 'Due Amount', 'Status', 'Address'];
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
      `"${e.address || ''}"`
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
    const totalEarned = periodEntries.reduce((sum, e) => sum + e.paidAmount, 0);
    const totalDues = periodEntries.reduce((sum, e) => sum + e.dueAmount, 0);
    const totalEntries = periodEntries.length;

    // Category breakdown
    const categoryStats = periodEntries.reduce((acc, entry) => {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earned (कमाई)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">₹{totalEarned}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New Work (काम)</CardTitle>
              <BarChart2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{totalEntries} entries</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New Dues (बकाया)</CardTitle>
              <IndianRupee className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">₹{totalDues}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown (श्रेणी के अनुसार)</CardTitle>
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
  const weeklyEntries = entries.filter(e => isThisWeek(e.date.toDate(), { weekStartsOn: 1 })); // Monday start
  const monthlyEntries = entries.filter(e => isThisMonth(e.date.toDate()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">रिपोर्ट (Reports)</h1>
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
