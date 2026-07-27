import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Loader2, Mail, Lock, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const { isConfigured, user } = useAuth();
  const { shopSettings } = useSettings();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

<<<<<<< HEAD
  const shopName = shopSettings?.shopName || "AZAAN COMMUNICATION TOUR AND TRAVEL";
=======
  const handleForgotPassword = async () => {
    if (!auth || !email.trim()) {
      toast({ variant: 'destructive', title: 'Enter your email first', description: 'Type your email address above, then click Forgot Password.' });
      return;
    }
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      toast({ title: 'Reset email sent', description: `Check ${email} for a password reset link.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSendingReset(false);
    }
  };
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Left panel — branding (hidden on small screens) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #080f1f 0%, #0d1b3e 50%, #1a2a5e 100%)' }}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i}
              className="absolute rounded-full border border-white"
              style={{
                width: `${80 + i * 40}px`, height: `${80 + i * 40}px`,
                left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 1 / (i + 1),
              }}
            />
          ))}
        </div>

        {/* Top */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-medium">CSC Management Portal</span>
          </div>
        </div>

        {/* Center — Hero */}
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Staff Access
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight" style={{ fontFamily: 'var(--app-font-display)' }}>
            {shopName}
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Your complete CSC shop management system — track work orders, payments, and grow your business with clarity.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: 'Work Tracking', desc: 'All entries in one place' },
              { label: 'Instant Reports', desc: 'Daily & monthly analytics' },
              { label: 'Payment History', desc: 'Full payment audit trail' },
            ].map(f => (
              <div key={f.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-white text-sm font-semibold mb-1">{f.label}</div>
                <div className="text-white/50 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative text-white/30 text-xs">
          © {new Date().getFullYear()} {shopName}. All rights reserved.
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg mb-4">
              <Store className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--app-font-display)' }}>
              {shopName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">CSC Management Portal</p>
          </div>

          {/* Firebase not configured warning */}
          {!isConfigured && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900">
              <h3 className="font-semibold text-sm mb-1">Setup Required</h3>
              <p className="text-xs text-amber-700">Firebase is not configured. Add the Firebase secrets to your environment.</p>
            </div>
          )}

<<<<<<< HEAD
          {/* Login card */}
          <div className="bg-card border border-border rounded-2xl shadow-card p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--app-font-display)' }}>
                Welcome back
              </h2>
              <p className="text-muted-foreground text-sm mt-1.5">Sign in to your staff account to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="staff@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={!isConfigured || loading}
                    className="pl-10 h-11 bg-background border-border focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!isConfigured || loading}
                    className="pl-10 h-11 bg-background border-border focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold shadow-sm transition-all hover:shadow-md"
                disabled={!isConfigured || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                New staff member?{' '}
                <Link href="/register" className="text-primary font-medium hover:underline">
                  Create account
                </Link>
              </p>
            </div>
=======
          <div className="flex items-center justify-between text-sm pt-2">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={sendingReset || !isConfigured}
              className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              {sendingReset ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Sending…</span> : 'Forgot password?'}
            </button>
            {resetSent && <span className="text-green-600 text-xs">Reset email sent ✓</span>}
          </div>
          <div className="text-center text-sm text-muted-foreground pt-2">
            Don't have an account? <Link href="/register" className="text-primary hover:underline">Register</Link>
>>>>>>> df8f396511d08dcfa40563be85a66b3e2357f466
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Protected by Firebase Authentication
          </p>
        </div>
      </div>
    </div>
  );
}
