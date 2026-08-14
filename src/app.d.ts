import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Role } from '$lib/auth';
import type { Database } from '$lib/supabase/database.types';

declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }
    interface Locals {
      supabase: SupabaseClient<Database>;
      session: Session | null;
      user: User | null;
      role: Role | null;
      roles: Role[] | null;
      tenantId: string;
      srv: SupabaseClient<Database>;
      adminSrv: SupabaseClient<Database>;
      requestId: string;
    }
    interface PageData {
      session?: Session | null;
      role?: Role | null;
      roles?: Role[] | null;
      user?: User | null;
    }
  }
}

export {};
