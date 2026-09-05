-- Create optimized functions for dashboard queries to reduce database round-trips
-- This improves principal dashboard performance by batching multiple queries into single RPC calls

CREATE OR REPLACE FUNCTION get_dashboard_counts(p_tenant_id UUID,p_since_date DATE,p_today_date DATE)
RETURNS TABLE(total_students_count BIGINT,total_teachers_count BIGINT,total_sessions_count BIGINT,due_occurrences_count BIGINT,delivered_attendance_count BIGINT,pending_attendance_count BIGINT) AS $$
BEGIN RETURN QUERY WITH student_counts AS (SELECT COUNT(*)::BIGINT total_students_count FROM students WHERE tenant_id=p_tenant_id AND deleted_at IS NULL), teacher_counts AS (SELECT COUNT(*)::BIGINT total_teachers_count FROM teachers WHERE tenant_id=p_tenant_id AND deleted_at IS NULL), session_counts AS (SELECT COUNT(*)::BIGINT total_sessions_count FROM sessions WHERE tenant_id=p_tenant_id AND active=true), due_occurrences AS (SELECT COUNT(*)::BIGINT count FROM session_occurrences WHERE tenant_id=p_tenant_id AND occurs_on BETWEEN p_since_date AND p_today_date AND status!='cancelled'), delivered_attendance AS (SELECT COUNT(*)::BIGINT count FROM teacher_attendance ta JOIN session_occurrences so ON ta.session_occurrence_id=so.id WHERE ta.tenant_id=p_tenant_id AND ta.approval_status='approved' AND ta.status IN ('present','late') AND so.occurs_on BETWEEN p_since_date AND p_today_date), pending_attendance AS (SELECT COUNT(*)::BIGINT count FROM teacher_attendance WHERE tenant_id=p_tenant_id AND approval_status='pending' AND deleted_at IS NULL) SELECT COALESCE((SELECT total_students_count FROM student_counts),0),COALESCE((SELECT total_teachers_count FROM teacher_counts),0),COALESCE((SELECT total_sessions_count FROM session_counts),0),COALESCE((SELECT count FROM due_occurrences),0),COALESCE((SELECT count FROM delivered_attendance),0),COALESCE((SELECT count FROM pending_attendance),0) FROM student_counts LIMIT 1; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_attendance_overview(p_tenant_id UUID,p_since_date DATE,p_today_date DATE)
RETURNS TABLE(attendance_data JSONB,trend_data JSONB) AS $$
BEGIN RETURN QUERY WITH daily_attendance AS (SELECT so.occurs_on::DATE,COUNT(CASE WHEN ta.status='present' THEN 1 END) present_count,COUNT(CASE WHEN ta.status='late' THEN 1 END) late_count,COUNT(CASE WHEN ta.status='absent' THEN 1 END) absent_count,COUNT(*) total_count FROM session_occurrences so LEFT JOIN teacher_attendance ta ON so.id=ta.session_occurrence_id AND ta.tenant_id=p_tenant_id AND ta.approval_status='approved' WHERE so.tenant_id=p_tenant_id AND so.occurs_on BETWEEN p_since_date AND p_today_date AND so.status!='cancelled' GROUP BY so.occurs_on::DATE ORDER BY so.occurs_on::DATE) SELECT COALESCE(jsonb_agg(jsonb_build_object('date',occurs_on::TEXT,'present',present_count,'late',late_count,'absent',absent_count,'total',total_count,'rate',CASE WHEN total_count>0 THEN ROUND((present_count+late_count)*100.0/total_count,1) ELSE 0 END)),'[]'),COALESCE(jsonb_build_object('overall_rate',ROUND(SUM(present_count+late_count)*100.0/NULLIF(SUM(total_count),0),1),'total_sessions',SUM(total_count),'completed_sessions',SUM(present_count+late_count)),'{}') FROM daily_attendance; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW sis_stats_view AS
SELECT s.tenant_id,COUNT(DISTINCT s.id) total_students,COUNT(DISTINCT t.id) total_teachers,COUNT(DISTINCT se.id) total_sessions,COUNT(DISTINCT c.id) active_classes,COUNT(DISTINCT a.id) recent_admissions,COUNT(DISTINCT e.id) total_enrollments
FROM students s
LEFT JOIN teachers t ON s.tenant_id=t.tenant_id AND t.deleted_at IS NULL
LEFT JOIN sessions se ON s.tenant_id=se.tenant_id AND se.active=true
LEFT JOIN sis_classes c ON s.tenant_id=c.tenant_id AND c.status='active'
LEFT JOIN sis_admissions a ON s.tenant_id=a.tenant_id AND a.created_at>=NOW()-INTERVAL '30 days'
LEFT JOIN sis_enrollments e ON s.tenant_id=e.tenant_id
WHERE s.tenant_id=CURRENT_SETTING('app.tenant_id',true)::UUID AND s.deleted_at IS NULL GROUP BY s.tenant_id;

CREATE OR REPLACE FUNCTION create_optimized_dashboard_counts_function() RETURNS VOID AS $$ BEGIN RETURN; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION create_optimized_attendance_function() RETURNS VOID AS $$ BEGIN RETURN; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION create_sis_stats_view() RETURNS VOID AS $$ BEGIN RETURN; END; $$ LANGUAGE plpgsql;
