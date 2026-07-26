import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Loader2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isConfigured, user } = useAuth();
  const { shopSettings } = useSettings();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    setLocation('/dashboard');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLocation('/dashboard');
    } catch (err: any) {
      toast({ variant: "destructive", title: "Login Failed", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-background">
      {!isConfigured && (
        <div className="max-w-md w-full bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-lg mb-8 shadow-sm">
          <h2 className="font-bold text-lg mb-2">Setup Required</h2>
          <p className="mb-4 text-sm">Firebase is not yet configured. Please add the Firebase secrets to your environment to continue.</p>
          <ul className="list-disc list-inside text-sm space-y-1 mb-4 text-amber-800">
            <li>VITE_FIREBASE_API_KEY</li>
            <li>VITE_FIREBASE_AUTH_DOMAIN</li>
            <li>VITE_FIREBASE_PROJECT_ID</li>
            <li>...and others</li>
          </ul>
        </div>
      )}

      <div className="max-w-md w-full bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="bg-primary p-8 text-center text-primary-foreground">
          <Store className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-xl font-bold">{shopSettings?.shopName || "AZAAN COMMUNICATION"}</h1>
          <p className="text-primary-foreground/80 mt-2">Staff Portal Login</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="staff@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!isConfigured || loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={!isConfigured || loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!isConfigured || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Login
          </Button>

          <div className="text-center text-sm text-muted-foreground pt-4">
            Don't have an account? <Link href="/register" className="text-primary hover:underline">Register</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
