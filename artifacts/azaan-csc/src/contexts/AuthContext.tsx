import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, isConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  isConfigured,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
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

  return (
    <AuthContext.Provider value={{ user, loading, logout, isConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
