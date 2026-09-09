import * as React from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveRole, isRole, setStoredActiveRole } from '@/lib/rbac';

// Slash-admin style: central permission guard with loading + role derivation
export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: readonly string[];
  children: React.ReactNode;
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'deny'>('loading');

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (live) setState('deny');
        return;
      }
      const { data: rows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.session.user.id);
      const held = ((rows ?? []) as { role: string }[]).map((r) => r.role).filter(isRole);
      const stored = getStoredActiveRole();
      if (!stored && held[0]) setStoredActiveRole(held[0]);
      const effective = stored && held.includes(stored) ? stored : held[0];
      if (live) setState(effective && (allowedRoles as readonly string[]).includes(effective) ? 'ok' : 'deny');
    })();
    return () => {
      live = false;
    };
  }, [allowedRoles]);

  if (state === 'loading')
    return (
      <div className="grid min-h-[50vh] place-items-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  if (state === 'deny') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Slash-admin inspired: hook for component-level permission checks
export function useAuthorization() {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', data.session.user.id);
      setRoles(((rows ?? []) as { role: string }[]).map((r) => r.role));
    })();
  }, []);
  return {
    hasRole: (r: string | string[]) => {
      const need = Array.isArray(r) ? r : [r];
      return need.some((x) => roles.includes(x));
    },
    roles,
  };
}
