import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { clearStoredActiveRole, setStoredActiveRole, type Role } from '@/lib/rbac';
import { roleHome } from '@/lib/rbac';

type AuthContextType = {
  logout: () => Promise<void>;
  switchRole: (role: Role, held: Role[]) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      clearStoredActiveRole();
      qc.clear();
      navigate('/login', { replace: true });
    }
  }, [navigate, qc]);

  const switchRole = useCallback(
    (role: Role, held: Role[]) => {
      if (!held.includes(role)) return;
      setStoredActiveRole(role);
      qc.invalidateQueries({ queryKey: ['tenant-context'] });
      navigate(roleHome[role], { replace: true });
    },
    [navigate, qc],
  );

  return <AuthContext.Provider value={{ logout, switchRole }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
