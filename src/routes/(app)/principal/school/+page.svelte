<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  const { data } = $props();
  const classes = $derived(data.classes);
  const enrollments = $derived(data.enrollments);
  const students = $derived(data.students);
  const stats = $derived(data.stats);
</script>

<DashboardContent title="School overview" subtitle="School-wide student information — read-only">
  <div class="space-y-8">
    <!-- School-wide stats -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div class="anim-card stagger-1 rounded-xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
        <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Students</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{stats?.students ?? 0}</p>
      </div>
      <div class="anim-card stagger-2 rounded-xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
        <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Classes</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{stats?.classes ?? 0}</p>
      </div>
      <div class="anim-card stagger-3 rounded-xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
        <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Admissions</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{stats?.admissions ?? 0}</p>
      </div>
      <div class="anim-card stagger-4 rounded-xl border border-slate-200/60 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
        <p class="text-xs font-medium uppercase tracking-wider text-slate-400">Active enrollments</p>
        <p class="mt-1 text-2xl font-bold text-slate-900">{stats?.enrollments ?? 0}</p>
      </div>
    </div>

    <!-- Class list -->
    <div class="anim-card stagger-5 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
      <div class="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <h2 class="text-base font-semibold text-slate-900">Classes</h2>
        <p class="mt-1 text-sm text-slate-500">Homeroom and stream structure.</p>
      </div>
      <div class="p-0">
        <DataTable
          data={classes}
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Class', render: (c: any) => `${c.name}${c.stream ? ` · ${c.stream}` : ''}` },
            { key: 'academic_year', label: 'Academic year', render: (c: any) => c.academic_year ?? '—' },
            { key: 'status', label: 'Status' },
            { key: 'homeroom', label: 'Homeroom teacher', render: (c: any) => c.teachers ? `${c.teachers.first_name} ${c.teachers.last_name}` : '—' },
          ]}
          emptyMessage="No classes yet"
        />
      </div>
    </div>

    <!-- Recent enrollments -->
    <div class="anim-card stagger-6 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
      <div class="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <h2 class="text-base font-semibold text-slate-900">Recent enrollments</h2>
        <p class="mt-1 text-sm text-slate-500">Latest student placements into classes.</p>
      </div>
      <div class="p-0">
        <DataTable
          data={enrollments}
          columns={[
            { key: 'created_at', label: 'Enrolled', render: (e: any) => e.enrolled_at ?? (e.created_at ? new Date(e.created_at).toLocaleDateString() : '—') },
            { key: 'student', label: 'Student', render: (e: any) => e.students ? `${e.students.first_name} ${e.students.last_name} (${e.students.admission_no ?? '—'})` : '—' },
            { key: 'class', label: 'Class', render: (e: any) => e.sis_classes ? `${e.sis_classes.name}${e.sis_classes.stream ? ` · ${e.sis_classes.stream}` : ''}` : '—' },
            { key: 'academic_year', label: 'Year', render: (e: any) => e.academic_year ?? '—' },
            { key: 'status', label: 'Status' },
          ]}
          emptyMessage="No enrollments yet"
        />
      </div>
    </div>

    <!-- Students -->
    <div class="anim-card stagger-7 overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
      <div class="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <h2 class="text-base font-semibold text-slate-900">Students</h2>
        <p class="mt-1 text-sm text-slate-500">Alphabetical listing of active student records.</p>
      </div>
      <div class="p-0">
        <DataTable
          data={students}
          columns={[
            { key: 'admission_no', label: 'Adm No', render: (s: any) => s.admission_no ?? '—' },
            { key: 'first_name', label: 'Name', render: (s: any) => `${s.first_name} ${s.last_name}` },
            { key: 'grade', label: 'Cohort', render: (s: any) => s.grade ?? '—' },
            { key: 'status', label: 'Status' },
          ]}
          emptyMessage="No student records yet"
        />
      </div>
    </div>
  </div>
</DashboardContent>
