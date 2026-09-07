-- eShule school-operations foundation: lifecycle, discipline, calendar and teacher tasks
CREATE TABLE IF NOT EXISTS public.student_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('admitted','enrolled','class_changed','transferred','graduated','withdrawn','reactivated','note')),
  event_date date NOT NULL DEFAULT CURRENT_DATE, from_class_id uuid REFERENCES public.sis_classes(id) ON DELETE RESTRICT,
  to_class_id uuid REFERENCES public.sis_classes(id) ON DELETE RESTRICT, notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_lifecycle_tenant_student_date ON public.student_lifecycle_events(tenant_id, student_id, event_date DESC);
ALTER TABLE public.student_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY lifecycle_tenant_isolation ON public.student_lifecycle_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS public.discipline_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT, incident_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL CHECK (category IN ('attendance','conduct','academic','bullying','property','other')),
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','moderate','major','critical')),
  description text NOT NULL, action_taken text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','closed')),
  follow_up_date date, created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_discipline_tenant_status_date ON public.discipline_cases(tenant_id, status, incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_discipline_tenant_student ON public.discipline_cases(tenant_id, student_id, incident_date DESC);
ALTER TABLE public.discipline_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY discipline_tenant_isolation ON public.discipline_cases USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS public.school_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL, event_type text NOT NULL DEFAULT 'school' CHECK (event_type IN ('school','exam','meeting','holiday','activity','deadline','other')),
  starts_at timestamptz NOT NULL, ends_at timestamptz, all_day boolean NOT NULL DEFAULT false,
  audience text NOT NULL DEFAULT 'staff' CHECK (audience IN ('staff','teachers','parents','all')),
  location text, description text, created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS idx_school_calendar_tenant_start ON public.school_calendar_events(tenant_id, starts_at);
ALTER TABLE public.school_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendar_tenant_isolation ON public.school_calendar_events USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE TABLE IF NOT EXISTS public.teacher_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE, title text NOT NULL, description text,
  due_at timestamptz NOT NULL, priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  reminder_minutes integer NOT NULL DEFAULT 60 CHECK (reminder_minutes BETWEEN 0 AND 10080), reminder_sent_at timestamptz,
  completed_at timestamptz, created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_tasks_tenant_teacher_due ON public.teacher_tasks(tenant_id, teacher_id, status, due_at);
ALTER TABLE public.teacher_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY teacher_tasks_tenant_isolation ON public.teacher_tasks USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE OR REPLACE FUNCTION public.touch_school_operations_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_discipline_updated ON public.discipline_cases;
CREATE TRIGGER trg_discipline_updated BEFORE UPDATE ON public.discipline_cases FOR EACH ROW EXECUTE FUNCTION public.touch_school_operations_updated_at();
DROP TRIGGER IF EXISTS trg_calendar_updated ON public.school_calendar_events;
CREATE TRIGGER trg_calendar_updated BEFORE UPDATE ON public.school_calendar_events FOR EACH ROW EXECUTE FUNCTION public.touch_school_operations_updated_at();
DROP TRIGGER IF EXISTS trg_teacher_tasks_updated ON public.teacher_tasks;
CREATE TRIGGER trg_teacher_tasks_updated BEFORE UPDATE ON public.teacher_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_school_operations_updated_at();

CREATE OR REPLACE FUNCTION public.enqueue_teacher_task_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected integer;
BEGIN
  INSERT INTO public.notifications (tenant_id, related_type, related_id, channel, recipient_user_id, body, status, external_id)
  SELECT t.tenant_id, 'teacher_task', t.id, 'in_app', p.id,
    'Reminder: ' || t.title || ' is due ' || to_char(t.due_at AT TIME ZONE 'Africa/Nairobi', 'DD Mon HH24:MI'),
    'queued', 'teacher-task-reminder:' || t.id::text
  FROM public.teacher_tasks t
  JOIN public.teachers te ON te.id = t.teacher_id AND te.tenant_id = t.tenant_id
  JOIN public.profiles p ON p.id = te.profile_id AND p.tenant_id = t.tenant_id
  WHERE t.status IN ('open','in_progress') AND t.reminder_sent_at IS NULL
    AND t.due_at <= now() + make_interval(mins => t.reminder_minutes) AND t.due_at >= now() - interval '24 hours'
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS affected = ROW_COUNT;
  UPDATE public.teacher_tasks t SET reminder_sent_at = now()
  WHERE t.status IN ('open','in_progress') AND t.reminder_sent_at IS NULL
    AND t.due_at <= now() + make_interval(mins => t.reminder_minutes) AND t.due_at >= now() - interval '24 hours';
  RETURN affected;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enqueue_teacher_task_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_teacher_task_reminders() TO postgres;
SELECT cron.schedule('enqueue-teacher-task-reminders','*/10 * * * *','SELECT public.enqueue_teacher_task_reminders();')
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='enqueue-teacher-task-reminders');
