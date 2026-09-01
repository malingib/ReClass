/**
 * Optimized dashboard queries for principal and other roles
 * Reduces database round-trips and improves performance
 */

import { createClient } from '@supabase/supabase-js';
import { metricsCollector } from '$lib/monitoring';

export interface DashboardStats {
  students: number;
  teachers: number;
  sessions: number;
  attendanceRate: number;
  pendingAttendanceCount: number;
}

export interface SISStats {
  totalStudents: number;
  totalTeachers: number;
  totalSessions: number;
  activeClasses: number;
  recentAdmissions: number;
  totalEnrollments: number;
}

export interface AttendanceData {
  dueCount: number;
  deliveredCount: number;
  pendingAttendance: any[];
}

export async function getPrincipalDashboardOptimized(
  supabase: any,
  tenantId: string
): Promise<{
  stats: DashboardStats;
  sis: SISStats;
  pendingAttendance: any[];
}> {
  const startTime = Date.now();
  
  try {
    const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    // Batch all count queries into a single RPC call
    const { data: countsData, error: countsError } = await supabase.rpc('get_dashboard_counts', {
      p_tenant_id: tenantId,
      p_since_date: since,
      p_today_date: today
    });

    if (countsError) {
      throw new Error(`Failed to get dashboard counts: ${countsError.message}`);
    }

    // Batch attendance data queries
    const { data: attendanceData, error: attendanceError } = await supabase.rpc('get_attendance_overview', {
      p_tenant_id: tenantId,
      p_since_date: since,
      p_today_date: today
    });

    if (attendanceError) {
      throw new Error(`Failed to get attendance overview: ${attendanceError.message}`);
    }

    // Get SIS stats (already optimized)
    const { data: sisData, error: sisError } = await supabase
      .from('sis_stats_view')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (sisError) {
      throw new Error(`Failed to get SIS stats: ${sisError.message}`);
    }

    // Calculate attendance rate
    const attendanceRate = countsData.due_occurrences_count > 0 
      ? Math.round((countsData.delivered_attendance_count / countsData.due_occurrences_count) * 100)
      : 0;

    // Get pending attendance details (limited)
    const { data: pendingAttendance, error: pendingError } = await supabase
      .from('teacher_attendance')
      .select(`
        id, 
        status, 
        marked_at, 
        teachers(first_name, last_name), 
        session_occurrences(
          occurs_on, 
          start_time, 
          end_time, 
          room, 
          class, 
          sessions(subjects(name))
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'pending')
      .is('deleted_at', null)
      .order('marked_at')
      .limit(20); // Limit to prevent large responses

    if (pendingError) {
      throw new Error(`Failed to get pending attendance: ${pendingError.message}`);
    }

    const result = {
      stats: {
        students: countsData.total_students_count || 0,
        teachers: countsData.total_teachers_count || 0,
        sessions: countsData.total_sessions_count || 0,
        attendanceRate,
        pendingAttendanceCount: countsData.pending_attendance_count || 0,
      },
      sis: {
        totalStudents: sisData?.total_students || 0,
        totalTeachers: sisData?.total_teachers || 0,
        totalSessions: sisData?.total_sessions || 0,
        activeClasses: sisData?.active_classes || 0,
        recentAdmissions: sisData?.recent_admissions || 0,
        totalEnrollments: sisData?.total_enrollments || 0,
      },
      pendingAttendance: pendingAttendance || [],
    };

    // Record performance metrics
    const duration = Date.now() - startTime;
    metricsCollector.recordMetric('db_query_duration', duration);
    
    if (duration > 1000) {
      metricsCollector.incrementCounter('db_slow_queries');
      console.warn(`Slow dashboard query: ${duration}ms`);
    }

    return result;
  } catch (error) {
    metricsCollector.incrementCounter('error_count');
    throw error;
  }
}

// Create optimized database functions if they don't exist
export async function createOptimizedFunctions(supabase: any): Promise<void> {
  // Create dashboard counts RPC function
  const { error: countsError } = await supabase.rpc('create_optimized_dashboard_counts_function');
  if (countsError && !countsError.message.includes('already exists')) {
    console.warn('Failed to create dashboard counts function:', countsError.message);
  }

  // Create attendance overview RPC function
  const { error: attendanceError } = await supabase.rpc('create_optimized_attendance_function');
  if (attendanceError && !attendanceError.message.includes('already exists')) {
    console.warn('Failed to create attendance function:', attendanceError.message);
  }

  // Create SIS stats view
  const { error: sisError } = await supabase.rpc('create_sis_stats_view');
  if (sisError && !sisError.message.includes('already exists')) {
    console.warn('Failed to create SIS stats view:', sisError.message);
  }
}