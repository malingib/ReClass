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
          fee_type_id: string | null
          id: string
          phone: string | null
          reason: string | null
          status: string | null
          student_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          checkout_id: string
          created_at?: string | null
          fee_type_id?: string | null
          id?: string
          phone?: string | null
          reason?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          checkout_id?: string
          created_at?: string | null
          fee_type_id?: string | null
          id?: string
          phone?: string | null
          reason?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_requests_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
      comm_announcements: {
        Row: {
          audience: string | null
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          priority: string | null
          published_at: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          audience?: string | null
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          published_at?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          audience?: string | null
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          published_at?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comm_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comm_announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comm_templates: {
        Row: {
          body: string
          channel: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          subject: string | null
          tenant_id: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          body: string
          channel?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          subject?: string | null
          tenant_id: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          body?: string
          channel?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "comm_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comm_templates_tenant_id_fkey"
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          incurred_at: string
          notes: string | null
          paid_by: string | null
          receipt_url: string | null
          tenant_id: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          incurred_at?: string
          notes?: string | null
          paid_by?: string | null
          receipt_url?: string | null
          tenant_id: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          incurred_at?: string
          notes?: string | null
          paid_by?: string | null
          receipt_url?: string | null
          tenant_id?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
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
          domain: string
          due_date: string | null
          id: string
          name: string
          tenant_id: string
          term: string | null
        }
        Insert: {
          amount: number
          deleted_at?: string | null
          domain?: string
          due_date?: string | null
          id?: string
          name: string
          tenant_id: string
          term?: string | null
        }
        Update: {
          amount?: number
          deleted_at?: string | null
          domain?: string
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
          tenant_id: string
        }
        Insert: {
          is_primary?: boolean | null
          parent_id: string
          relationship?: string | null
          student_id: string
          tenant_id: string
        }
        Update: {
          is_primary?: boolean | null
          parent_id?: string
          relationship?: string | null
          student_id?: string
          tenant_id?: string
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
          {
            foreignKeyName: "guardians_link_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          impersonator_id: string
          ip_address: string | null
          revoked_at: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          impersonator_id: string
          ip_address?: string | null
          revoked_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          impersonator_id?: string
          ip_address?: string | null
          revoked_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          sender_role: string
          tenant_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          sender_role: string
          tenant_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          sender_role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
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
          claimed_at: string | null
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
          claimed_at?: string | null
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
          claimed_at?: string | null
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
      other_income: {
        Row: {
          amount: number
          category: string
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          notes: string | null
          received_at: string
          received_by: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          notes?: string | null
          received_at?: string
          received_by?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          received_at?: string
          received_by?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "other_income_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "other_income_tenant_id_fkey"
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
          profile_id: string | null
          sms_consent: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          locale?: string | null
          phone: string
          profile_id?: string | null
          sms_consent?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          locale?: string | null
          phone?: string
          profile_id?: string | null
          sms_consent?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_tenant_id_fkey"
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
          bank_name: string | null
          bank_reference: string | null
          cashier_id: string | null
          created_at: string | null
          deposited_by: string | null
          domain: string
          fee_type_id: string | null
          id: string
          method: string | null
          mpesa_checkout_id: string | null
          mpesa_receipt: string | null
          phone: string | null
          receipt_no: string | null
          reconciled_at: string | null
          status: string | null
          student_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_name?: string | null
          bank_reference?: string | null
          cashier_id?: string | null
          created_at?: string | null
          deposited_by?: string | null
          domain?: string
          fee_type_id?: string | null
          id?: string
          method?: string | null
          mpesa_checkout_id?: string | null
          mpesa_receipt?: string | null
          phone?: string | null
          receipt_no?: string | null
          reconciled_at?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_name?: string | null
          bank_reference?: string | null
          cashier_id?: string | null
          created_at?: string | null
          deposited_by?: string | null
          domain?: string
          fee_type_id?: string | null
          id?: string
          method?: string | null
          mpesa_checkout_id?: string | null
          mpesa_receipt?: string | null
          phone?: string | null
          receipt_no?: string | null
          reconciled_at?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_deposited_by_fkey"
            columns: ["deposited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
          domain: string
          id: string
          occurrences_count: number
          paid_at: string | null
          period_end: string
          period_start: string
          rate_per_session: number
          salary_amount: number | null
          status: string | null
          teacher_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          deleted_at?: string | null
          domain?: string
          id?: string
          occurrences_count?: number
          paid_at?: string | null
          period_end: string
          period_start: string
          rate_per_session?: number
          salary_amount?: number | null
          status?: string | null
          teacher_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          deleted_at?: string | null
          domain?: string
          id?: string
          occurrences_count?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          rate_per_session?: number
          salary_amount?: number | null
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
      rate_limits: {
        Row: {
          bucket_key: string
          count: number
          reset_at: string
        }
        Insert: {
          bucket_key: string
          count: number
          reset_at: string
        }
        Update: {
          bucket_key?: string
          count?: number
          reset_at?: string
        }
        Relationships: []
      }
      session_occurrences: {
        Row: {
          class: string | null
          created_at: string
          end_time: string
          id: string
          occurs_on: string
          room: string | null
          session_id: string
          start_time: string
          status: string | null
          teacher_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          class?: string | null
          created_at?: string
          end_time: string
          id?: string
          occurs_on: string
          room?: string | null
          session_id: string
          start_time: string
          status?: string | null
          teacher_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          class?: string | null
          created_at?: string
          end_time?: string
          id?: string
          occurs_on?: string
          room?: string | null
          session_id?: string
          start_time?: string
          status?: string | null
          teacher_id?: string | null
          tenant_id?: string
          updated_at?: string
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
            foreignKeyName: "session_occurrences_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
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
          room: string | null
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
          room?: string | null
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
          room?: string | null
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
      sis_admissions: {
        Row: {
          admission_date: string | null
          admission_number: string
          created_at: string | null
          created_by: string | null
          grade_applied: string | null
          id: string
          notes: string | null
          previous_school: string | null
          status: string | null
          student_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          admission_date?: string | null
          admission_number: string
          created_at?: string | null
          created_by?: string | null
          grade_applied?: string | null
          id?: string
          notes?: string | null
          previous_school?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          admission_date?: string | null
          admission_number?: string
          created_at?: string | null
          created_by?: string | null
          grade_applied?: string | null
          id?: string
          notes?: string | null
          previous_school?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sis_admissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sis_admissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sis_admissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sis_classes: {
        Row: {
          academic_year: string | null
          code: string
          created_at: string | null
          homeroom_teacher_id: string | null
          id: string
          name: string
          status: string | null
          stream: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          code: string
          created_at?: string | null
          homeroom_teacher_id?: string | null
          id?: string
          name: string
          status?: string | null
          stream?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          code?: string
          created_at?: string | null
          homeroom_teacher_id?: string | null
          id?: string
          name?: string
          status?: string | null
          stream?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sis_classes_homeroom_teacher_id_fkey"
            columns: ["homeroom_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sis_classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sis_enrollments: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string | null
          enrolled_at: string | null
          exited_at: string | null
          id: string
          status: string | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string | null
          enrolled_at?: string | null
          exited_at?: string | null
          id?: string
          status?: string | null
          student_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string | null
          enrolled_at?: string | null
          exited_at?: string | null
          id?: string
          status?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sis_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "sis_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sis_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sis_enrollments_tenant_id_fkey"
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
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string | null
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
          approval_status: string
          created_at: string | null
          deleted_at: string | null
          id: string
          marked_at: string | null
          marked_by: string | null
          occurrence_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          teacher_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          approval_status?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          occurrence_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status: string
          teacher_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          approval_status?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          occurrence_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          teacher_id?: string
          tenant_id?: string
          updated_at?: string | null
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
            foreignKeyName: "teacher_attendance_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          remedial_rate_per_session: number | null
          salary_monthly: number | null
          subjects: string[] | null
          teacher_type: string
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
          remedial_rate_per_session?: number | null
          salary_monthly?: number | null
          subjects?: string[] | null
          teacher_type?: string
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
          remedial_rate_per_session?: number | null
          salary_monthly?: number | null
          subjects?: string[] | null
          teacher_type?: string
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
      tenant_modules: {
        Row: {
          config: Record<string, unknown>
          created_at: string
          deleted_at: string | null
          enabled: boolean
          id: string
          module_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Record<string, unknown>
          created_at?: string
          deleted_at?: string | null
          enabled?: boolean
          id?: string
          module_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Record<string, unknown>
          created_at?: string
          deleted_at?: string | null
          enabled?: boolean
          id?: string
          module_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
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
          buni_shortcode: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          id: string
          kcb_account_no: string | null
          kcb_bank_name: string | null
          logo_url: string | null
          mpesa_passkey_secret_ref: string | null
          mpesa_paybill: string | null
          mpesa_shortcode: string | null
          name: string
          payroll_rate_per_session: number | null
          remedial_payment_channel: string
          school_payment_channel: string
          settings: Json | null
          slug: string
          sms_sender_id: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          brand_primary?: string | null
          buni_shortcode?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          id?: string
          kcb_account_no?: string | null
          kcb_bank_name?: string | null
          logo_url?: string | null
          mpesa_passkey_secret_ref?: string | null
          mpesa_paybill?: string | null
          mpesa_shortcode?: string | null
          name: string
          payroll_rate_per_session?: number | null
          remedial_payment_channel?: string
          school_payment_channel?: string
          settings?: Json | null
          slug: string
          sms_sender_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          brand_primary?: string | null
          buni_shortcode?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          id?: string
          kcb_account_no?: string | null
          kcb_bank_name?: string | null
          logo_url?: string | null
          mpesa_passkey_secret_ref?: string | null
          mpesa_paybill?: string | null
          mpesa_shortcode?: string | null
          name?: string
          payroll_rate_per_session?: number | null
          remedial_payment_channel?: string
          school_payment_channel?: string
          settings?: Json | null
          slug?: string
          sms_sender_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      unmatched_payments: {
        Row: {
          amount: number
          bill_ref: string | null
          checkout_id: string
          created_at: string
          id: string
          matched_at: string | null
          matched_by: string | null
          matched_to: string | null
          mpesa_receipt: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bill_ref?: string | null
          checkout_id: string
          created_at?: string
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_to?: string | null
          mpesa_receipt?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_ref?: string | null
          checkout_id?: string
          created_at?: string
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_to?: string | null
          mpesa_receipt?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unmatched_payments_matched_to_fkey"
            columns: ["matched_to"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unmatched_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_payroll_counts: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_tenant_id: string
        }
        Returns: {
          occurrences_count: number
          teacher_id: string
        }[]
      }
      cleanup_notifications: {
        Args: { p_older_than_days?: number }
        Returns: number
      }
      create_session_with_conflict: {
        Args: {
          p_tenant_id: string
          p_class: string
          p_subject_id: string
          p_teacher_id: string
          p_day_of_week: number
          p_start_time: string
          p_end_time: string
          p_room: string
          p_slot?: string | null
        }
        Returns: string
      }
      decrypt_credential: { Args: { p_id: string }; Returns: Json }
      decrypt_tenant_credential: {
        Args: { p_id: string; p_tenant: string }
        Returns: Json
      }
      encrypt_credential: { Args: { p_json: Json }; Returns: string }
      generate_future_session_occurrences: {
        Args: { p_through?: string }
        Returns: number
      }
      generate_session_occurrences: {
        Args: { p_session_id: string; p_through?: string }
        Returns: number
      }
      mark_own_teacher_attendance: {
        Args: {
          p_occurrence_id: string
          p_profile_id: string
          p_status: string
          p_teacher_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      append_message: {
        Args: {
          p_body: string
          p_conversation_id: string
          p_idempotency_key: string
          p_recipient_id: string
          p_sender_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      purge_retention: { Args: never; Returns: undefined }
      claim_notifications: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          body: string | null
          channel: string | null
          id: string
          recipient: string | null
          tenant_id: string
        }[]
      }
      rate_limit_gc: { Args: never; Returns: number }
      rate_limit_hit: {
        Args: { p_key: string; p_max: number; p_window_ms: number }
        Returns: {
          allowed: boolean
          remaining: number
          reset_in_ms: number
        }[]
      }
      reconcile_payment: {
        Args: {
          p_amount: number
          p_checkout_id: string
          p_domain?: string
          p_fee_type_id?: string
          p_phone: string
          p_student_id?: string
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
      review_teacher_attendance: {
        Args: {
          p_attendance_id: string
          p_decision: string
          p_note?: string
          p_profile_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      set_tenant_context:
        | { Args: { p_role: string; p_tenant: string }; Returns: undefined }
        | { Args: { p_tenant_id: string }; Returns: undefined }
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
  public: {
    Enums: {},
  },
} as const
