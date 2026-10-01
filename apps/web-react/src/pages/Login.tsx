import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { roleHome, roleLabels, isRole, type Role } from '@/lib/rbac';
import { Button, LoadingButton, Input } from '@/components/ui';

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password. Try again or reset your password below.';
  if (m.includes('email not confirmed')) return 'Your email is not confirmed yet. Check your inbox for the confirmation link.';
  if (m.includes('too many requests') || m.includes('rate limit')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('network') || m.includes('fetch')) return 'Network problem. Check your connection and try again.';
  return 'Sign-in failed. Try again or contact your school administrator.';
}

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [heldRoles, setHeldRoles] = useState<Role[] | null>(null);

  function goHome(roles: Role[]) {
    if (roles.length > 1) {
      setHeldRoles(roles);
      return;
    }
    nav(roleHome[roles[0]] ?? '/admin', { replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        toast.error(friendlyError(signInError.message));
        return;
      }
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      const { data: rows } = uid
        ? await supabase.from('user_roles').select('role').eq('user_id', uid)
        : { data: [] as { role: string }[] };
      const roles = ((rows as { role: string }[] | null) ?? []).map((r) => r.role).filter(isRole);
      if (roles.length === 0) {
        toast.error('This account has no school role yet. Ask your school administrator for access.');
        await supabase.auth.signOut();
        return;
      }
      toast.success('Signed in. Karibu!');
      goHome(roles);
    } finally {
      setBusy(false);
    }
  }

  async function onRecovery() {
    if (!email.trim()) {
      toast.error('Enter your email address first, then choose "Forgot password".');
      return;
    }
    setRecoveryBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) toast.error(friendlyError(error.message));
      else toast.success('Password reset link sent. Check your email.');
    } finally {
      setRecoveryBusy(false);
    }
  }

  if (heldRoles) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/40 p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">eShule</h1>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <p className="mb-4 text-sm text-muted-foreground">You hold more than one role. Continue as:</p>
            <div className="space-y-3">
              {heldRoles.map((r) => (
                <Button
                  key={r}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => nav(roleHome[r] ?? '/admin', { replace: true })}
                >
                  {roleLabels[r]}
                </Button>
              ))}
              <Button variant="ghost" className="w-full" onClick={() => setHeldRoles(null)}>
                Back to sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left side — branding */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/20" />
          <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-white/10" />
          <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-white/10" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center text-white">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 shadow-2xl backdrop-blur-sm">
            <GraduationCap className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight">eShule</h1>
          <p className="mt-2 max-w-sm text-lg text-white/80">
            Smart school management for modern education
          </p>
          <div className="mt-12 grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-white/70">Students</p>
            </div>
            <div>
              <p className="text-3xl font-bold">50+</p>
              <p className="text-sm text-white/70">Teachers</p>
            </div>
            <div>
              <p className="text-3xl font-bold">98%</p>
              <p className="text-sm text-white/70">Attendance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="text-center lg:hidden">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">eShule</h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your school workspace</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  placeholder="you@school.co.ke"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  placeholder="Your password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={onRecovery}
                disabled={recoveryBusy}
                className="text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50"
              >
                {recoveryBusy ? 'Sending…' : 'Forgot password?'}
              </button>
            </div>

            <LoadingButton
              className="min-h-[44px] w-full"
              type="submit"
              loading={busy}
            >
              Sign in
            </LoadingButton>

            <p className="text-center text-xs text-muted-foreground">
              No account? Ask your school administrator for an invite.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
