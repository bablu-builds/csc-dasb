import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  LayoutDashboard, PlusCircle, List, Clock, BarChart3, Settings, LogOut,
  Menu, Store, X, Trash2, ShieldCheck, User, Fingerprint, Zap, ArrowLeftRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout, isConfigured, role, userProfile, canAccessFinancialServices } = useAuth();
  const { shopSettings } = useSettings();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOwner = role === 'owner';

  const allNavItems = [
    { href: '/dashboard', label: 'Dashboard', sub: 'Home', icon: LayoutDashboard, ownerOnly: false, financialOnly: false },
    { href: '/work/new', label: 'Add Work', sub: 'New Entry', icon: PlusCircle, isPrimary: true, ownerOnly: false, financialOnly: false },
    { href: '/work', label: 'All Work', sub: 'View all', icon: List, ownerOnly: false, financialOnly: false },
    { href: '/pending', label: 'Pending', sub: 'Incomplete', icon: Clock, ownerOnly: false, financialOnly: false },
    { href: '/reports', label: 'Reports', sub: 'Analytics', icon: BarChart3, ownerOnly: true, financialOnly: false },
    // ── Financial services (owner + permitted staff) ──────────────────────────
    { href: '/aeps', label: 'AEPS Withdrawal', sub: 'Withdrawals', icon: Fingerprint, ownerOnly: false, financialOnly: true },
    { href: '/electric-recharge', label: 'Electric Recharge', sub: 'Recharges', icon: Zap, ownerOnly: false, financialOnly: true },
    { href: '/money-transfer', label: 'Money Transfer', sub: 'Transfers', icon: ArrowLeftRight, ownerOnly: false, financialOnly: true },
    // ─────────────────────────────────────────────────────────────────────────
    { href: '/settings', label: 'Settings', sub: 'Configure', icon: Settings, ownerOnly: false, financialOnly: false },
    { href: '/deleted', label: 'Deleted Items', sub: 'Recycle bin', icon: Trash2, ownerOnly: false, financialOnly: false },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.financialOnly && !canAccessFinancialServices) return false;
    return true;
  });

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2 font-semibold">
          <Store className="h-5 w-5" />
          <span className="truncate max-w-[200px]">{shopSettings.shopName}</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1">
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${mobileMenuOpen ? 'block' : 'hidden'} 
        md:block md:w-64 bg-card border-r flex-shrink-0 flex flex-col
        absolute md:static top-[60px] left-0 w-full h-[calc(100dvh-60px)] md:h-[100dvh] z-40
      `}>
        <div className="hidden md:flex p-6 items-center gap-3 border-b text-primary">
          <Store className="h-8 w-8 flex-shrink-0" />
          <h1 className="font-bold text-lg leading-tight">{shopSettings.shopName}</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-md transition-colors font-medium
                  ${isActive && !item.isPrimary ? 'bg-secondary text-secondary-foreground' : ''}
                  ${!isActive && !item.isPrimary ? 'hover:bg-muted text-foreground' : ''}
                  ${item.isPrimary ? 'bg-primary text-primary-foreground hover:bg-primary/90 mt-4 mb-4' : ''}
                `}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm">{item.label}</span>
                  <span className={`text-xs ${item.isPrimary ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{item.sub}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User info + role badge + logout */}
        <div className="p-4 border-t space-y-3">
          {userProfile && (
            <div className="flex items-center gap-2 px-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userProfile.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{userProfile.email}</p>
              </div>
              <Badge
                variant={isOwner ? 'default' : 'secondary'}
                className={`shrink-0 text-xs ${isOwner ? 'bg-primary/90' : ''}`}
              >
                {isOwner ? (
                  <><ShieldCheck className="h-3 w-3 mr-1" />Owner</>
                ) : (
                  'Staff'
                )}
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {!isConfigured && (
          <div className="bg-amber-100 border-b border-amber-200 text-amber-900 p-4 text-center">
            <p className="font-medium">Firebase is not configured!</p>
            <p className="text-sm mt-1">Please add the required Firebase secrets to your Replit environment to use the database.</p>
          </div>
        )}
        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
