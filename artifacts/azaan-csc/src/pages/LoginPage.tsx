import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'wouter';
import {
  signInWithEmailAndPassword, isSignInWithEmailLink, signInWithEmailLink,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

const EMAIL_LINK_KEY = 'azaan_signin_email';

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

  // Email-link sign-in state
  const [isEmailLink, setIsEmailLink] = useState(false);
  const [emailLinkEmail, setEmailLinkEmail] = useState('');
  const [emailLinkLoading, setEmailLinkLoading] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  // Redirect if already logged in
  if (user) {
    setLocation('/dashboard');
    return null;
  }

  // Detect email link on mount
  useEffect(() => {
    if (!auth) return;
    if (isSignInWithEmailLink(auth, window.location.href)) {
      setIsEmailLink(true);
      const stored = window.localStorage.getItem(EMAIL_LINK_KEY);
      if (stored) {
        setEmailLinkEmail(stored);
        completeEmailLinkSignIn(stored);
      } else {
        setNeedsEmailConfirm(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeEmailLinkSignIn = async (signinEmail: string) => {
    if (!auth || !db) return;
    setEmailLinkLoading(true);
    try {
      const result = await signInWithEmailLink(auth, signinEmail, window.location.href);
      window.localStorage.removeItem(EMAIL_LINK_KEY);

      // Create staff profile if it doesn't exist yet
      const uid = result.user.uid;
      const profileRef = doc(db, 'users', uid);
      const existing = await getDoc(profileRef);
      if (!existing.exists()) {
        // Check for a pending invite to get invitedBy
        const inviteRef = doc(db, 'pendingInvites', signinEmail.replace(/[.]/g, ','));
        const invite = await getDoc(inviteRef).catch(() => null);
        await setDoc(profileRef, {
          email: signinEmail,
          displayName: signinEmail.split('@')[0],
          role: 'staff',
          createdAt: Timestamp.now(),
          ...(invite?.exists() ? { invitedBy: invite.data()?.invitedBy } : {}),
        });
        // Clean up the invite
        if (invite?.exists()) {
          const { deleteDoc } = await import('firebase/firestore');
          await deleteDoc(inviteRef).catch(() => {});
        }
      }

      toast({ title: 'Welcome!', description: 'You have been signed in successfully.' });
      setLocation('/dashboard');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sign-in Failed', description: err.message });
      setEmailLinkLoading(false);
      setIsEmailLink(false);
    }
  };

  const handleEmailLinkConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    completeEmailLinkSignIn(emailLinkEmail);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLocation('/dashboard');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Login Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

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

  // ── Email-link completion UI ──────────────────────────────────────────────

  if (isEmailLink && emailLinkLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Signing you in…</p>
        </div>
      </div>
    );
  }

  if (isEmailLink && needsEmailConfirm) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-background"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)', backgroundSize: '28px 28px' }}>
        <div className="max-w-md w-full bg-card border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8 text-center border-b">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Mail className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Confirm Your Email</h1>
            <p className="text-muted-foreground text-sm mt-2">
              You're signing in via an email link. Please confirm your email address to continue.
            </p>
          </div>
          <form onSubmit={handleEmailLinkConfirm} className="p-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="confirm-email">Your Email Address</Label>
              <Input
                id="confirm-email"
                type="email"
                placeholder="staff@example.com"
                value={emailLinkEmail}
                onChange={e => setEmailLinkEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              Continue Sign-in
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ── Normal login UI ───────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Left panel — branding (hidden on small screens) */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #080f1f 0%, #0d1b3e 50%, #1a2a5e 100%)' }}>
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

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-medium">CSC Management Portal</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure Staff Access
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            {shopSettings?.shopName || 'AZAAN COMMUNICATION TOUR AND TRAVEL'}
          </h2>
          <p className="text-white/60 text-base leading-relaxed">
            Your complete CSC shop management solution — track work, manage customers, and monitor earnings in one place.
          </p>
        </div>

        <div className="relative text-white/40 text-xs">
          Protected by Firebase Authentication
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {!isConfigured && (
          <div className="max-w-sm w-full bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl mb-6 text-sm">
            <strong>Setup Required</strong> — Firebase secrets not yet configured.
          </div>
        )}

        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-sm">{shopSettings?.shopName || 'AZAAN CSC'}</div>
              <div className="text-xs text-muted-foreground">Staff Portal</div>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold">Sign In</h1>
            <p className="text-muted-foreground text-sm mt-1">Access your staff dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={!isConfigured || loading}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={!isConfigured || loading}
                data-testid="input-password"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={sendingReset || !isConfigured}
                className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 text-xs"
              >
                {sendingReset
                  ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Sending…</span>
                  : 'Forgot password?'}
              </button>
              {resetSent && <span className="text-green-600 text-xs">Reset email sent ✓</span>}
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={!isConfigured || loading} data-testid="button-login">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in...</> : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Staff members can also sign in via the email link sent by the owner.
          </p>
        </div>
      </div>
    </div>
  );
}
