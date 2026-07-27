import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, isConfigured } from '@/lib/firebase';
import { UserProfile, getUserProfile, bootstrapUserProfile } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: 'owner' | 'staff' | null;
  canAccessFinancialServices: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: null,
  canAccessFinancialServices: false,
  loading: true,
  logout: async () => {},
  isConfigured,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      role: userProfile?.role ?? null,
      canAccessFinancialServices:
        userProfile?.role === 'owner' || userProfile?.canAccessFinancialServices === true,
      loading,
      logout,
      isConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
