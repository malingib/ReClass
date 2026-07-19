export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string | null
          entity: string
          entity_id: string | null
          id: number
          ip: unknown
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          entity: string
          entity_id?: string | null
          id?: number
          ip?: unknown
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string | null
          entity?: string
          entity_id?: string | null
          id?: number
          ip?: unknown
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_requests: {
        Row: {
          amount: number
          checkout_id: string
          created_at: string | null
          id: string
          invoice_id: string | null
          phone: string | null
          reason: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          checkout_id: string
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          phone?: string | null
          reason?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          phone?: string | null
          reason?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          created_at: string
          created_by: string | null
          encrypted_blob: string
          environment: string
          id: string
          is_active: boolean
          label: string
          last_tested_at: string | null
          provider: string
          purpose: string
          scope: string
          tenant_id: string | null
          test_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          encrypted_blob: string
          environment: string
          id?: string
          is_active?: boolean
          label: string
          last_tested_at?: string | null
          provider: string
          purpose: string
          scope: string
          tenant_id?: string | null
          test_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          encrypted_blob?: string
          environment?: string
          id?: string
          is_active?: boolean
          label?: string
          last_tested_at?: string | null
          provider?: string
          purpose?: string
          scope?: string
          tenant_id?: string | null
          test_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_types: {
        Row: {
          amount: number
          deleted_at: string | null
          due_date: string | null
          id: string
          name: string
          tenant_id: string
          term: string | null
        }
        Insert: {
          amount: number
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          name: string
          tenant_id: string
          term?: string | null
        }
        Update: {
          amount?: number
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          name?: string
          tenant_id?: string
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians_link: {
        Row: {
          is_primary: boolean | null
          parent_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          is_primary?: boolean | null
          parent_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          is_primary?: boolean | null
          parent_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_link_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_link_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string | null
          deleted_at: string | null
          due_date: string | null
          fee_type_id: string | null
          id: string
          last_reminded_at: string | null
          status: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string | null
          deleted_at?: string | null
          due_date?: string | null
          fee_type_id?: string | null
          id?: string
          last_reminded_at?: string | null
          status?: string | null
          student_id: string
          tenant_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string | null
          deleted_at?: string | null
          due_date?: string | null
          fee_type_id?: string | null
          id?: string
          last_reminded_at?: string | null
          status?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempts: number | null
          body: string | null
          channel: string | null
          created_at: string | null
          external_id: string | null
          id: string
          last_error: string | null
          next_retry_at: string | null
          recipient: string | null
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          status: string | null
          template: string | null
          tenant_id: string
        }
        Insert: {
          attempts?: number | null
          body?: string | null
          channel?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          recipient?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string | null
          template?: string | null
          tenant_id: string
        }
        Update: {
          attempts?: number | null
          body?: string | null
          channel?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          recipient?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          status?: string | null
          template?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          locale: string | null
          phone: string
          sms_consent: boolean | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          locale?: string | null
          phone: string
          sms_consent?: boolean | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          locale?: string | null
          phone?: string
          sms_consent?: boolean | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliations: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          note: string | null
          originally_for: string | null
          payment_id: string
          reassigned_to_invoice: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          tenant_id: string
          updated_at: string | null
          week_start: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          originally_for?: string | null
          payment_id: string
          reassigned_to_invoice?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          week_start: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          note?: string | null
          originally_for?: string | null
          payment_id?: string
          reassigned_to_invoice?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_reassigned_to_invoice_fkey"
            columns: ["reassigned_to_invoice"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string
          method: string | null
          mpesa_checkout_id: string | null
          mpesa_receipt: string | null
          phone: string | null
          reconciled_at: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          method?: string | null
          mpesa_checkout_id?: string | null
          mpesa_receipt?: string | null
          phone?: string | null
          reconciled_at?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          method?: string | null
          mpesa_checkout_id?: string | null
          mpesa_receipt?: string | null
          phone?: string | null
          reconciled_at?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          amount: number
          created_at: string | null
          deleted_at: string | null
          id: string
          occurrences_count: number
          paid_at: string | null
          period_end: string
          period_start: string
          rate_per_session: number
          status: string | null
          teacher_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          occurrences_count?: number
          paid_at?: string | null
          period_end: string
          period_start: string
          rate_per_session?: number
          status?: string | null
          teacher_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          occurrences_count?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          rate_per_session?: number
          status?: string | null
          teacher_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          full_name: string
          id: string
          locale: string | null
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          full_name: string
          id: string
          locale?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          full_name?: string
          id?: string
          locale?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      session_occurrences: {
        Row: {
          end_time: string
          id: string
          occurs_on: string
          room: string | null
          session_id: string
          start_time: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          end_time: string
          id?: string
          occurs_on: string
          room?: string | null
          session_id: string
          start_time: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          end_time?: string
          id?: string
          occurs_on?: string
          room?: string | null
          session_id?: string
          start_time?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_occurrences_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_occurrences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          active: boolean | null
          class: string | null
          created_at: string
          day_of_week: number | null
          deleted_at: string | null
          end_time: string
          id: string
          recurrence: Json | null
          slot: string | null
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          class?: string | null
          created_at?: string
          day_of_week?: number | null
          deleted_at?: string | null
          end_time: string
          id?: string
          recurrence?: Json | null
          slot?: string | null
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          class?: string | null
          created_at?: string
          day_of_week?: number | null
          deleted_at?: string | null
          end_time?: string
          id?: string
          recurrence?: Json | null
          slot?: string | null
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_no: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          first_name: string
          grade: string | null
          id: string
          last_name: string
          photo_url: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          admission_no: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          first_name: string
          grade?: string | null
          id?: string
          last_name: string
          photo_url?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          admission_no?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          first_name?: string
          grade?: string | null
          id?: string
          last_name?: string
          photo_url?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          deleted_at: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          code?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          code?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          marked_at: string | null
          marked_by: string | null
          occurrence_id: string
          status: string
          teacher_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          occurrence_id: string
          status: string
          teacher_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          occurrence_id?: string
          status?: string
          teacher_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "session_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          employee_no: string | null
          first_name: string
          id: string
          last_name: string
          profile_id: string | null
          subjects: string[] | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          employee_no?: string | null
          first_name: string
          id?: string
          last_name: string
          profile_id?: string | null
          subjects?: string[] | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          employee_no?: string | null
          first_name?: string
          id?: string
          last_name?: string
          profile_id?: string | null
          subjects?: string[] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          academic_year: string | null
          brand_primary: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          id: string
          logo_url: string | null
          mpesa_passkey_secret_ref: string | null
          mpesa_paybill: string | null
          mpesa_shortcode: string | null
          name: string
          payroll_rate_per_session: number | null
          settings: Json | null
          slug: string
          sms_sender_id: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          brand_primary?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          mpesa_passkey_secret_ref?: string | null
          mpesa_paybill?: string | null
          mpesa_shortcode?: string | null
          name: string
          payroll_rate_per_session?: number | null
          settings?: Json | null
          slug: string
          sms_sender_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          brand_primary?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          mpesa_passkey_secret_ref?: string | null
          mpesa_paybill?: string | null
          mpesa_shortcode?: string | null
          name?: string
          payroll_rate_per_session?: number | null
          settings?: Json | null
          slug?: string
          sms_sender_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waivers: {
        Row: {
          amount: number
          created_at: string | null
          granted_by: string | null
          id: string
          invoice_id: string
          reason: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          granted_by?: string | null
          id?: string
          invoice_id: string
          reason: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          granted_by?: string | null
          id?: string
          invoice_id?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waivers_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waivers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_credential: { Args: { p_id: string }; Returns: Json }
      encrypt_credential: { Args: { p_json: Json }; Returns: string }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      reconcile_payment: {
        Args: {
          p_amount: number
          p_checkout_id: string
          p_phone: string
          p_tenant_id: string
        }
        Returns: Json
      }
      resolve_credential: {
        Args: {
          p_allow_sandbox?: boolean
          p_provider: string
          p_tenant: string
        }
        Returns: string
      }
      set_tenant_context: {
        Args: { p_role: string; p_tenant: string }
        Returns: undefined
      }
      tenant_setting_enabled: {
        Args: { p_key: string; p_tenant: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
