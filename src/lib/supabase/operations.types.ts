import type { Database, Json } from './database.types';

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type OperationsDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables' | 'Functions'> & {
    Tables: Database['public']['Tables'] & {
      student_lifecycle_events: Table<
        { id: string; tenant_id: string; student_id: string; event_type: string; event_date: string; from_class_id: string | null; to_class_id: string | null; notes: string | null; created_by: string | null; created_at: string },
        { id?: string; tenant_id: string; student_id: string; event_type: string; event_date?: string; from_class_id?: string | null; to_class_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string },
        { id?: string; tenant_id?: string; student_id?: string; event_type?: string; event_date?: string; from_class_id?: string | null; to_class_id?: string | null; notes?: string | null; created_by?: string | null; created_at?: string }
      >;
      discipline_cases: Table<
        { id: string; tenant_id: string; student_id: string; incident_date: string; category: string; severity: string; description: string; action_taken: string | null; status: string; follow_up_date: string | null; created_by: string | null; resolved_by: string | null; resolved_at: string | null; created_at: string; updated_at: string },
        { id?: string; tenant_id: string; student_id: string; incident_date?: string; category: string; severity?: string; description: string; action_taken?: string | null; status?: string; follow_up_date?: string | null; created_by?: string | null; resolved_by?: string | null; resolved_at?: string | null; created_at?: string; updated_at?: string },
        { id?: string; tenant_id?: string; student_id?: string; incident_date?: string; category?: string; severity?: string; description?: string; action_taken?: string | null; status?: string; follow_up_date?: string | null; created_by?: string | null; resolved_by?: string | null; resolved_at?: string | null; created_at?: string; updated_at?: string }
      >;
      school_calendar_events: Table<
        { id: string; tenant_id: string; title: string; event_type: string; starts_at: string; ends_at: string | null; all_day: boolean; audience: string; location: string | null; description: string | null; created_by: string | null; created_at: string; updated_at: string },
        { id?: string; tenant_id: string; title: string; event_type?: string; starts_at: string; ends_at?: string | null; all_day?: boolean; audience?: string; location?: string | null; description?: string | null; created_by?: string | null; created_at?: string; updated_at?: string },
        { id?: string; tenant_id?: string; title?: string; event_type?: string; starts_at?: string; ends_at?: string | null; all_day?: boolean; audience?: string; location?: string | null; description?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
      >;
      teacher_tasks: Table<
        { id: string; tenant_id: string; teacher_id: string; title: string; description: string | null; due_at: string; priority: string; status: string; reminder_minutes: number; reminder_sent_at: string | null; completed_at: string | null; created_by: string | null; created_at: string; updated_at: string },
        { id?: string; tenant_id: string; teacher_id: string; title: string; description?: string | null; due_at: string; priority?: string; status?: string; reminder_minutes?: number; reminder_sent_at?: string | null; completed_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string },
        { id?: string; tenant_id?: string; teacher_id?: string; title?: string; description?: string | null; due_at?: string; priority?: string; status?: string; reminder_minutes?: number; reminder_sent_at?: string | null; completed_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
      >;
    };
    Functions: Database['public']['Functions'] & {
      enqueue_teacher_task_reminders: { Args: Record<string, never>; Returns: number };
    };
  };
};

export type OperationsJson = Json;
