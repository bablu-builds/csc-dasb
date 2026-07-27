import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
<<<<<<< HEAD
  LayoutDashboard, PlusCircle, List, Clock, BarChart3, Settings,
  LogOut, Menu, Store, X, Trash2, Zap, Wallet, ArrowRightLeft, ChevronRight,
  Bell, User2,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  isPrimary?: boolean;
  ownerOnly?: boolean;
  financialOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/work/new', label: 'Add Work Entry', icon: PlusCircle, isPrimary: true },
  { href: '/work', label: 'All Work', icon: List },
  { href: '/pending', label: 'Pending Work', icon: Clock },
];

const financialNavItems: NavItem[] = [
  { href: '/aeps', label: 'AEPS Withdrawal', icon: Wallet, financialOnly: true },
  { href: '/recharge', label: 'Electric Recharge', icon: Zap, financialOnly: true },
  { href: '/money-transfer', label: 'Money Transfer', icon: ArrowRightLeft, financialOnly: true },
];

const adminNavItems: NavItem[] = [
  { href: '/reports', label: 'Reports', icon: BarChart3, ownerOnly: true },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/deleted', label: 'Deleted Items', icon: Trash2 },
];

function NavLink({ item, isActive, onClick }: {
  item: NavItem; isActive: boolean; onClick?: () => void;
}) {
  const Icon = item.icon;
  if (item.isPrimary) {
    return (
      <Link href={item.href} onClick={onClick}
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg my-1 bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-sm">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  }
=======
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

>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
  return (
    <Link href={item.href} onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all group
        ${isActive
          ? 'bg-sidebar-primary/15 text-white'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        }`}>
      <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-sidebar-primary' : 'group-hover:text-sidebar-accent-foreground'}`} />
      <span className="flex-1">{item.label}</span>
      {isActive && <div className="h-1.5 w-1.5 rounded-full bg-sidebar-primary shrink-0" />}
    </Link>
  );
}

function SidebarContent({ location, onNav, isOwner, canAccessFinancialServices, shopName, displayName, userEmail, logout }: {
  location: string; onNav?: () => void;
  isOwner: boolean; canAccessFinancialServices: boolean;
  shopName: string; displayName: string; userEmail: string; logout: () => void;
}) {
  const initial = (displayName[0] || 'U').toUpperCase();
  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0 shadow">
          <Store className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-white font-bold text-sm leading-tight truncate" style={{ fontFamily: 'var(--app-font-display)' }}>
            {shopName}
          </div>
          <div className="text-sidebar-foreground text-xs mt-0.5">CSC Management</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Main */}
        {mainNavItems.map(item => (
          <NavLink key={item.href} item={item} isActive={location === item.href} onClick={onNav} />
        ))}

<<<<<<< HEAD
        {/* Financial Services */}
        {(isOwner || canAccessFinancialServices) && (
          <>
            <div className="px-4 pt-5 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
                Financial Services
              </span>
            </div>
            {financialNavItems.map(item => (
              <NavLink key={item.href} item={item} isActive={location === item.href} onClick={onNav} />
            ))}
          </>
=======
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
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
        )}

        {/* Admin */}
        <div className="px-4 pt-5 pb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
            Admin
          </span>
        </div>
        {adminNavItems
          .filter(item => !item.ownerOnly || isOwner)
          .map(item => (
            <NavLink key={item.href} item={item} isActive={location === item.href} onClick={onNav} />
          ))}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors cursor-default">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate">{displayName}</div>
            <div className="text-sidebar-foreground text-xs truncate">{isOwner ? 'Owner' : 'Staff'}</div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="h-7 w-7 rounded-md flex items-center justify-center text-sidebar-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout, isConfigured, isOwner, canAccessFinancialServices, displayName, user } = useAuth();
  const { shopSettings } = useSettings();
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const commonProps = {
    location,
    isOwner,
    canAccessFinancialServices,
    shopName: shopSettings.shopName,
    displayName,
    userEmail: user?.email || '',
    logout,
  };

  // Resolve current page title for topbar
  const allItems = [...mainNavItems, ...financialNavItems, ...adminNavItems];
  const currentItem = allItems.find(i => i.href === location);
  const pageTitle = currentItem?.label || 'Dashboard';

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────── */}
      <aside className="hidden md:flex w-64 flex-col flex-shrink-0 fixed left-0 top-0 bottom-0 z-30">
        <SidebarContent {...commonProps} />
      </aside>

      {/* ── MOBILE DRAWER OVERLAY ────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-72 animate-slide-in-left shadow-2xl">
            <SidebarContent {...commonProps} onNav={() => setDrawerOpen(false)} />
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-[100dvh] md:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border flex items-center h-14 px-4 md:px-6 gap-4">
          {/* Mobile: hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>

          {/* Mobile: shop name */}
          <div className="md:hidden flex items-center gap-2 flex-1 min-w-0">
            <Store className="h-4 w-4 text-primary shrink-0" />
            <span className="font-bold text-sm truncate text-foreground">{shopSettings.shopName}</span>
          </div>

          {/* Desktop: page breadcrumb */}
          <div className="hidden md:flex items-center gap-2 flex-1">
            <span className="text-muted-foreground text-sm">CSC Portal</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-foreground text-sm font-semibold">{pageTitle}</span>
          </div>

          {/* Right: user pill */}
          <div className="hidden md:flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOwner ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
              {isOwner ? 'Owner' : 'Staff'}
            </span>
          </div>
        </header>

        {/* Firebase warning banner */}
        {!isConfigured && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-3 text-sm text-center">
            <strong>Firebase not configured</strong> — add Firebase secrets to connect to the database.
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 px-4 md:px-8 py-6 animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}
