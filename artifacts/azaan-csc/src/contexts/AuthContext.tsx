import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
<<<<<<< HEAD
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isConfigured } from '@/lib/firebase';
=======
import { auth, isConfigured } from '@/lib/firebase';
import { UserProfile, getUserProfile, bootstrapUserProfile } from '@/lib/firestore';
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'owner' | 'staff';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: 'owner' | 'staff' | null;
  canAccessFinancialServices: boolean;
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
  userProfile: null,
  role: null,
  canAccessFinancialServices: false,
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [canAccessFinancialServices, setCanAccessFinancialServices] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      // Demo mode — treat as owner so all features are visible
      setUserProfile({ email: 'demo@example.com', displayName: 'Demo Owner', role: 'owner', createdAt: null as any });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
<<<<<<< HEAD
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
=======

      if (!u) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Fetch Firestore profile
      try {
        const profile = await getUserProfile(u.uid);
        if (profile) {
          setUserProfile(profile);
        } else {
          // No profile yet — try to bootstrap as owner if this is the very first user
          const bootstrapped = await bootstrapUserProfile(
            u.uid,
            u.email ?? '',
            u.displayName || u.email?.split('@')[0] || 'Owner',
          );
          if (bootstrapped) {
            setUserProfile(bootstrapped);
          } else {
            // Not the first user and no profile → revoked or unauthorised; sign out
            toast({
              variant: 'destructive',
              title: 'Access revoked',
              description: 'Your account no longer has access to this portal.',
            });
            await firebaseSignOut(auth!);
            setUser(null);
            setUserProfile(null);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error loading user profile:', err);
        // On error (e.g. Firestore rules blocking), still set the user but with null profile
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      toast({ title: "Logged out", description: "You have been successfully logged out." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error logging out", description: error.message });
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Staff';

  return (
    <AuthContext.Provider value={{
<<<<<<< HEAD
      user, loading, logout, isConfigured,
      role, isOwner: role === 'owner', canAccessFinancialServices, displayName,
=======
      user,
      userProfile,
      role: userProfile?.role ?? null,
      canAccessFinancialServices:
        userProfile?.role === 'owner' || userProfile?.canAccessFinancialServices === true,
      loading,
      logout,
      isConfigured,
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
