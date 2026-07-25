import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isConfigured } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If Firebase is not configured, allow demo access — no redirect
    if (!isConfigured) return;
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation, isConfigured]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Demo mode: Firebase not configured, show pages with mock data
  if (!isConfigured) return <>{children}</>;

  if (!user) return null;

  return <>{children}</>;
}
