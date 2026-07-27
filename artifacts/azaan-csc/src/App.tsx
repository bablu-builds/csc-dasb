import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';

import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import AddWorkPage from '@/pages/AddWorkPage';
import EditWorkPage from '@/pages/EditWorkPage';
import WorkListPage from '@/pages/WorkListPage';
import PendingWorkPage from '@/pages/PendingWorkPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import DeletedItemsPage from '@/pages/DeletedItemsPage';
<<<<<<< HEAD
import AepsPage from '@/pages/AepsPage';
import RechargePage from '@/pages/RechargePage';
=======
import AepsWithdrawalPage from '@/pages/AepsWithdrawalPage';
import ElectricRechargePage from '@/pages/ElectricRechargePage';
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
import MoneyTransferPage from '@/pages/MoneyTransferPage';

const queryClient = new QueryClient();

function AuthenticatedApp() {
  return (
    <ProtectedRoute>
      <Layout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/work/new" component={AddWorkPage} />
          <Route path="/work/:id/edit" component={EditWorkPage} />
          <Route path="/work" component={WorkListPage} />
          <Route path="/pending" component={PendingWorkPage} />
          <Route path="/reports" component={ReportsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/deleted" component={DeletedItemsPage} />
<<<<<<< HEAD
          <Route path="/aeps" component={AepsPage} />
          <Route path="/recharge" component={RechargePage} />
=======
          <Route path="/aeps" component={AepsWithdrawalPage} />
          <Route path="/electric-recharge" component={ElectricRechargePage} />
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
          <Route path="/money-transfer" component={MoneyTransferPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="*">
        <AuthenticatedApp />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SettingsProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
          </SettingsProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
