import { useState, useEffect } from 'react';
import { subscribeToWorkEntries, WorkEntry } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { isToday, isThisWeek, isThisMonth, format } from 'date-fns';
import { ShieldCheck, Download, BarChart2, TrendingUp, IndianRupee, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const CHART_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a',
  '#0891b2', '#9333ea', '#dc2626', '#d97706', '#059669',
];

function ReportsSkeleton() {
  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-28" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-24 mb-1" /><Skeleton className="h-3 w-36" /></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();

  // Only subscribe when user is the owner (role may be null while loading)
  useEffect(() => {
    if (role !== 'owner') { setLoading(false); return; }
    const unsubscribe = subscribeToWorkEntries((data) => {
      setEntries(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [role]);

  // Staff cannot see the Reports page — must be after all hooks
  if (role === 'staff') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-xs">
          Income reports are only visible to the Owner. Contact your owner if you need this information.
        </p>
      </div>
    );
  }

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
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `csc_report_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ReportView = ({ periodEntries }: { periodEntries: WorkEntry[] }) => {
    const rejectedEntries = periodEntries.filter(e => e.status === 'Rejected');
    const activeEntries = periodEntries.filter(e => e.status !== 'Rejected');

    const totalEarned = activeEntries.reduce((sum, e) => sum + e.paidAmount, 0);
    const totalDues = activeEntries.reduce((sum, e) => sum + e.dueAmount, 0);
    const totalEntries = activeEntries.length;
    const rejectedCount = rejectedEntries.length;
    const totalRefunded = rejectedEntries.reduce((sum, e) => sum + (e.refundAmount || 0), 0);

    const categoryStats = activeEntries.reduce((acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = { count: 0, earned: 0 };
      acc[entry.category].count += 1;
      acc[entry.category].earned += entry.paidAmount;
      return acc;
    }, {} as Record<string, { count: number; earned: number }>);

    const sortedCategories = Object.entries(categoryStats)
      .sort((a, b) => b[1].earned - a[1].earned)
      .slice(0, 10);

    const chartData = sortedCategories.map(([name, stats]) => ({
      name: name.length > 14 ? name.slice(0, 14) + '…' : name,
      fullName: name,
      earned: stats.earned,
      count: stats.count,
    }));

    return (
      <div className="space-y-6 mt-4">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(totalEarned)}</div>
              <p className="text-xs text-muted-foreground mt-1">Excludes refunded / rejected work</p>
            </CardContent>
          </Card>

          <Card className="border-blue-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Work Entries</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                <BarChart2 className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{totalEntries}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending + completed entries</p>
            </CardContent>
          </Card>

          <Card className={`shadow-sm ${totalDues > 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Dues Outstanding</CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                <IndianRupee className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{formatCurrency(totalDues)}</div>
              <p className="text-xs text-muted-foreground mt-1">Unpaid amounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Rejected breakdown */}
        <Card className="border-slate-200 bg-slate-50 shadow-sm">
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
                  <div className="text-2xl font-bold text-slate-700">{formatCurrency(totalRefunded)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total refunded</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category chart + table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedCategories.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No data for this period</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Bar chart */}
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v === 0 ? '₹0' : `₹${(v / 1000).toFixed(1)}k`}
                    />
                    <Tooltip
                      formatter={(value: number, _: string, props: any) => [
                        formatCurrency(value),
                        props.payload.fullName,
                      ]}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="earned" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left pb-2 font-medium">Category</th>
                        <th className="text-right pb-2 font-medium">Entries</th>
                        <th className="text-right pb-2 font-medium">Earned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedCategories.map(([category, stats]) => (
                        <tr key={category} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 font-medium">{category}</td>
                          <td className="py-2.5 text-right text-muted-foreground">{stats.count}</td>
                          <td className="py-2.5 text-right font-semibold text-green-700">{formatCurrency(stats.earned)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2">
                      <tr>
                        <td className="pt-2.5 font-bold">Total</td>
                        <td className="pt-2.5 text-right font-bold">{sortedCategories.reduce((s, [, v]) => s + v.count, 0)}</td>
                        <td className="pt-2.5 text-right font-bold text-green-700">{formatCurrency(sortedCategories.reduce((s, [, v]) => s + v.earned, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Business performance and analytics</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={loading}>
          <Download className="h-4 w-4" />
          Export CSV (All Data)
        </Button>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
          <TabsTrigger value="daily">Today</TabsTrigger>
          <TabsTrigger value="weekly">This Week</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
        </TabsList>
        {loading ? (
          <ReportsSkeleton />
        ) : (
          <>
            <TabsContent value="daily">
              <ReportView periodEntries={entries.filter(e => isToday(e.date.toDate()))} />
            </TabsContent>
            <TabsContent value="weekly">
              <ReportView periodEntries={entries.filter(e => isThisWeek(e.date.toDate(), { weekStartsOn: 1 }))} />
            </TabsContent>
            <TabsContent value="monthly">
              <ReportView periodEntries={entries.filter(e => isThisMonth(e.date.toDate()))} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
