import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Role } from '$lib/auth';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      session: Session | null;
      user: User | null;
      role: Role | null;
      tenantId: string | null;
      srv: SupabaseClient;
    }
    interface PageData {
      session?: Session | null;
      role?: Role | null;
      user?: User | null;
    }
  }
}

export {};
