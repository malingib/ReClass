<script lang="ts">
  import { ArrowRight, BookOpenCheck, CalendarDays, GraduationCap, LayoutDashboard, WalletCards, UsersRound } from 'lucide-svelte';
  const modules = [
    { title: 'Admissions & enrollment', text: 'Intake, learner records and enrollment follow-through.', href: '/admin/admissions', icon: UsersRound },
    { title: 'Student lifecycle', text: 'Follow each learner from admission through movement and completion.', href: '/admin/admissions', icon: GraduationCap },
    { title: 'ReClass remedials', text: 'Run remedial sessions, attendance and programme operations.', href: '/teacher/committee', icon: BookOpenCheck },
    { title: 'School calendar', text: 'Coordinate school events, exams, meetings and deadlines.', href: '/principal/school', icon: CalendarDays },
    { title: 'Teacher workspace', text: 'Today, classes, timetable and assigned tasks.', href: '/teacher', icon: LayoutDashboard },
    { title: 'Finance & parent payments', text: 'Keep fees, reconciliation, payroll and payment evidence connected.', href: '/bursar', icon: WalletCards }
  ];
</script>

<svelte:head><title>School operations · eShule</title><meta name="description" content="School operations hub for eShule." /></svelte:head>

<div class="mx-auto max-w-7xl space-y-7 p-6">
  <div><p class="text-sm font-semibold text-primary">eShule operations</p><h1 class="mt-1 text-3xl font-semibold tracking-tight">School operating system</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">One operational flow from admission to teaching, remedials, calendar coordination, finance and parent payment.</p></div>
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each modules as module}
      <a href={module.href} class="group rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm">
        <div class="flex items-center justify-between"><svelte:component this={module.icon} size={21} class="text-primary"/><ArrowRight size={17} class="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"/></div>
        <h2 class="mt-5 font-semibold">{module.title}</h2><p class="mt-1 text-sm leading-6 text-muted-foreground">{module.text}</p>
      </a>
    {/each}
  </div>
  <div class="rounded-2xl border border-primary/15 bg-primary/5 p-5 text-sm"><strong>Delivery rule:</strong> role ownership stays explicit. Teachers teach and record; ReClass handles remedial operations; Bursar owns school finance; Payroll owns compensation; parents see their children's records and payment actions.</div>
</div>
