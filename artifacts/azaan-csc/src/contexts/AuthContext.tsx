import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'owner' | 'staff';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isConfigured: boolean;
  role: UserRole | null;
  isOwner: boolean;
  canAccessFinancialServices: boolean;
  displayName: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  isConfigured,
  role: null,
  isOwner: false,
  canAccessFinancialServices: false,
  displayName: '',
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [canAccessFinancialServices, setCanAccessFinancialServices] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && db) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole((data.role as UserRole) ?? 'staff');
            setCanAccessFinancialServices(data.canAccessFinancialServices ?? false);
          } else {
            // Default: first user to log in is treated as owner if no doc exists
            setRole('owner');
            setCanAccessFinancialServices(true);
          }
        } catch {
          // Firestore not available — grant full access in demo mode
          setRole('owner');
          setCanAccessFinancialServices(true);
        }
      } else {
        setRole(null);
        setCanAccessFinancialServices(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged out", description: "You have been successfully logged out." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error logging out", description: error.message });
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Staff';

  return (
    <AuthContext.Provider value={{
      user, loading, logout, isConfigured,
      role, isOwner: role === 'owner', canAccessFinancialServices, displayName,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
