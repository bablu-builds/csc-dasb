import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, isConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { UserProfile, getUserProfile, bootstrapUserProfile } from '@/lib/firestore';

export type UserRole = 'owner' | 'staff';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  isOwner: boolean;
  canAccessFinancialServices: boolean;
  displayName: string;
  loading: boolean;
  profileLoading: boolean;
  logout: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: null,
  isOwner: false,
  canAccessFinancialServices: false,
  displayName: '',
  loading: true,
  profileLoading: true,
  logout: async () => {},
  isConfigured,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setProfileLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      if (!u) {
        setUserProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
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
            // Not the first user and no profile → email-link staff whose profile
            // will be created by LoginPage after signInWithEmailLink completes.
            // Keep userProfile null for now; LoginPage will reload.
            setUserProfile(null);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error loading user profile:', err);
        setUserProfile(null);
      } finally {
        setProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error logging out', description: error.message });
    }
  };

  const role = userProfile?.role ?? null;
  const isOwner = role === 'owner';
  const canAccessFinancialServices = isOwner || (userProfile?.canAccessFinancialServices === true);
  const displayName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Staff';

  return (
    <AuthContext.Provider value={{
      user, userProfile, role, isOwner, canAccessFinancialServices,
      displayName, loading, profileLoading, logout, isConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
