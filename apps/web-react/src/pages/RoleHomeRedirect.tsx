import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveRole, setStoredActiveRole, isRole, roleHome } from '@/lib/rbac';

export default function RoleHomeRedirect() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session ?? null;
        if (!session) {
          nav('/login', { replace: true });
          return;
        }
        const uid = session.user?.id;
        if (!uid) {
          nav('/login', { replace: true });
          return;
        }

        const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', uid);
        const held = ((rows ?? []) as { role: string }[]).map((r) => r.role).filter(isRole);

        // Prefer stored active role if it's still held.
        const stored = getStoredActiveRole();
        const effective = stored && isRole(stored) && held.includes(stored) ? stored : held[0] ?? null;

        if (effective) {
          setStoredActiveRole(effective);
          const dest = roleHome[effective] ?? '/admin';
          nav(dest, { replace: true });
          return;
        }

        // No roles found: fall back to admin landing (will be protected) or parent home.
        nav('/admin', { replace: true });
      } catch (err) {
        console.error('Role redirect failed', err);
        nav('/login', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  return (
    <div className="p-8 text-sm opacity-70">{loading ? 'Redirecting to your workspace…' : 'Redirecting…'}</div>
  );
}
