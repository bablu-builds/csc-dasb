import { useState, useEffect } from 'react';
import { WorkEntry, subscribeToWorkEntries } from '@/lib/firestore';
import { isToday, isThisMonth, differenceInDays, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, Users, Clock, AlertTriangle, FileText } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { isConfigured } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

// Demo data shown when Firebase is not yet connected
const DEMO_ENTRIES: WorkEntry[] = [
  { id: '1', customerName: 'Ravi Kumar', mobile: '9876543210', category: 'PAN Card', workDetail: 'New PAN card application', date: Timestamp.fromDate(new Date()), totalAmount: 150, paidAmount: 150, dueAmount: 0, status: 'Completed', address: 'Mohalla Ganj', createdAt: Timestamp.fromDate(new Date()) },
  { id: '2', customerName: 'Sunita Devi', mobile: '9123456780', category: 'Aadhar Card', workDetail: 'Address update', date: Timestamp.fromDate(subDays(new Date(), 2)), totalAmount: 100, paidAmount: 50, dueAmount: 50, status: 'Pending', address: 'Station Road', createdAt: Timestamp.fromDate(subDays(new Date(), 2)) },
  { id: '3', customerName: 'Mohd. Salim', mobile: '9988776655', category: 'Railway/Bus Ticket Booking', workDetail: 'Patna to Delhi - 2 tickets', date: Timestamp.fromDate(subDays(new Date(), 5)), totalAmount: 500, paidAmount: 300, dueAmount: 200, status: 'Pending', address: 'Civil Lines', createdAt: Timestamp.fromDate(subDays(new Date(), 5)) },
  { id: '4', customerName: 'Geeta Sharma', mobile: '9876500001', category: 'Jati Praman Patra', workDetail: 'Caste certificate for college', date: Timestamp.fromDate(subDays(new Date(), 9)), totalAmount: 200, paidAmount: 0, dueAmount: 200, status: 'Pending', address: 'Purana Bazar', createdAt: Timestamp.fromDate(subDays(new Date(), 9)) },
  { id: '5', customerName: 'Ajay Singh', mobile: '9012345678', category: 'Driving Licence (DL)', workDetail: 'DL renewal', date: Timestamp.fromDate(new Date()), totalAmount: 300, paidAmount: 300, dueAmount: 0, status: 'Completed', address: 'Shastri Nagar', createdAt: Timestamp.fromDate(new Date()) },
  { id: '6', customerName: 'Priya Yadav', mobile: '8800123456', category: 'Bijli Bill Payment', workDetail: 'July electricity bill', date: Timestamp.fromDate(subDays(new Date(), 1)), totalAmount: 850, paidAmount: 850, dueAmount: 0, status: 'Completed', address: 'Nehru Colony', createdAt: Timestamp.fromDate(subDays(new Date(), 1)) },
  { id: '7', customerName: 'Ramesh Paswan', mobile: '7700654321', category: 'Ration Card', workDetail: 'New ration card member addition', date: Timestamp.fromDate(subDays(new Date(), 12)), totalAmount: 250, paidAmount: 100, dueAmount: 150, status: 'Pending', address: 'Indira Nagar', createdAt: Timestamp.fromDate(subDays(new Date(), 12)) },
];

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
  
  // Calculations
  const todaysEarnings = entries
    .filter(e => isToday(e.date.toDate()))
    .reduce((sum, e) => sum + e.paidAmount, 0);

  const monthEarnings = entries
    .filter(e => isThisMonth(e.date.toDate()))
    .reduce((sum, e) => sum + e.paidAmount, 0);

  const uniqueCustomers = new Set(entries.map(e => e.mobile)).size;

  const pendingCount = entries.filter(e => e.status === 'Pending').length;

  const totalDue = entries.reduce((sum, e) => sum + e.dueAmount, 0);

  // Today's pending/scheduled entries sorted by urgency
  const pendingEntries = entries
    .filter(e => e.status === 'Pending')
    .map(e => ({
      ...e,
      daysPending: differenceInDays(today, e.date.toDate())
    }))
    .sort((a, b) => b.daysPending - a.daysPending)
    .slice(0, 10); // Show top 10 most urgent

  if (loading) {
    return <div className="animate-pulse flex space-x-4">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard (डैशबोर्ड)</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary">आज की कमाई</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{todaysEarnings}</div>
            <p className="text-xs text-muted-foreground mt-1">Today's earning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">इस महीने की कमाई</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{monthEarnings}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">कुल ग्राहक</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">Total customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">लंबित काम</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending work</p>
          </CardContent>
        </Card>

        <Card className={totalDue > 0 ? "bg-red-50 border-red-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-medium ${totalDue > 0 ? "text-red-700" : ""}`}>कुल बकाया</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${totalDue > 0 ? "text-red-600" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDue > 0 ? "text-red-700" : ""}`}>₹{totalDue}</div>
            <p className={`text-xs mt-1 ${totalDue > 0 ? "text-red-600" : "text-muted-foreground"}`}>Total due</p>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Pending Work */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            जरूरी लंबित काम (Urgent Pending Work)
          </h2>
          <Link href="/pending">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          {pendingEntries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <FileText className="h-12 w-12 mb-3 opacity-20" />
              <p>कोई लंबित काम नहीं है (No pending work)</p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingEntries.map(entry => {
                const isVeryUrgent = entry.daysPending > 7;
                const isUrgent = entry.daysPending >= 3 && entry.daysPending <= 7;
                
                return (
                  <div 
                    key={entry.id} 
                    className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors
                      ${isVeryUrgent ? 'bg-red-50/50 hover:bg-red-50' : ''}
                      ${isUrgent ? 'bg-amber-50/50 hover:bg-amber-50' : ''}
                      ${!isVeryUrgent && !isUrgent ? 'hover:bg-muted/50' : ''}
                    `}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">{entry.customerName}</h3>
                        <span className="text-sm text-muted-foreground font-mono">{entry.mobile}</span>
                      </div>
                      <div className="text-sm mt-1 flex items-center gap-3">
                        <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-sm text-xs">
                          {entry.category}
                        </span>
                        {entry.daysPending > 0 ? (
                          <span className={`text-xs font-medium ${isVeryUrgent ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-blue-600'}`}>
                            {entry.daysPending} दिन से लंबित (Days pending)
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">आज (Today)</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {entry.dueAmount > 0 && (
                        <div className="text-right">
                          <span className="block text-xs text-muted-foreground">बकाया (Due)</span>
                          <span className="font-bold text-red-600">₹{entry.dueAmount}</span>
                        </div>
                      )}
                      <Link href={`/work/${entry.id}/edit`}>
                        <Button variant="outline" size="sm">Update</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
