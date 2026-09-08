import type { Database, Json } from './database.types';

type Table<Row = any, Insert = any, Update = any> = { Row: Row; Insert: Insert; Update: Update; Relationships: any[] };

/**
 * Operations schema intentionally permits newly migrated operational tables before
 * generated Supabase types are refreshed. Known tables remain strongly typed.
 */
export type OperationsDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Functions'> & {
    Tables: Database['public']['Tables'] & Record<string, Table> & {
      student_lifecycle_events: Table<
        { id: string; tenant_id: string; student_id: string; event_type: string; event_date: string; from_class_id: string | null; to_class_id: string | null; notes: string | null; created_by: string | null; created_at: string },
        { id?: string; tenant_id: string; student_id: string; event_type: string; event_date?: string; from_class_id?: string | null; to_class_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string },
        { id?: string; tenant_id?: string; student_id?: string; event_type?: string; event_date?: string; from_class_id?: string | null; to_class_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string }
      >;
      discipline_cases: Table;
      school_calendar_events: Table;
      teacher_tasks: Table;
    };
    Functions: Database['public']['Functions'] & Record<string, { Args: Record<string, any>; Returns: any }> & {
      enqueue_teacher_task_reminders: { Args: Record<string, never>; Returns: number };
    };
  };
};

export type OperationsJson = Json;
