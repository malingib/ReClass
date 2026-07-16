// ReClass Supabase Database Types
// Generated from `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`
// This is a placeholder with key table types for type-safety in queries.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          brand_primary: string | null;
          mpesa_shortcode: string | null;
          mpesa_paybill: string | null;
          mpesa_passkey_secret_ref: string | null;
          sms_sender_id: string | null;
          currency: string;
          academic_year: string | null;
          timezone: string;
          payroll_rate_per_session: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          brand_primary?: string | null;
          mpesa_shortcode?: string | null;
          mpesa_paybill?: string | null;
          mpesa_passkey_secret_ref?: string | null;
          sms_sender_id?: string | null;
          currency?: string;
          academic_year?: string | null;
          timezone?: string;
          payroll_rate_per_session?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          brand_primary?: string | null;
          mpesa_shortcode?: string | null;
          mpesa_paybill?: string | null;
          mpesa_passkey_secret_ref?: string | null;
          sms_sender_id?: string | null;
          currency?: string;
          academic_year?: string | null;
          timezone?: string;
          payroll_rate_per_session?: number | null;
        };
      };
      students: {
        Row: {
          id: string;
          tenant_id: string;
          admission_no: string;
          first_name: string;
          last_name: string;
          grade: string | null;
          photo_url: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          admission_no: string;
          first_name: string;
          last_name: string;
          grade?: string | null;
          photo_url?: string | null;
          status?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          admission_no?: string;
          first_name?: string;
          last_name?: string;
          grade?: string | null;
          photo_url?: string | null;
          status?: string;
          created_by?: string | null;
        };
      };
      teachers: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string | null;
          first_name: string;
          last_name: string;
          employee_no: string | null;
          subjects: string[] | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          profile_id?: string | null;
          first_name: string;
          last_name: string;
          employee_no?: string | null;
          subjects?: string[] | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          profile_id?: string | null;
          first_name?: string;
          last_name?: string;
          employee_no?: string | null;
          subjects?: string[] | null;
        };
      };
      subjects: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          code: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          code?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          code?: string | null;
        };
      };
      remedial_groups: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          subject_id: string | null;
          teacher_id: string | null;
          room: string | null;
          capacity: number | null;
          term: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          subject_id?: string | null;
          teacher_id?: string | null;
          room?: string | null;
          capacity?: number | null;
          term?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          subject_id?: string | null;
          teacher_id?: string | null;
          room?: string | null;
          capacity?: number | null;
          term?: string | null;
        };
      };
      invoices: {
        Row: {
          id: string;
          tenant_id: string;
          student_id: string;
          fee_type_id: string | null;
          amount_due: number;
          amount_paid: number | null;
          status: string;
          due_date: string | null;
          last_reminded_at: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          student_id: string;
          fee_type_id?: string | null;
          amount_due: number;
          amount_paid?: number | null;
          status?: string;
          due_date?: string | null;
          last_reminded_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          student_id?: string;
          fee_type_id?: string | null;
          amount_due?: number;
          amount_paid?: number | null;
          status?: string;
          due_date?: string | null;
          last_reminded_at?: string | null;
        };
      };
      attendance: {
        Row: {
          id: string;
          tenant_id: string;
          occurrence_id: string;
          student_id: string;
          status: string;
          marked_by: string | null;
          marked_at: string;
          locked: boolean | null;
          edit_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          occurrence_id: string;
          student_id: string;
          status: string;
          marked_by?: string | null;
          marked_at?: string;
          locked?: boolean | null;
          edit_reason?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          occurrence_id?: string;
          student_id?: string;
          status?: string;
          marked_by?: string | null;
          marked_at?: string;
          locked?: boolean | null;
          edit_reason?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, unknown>;
    Enums: Record<string, never>;
  };
}
