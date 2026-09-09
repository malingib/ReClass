import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { roleHome, isRole } from '@/lib/rbac';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    const { data: rows } = uid
      ? await supabase.from('user_roles').select('role').eq('user_id', uid)
      : { data: [] as { role: string }[] };
    const first = (rows as { role: string }[] | null)?.[0]?.role;
    nav(first && isRole(first) ? roleHome[first] : '/admin', { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="grid size-10 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">E</div>
          <CardTitle className="text-xl">eShule</CardTitle>
          <CardDescription>Sign in to your school workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              placeholder="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
