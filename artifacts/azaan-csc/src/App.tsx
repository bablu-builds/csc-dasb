import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ProtectedRoute, RoleRoute } from '@/components/ProtectedRoute';
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
import AepsWithdrawalPage from '@/pages/AepsWithdrawalPage';
import ElectricRechargePage from '@/pages/ElectricRechargePage';
import MoneyTransferPage from '@/pages/MoneyTransferPage';
import QuickWorkPage from '@/pages/QuickWorkPage';

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
          <Route path="/quick-work" component={QuickWorkPage} />
          <Route path="/reports">
              <RoleRoute allow={['owner', 'manager']}><ReportsPage /></RoleRoute>
            </Route>
          <Route path="/settings" component={SettingsPage} />
          <Route path="/deleted" component={DeletedItemsPage} />
          <Route path="/aeps" component={AepsWithdrawalPage} />
          <Route path="/electric-recharge" component={ElectricRechargePage} />
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
