import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, isConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { UserProfile, subscribeToUserProfile, bootstrapUserProfile } from '@/lib/firestore';

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

  // Tracks which UID we've already attempted bootstrap for, so we never
  // call bootstrapUserProfile more than once per login session.
  const bootstrapAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setProfileLoading(false);
      return;
    }

    // Holds the unsubscribe function for the active profile listener so we can
    // clean it up when the auth user changes or the component unmounts.
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      // Tear down the previous user's profile listener.
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!u) {
        setUserProfile(null);
        setProfileLoading(false);
        bootstrapAttemptedRef.current = null;
        return;
      }

      setProfileLoading(true);
      bootstrapAttemptedRef.current = null;

      // Real-time listener on users/{uid} — fires immediately with the current
      // value from Firestore (bypasses local cache for the first snapshot) and
      // then on every subsequent change. This means:
      //   • Manual role edits in the Firebase Console propagate within seconds.
      //   • No stale cache issues on logout/login.
      unsubscribeProfile = subscribeToUserProfile(u.uid, async (profile) => {
        if (profile) {
          // Document exists — use whatever role is in Firestore right now.
          setUserProfile(profile);
          setProfileLoading(false);
        } else {
          // Document does not exist yet. Attempt bootstrap exactly once per
          // login (tracked by uid) so we don't loop if Firestore is slow.
          if (bootstrapAttemptedRef.current !== u.uid) {
            bootstrapAttemptedRef.current = u.uid;
            try {
              const bootstrapped = await bootstrapUserProfile(
                u.uid,
                u.email ?? '',
                u.displayName || u.email?.split('@')[0] || 'Owner',
              );
              if (bootstrapped) {
                // bootstrapUserProfile wrote the doc → onSnapshot will fire
                // again automatically and set userProfile via the branch above.
              } else {
                // Users already exist but this account has no profile doc →
                // unauthorized (LoginPage handles sign-out / messaging).
                setUserProfile(null);
                setProfileLoading(false);
              }
            } catch (err) {
              console.error('[AuthContext] Error bootstrapping user profile:', err);
              setUserProfile(null);
              setProfileLoading(false);
            }
          } else {
            // Bootstrap already attempted for this UID — profile genuinely
            // doesn't exist (e.g. staff whose doc was revoked).
            setUserProfile(null);
            setProfileLoading(false);
          }
        }
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
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
