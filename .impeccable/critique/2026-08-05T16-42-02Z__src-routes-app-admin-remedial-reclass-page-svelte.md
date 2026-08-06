---
target: src/routes/(app)/admin/(remedial)/reclass/+page.svelte
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
p2_count: 2
timestamp: 2026-08-05T16-42-02Z
slug: src-routes-app-admin-remedial-reclass-page-svelte
---
# Critique: Remedial Dashboard

**Target:** `src/routes/(app)/admin/(remedial)/reclass/+page.svelte`
**Slug:** `src-routes-app-admin-remedial-reclass-page-svelte`
**Mode:** Operate (task-completion admin UI)

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | KPIs load with values, chart has skeleton/empty state. No page-level loading state — tables show nothing until data arrives. |
| 2 | Match System / Real World | 2 | "Remedial Operations" is vague. KPI labels don't speak to remedial-specific mental models (risk, intervention, parent accountability). |
| 3 | User Control and Freedom | 2 | No date range, session, or teacher filters. Data tables are read-only slices. Only escape hatches are outbound links. |
| 4 | Consistency and Standards | 3 | Uses shared Card/DataTable/DashboardContent. But `kpi` and `mini` snippets are defined inline rather than as shared components — drift risk. |
| 5 | Error Prevention | 2 | No error boundary. If load function fails, no fallback — page renders undefined values or crashes silently. |
| 6 | Recognition Rather Than Recall | 2 | KPI "Today" shows "Active" or "—" with no explanation. Relationship between KPIs and mini-stats is unclear. |
| 7 | Flexibility and Efficiency | 1 | Zero shortcuts. No date range picker, no filter, no export, no drill-down. Every path requires navigating away. |
| 8 | Aesthetic and Minimalist Design | 2 | Five visual sections compete. Mini-stats grid duplicates KPIs and chart subheadings. Noise-to-signal is high. |
| 9 | Error Recovery | 1 | No error states, no retry mechanism. Seven parallel queries in server with no graceful degradation visible in template. |
| 10 | Help and Documentation | 1 | No contextual help, tooltips, or guidance. Scheduling empty state tells users to "use the Scheduling page" with no CTA. |
| **Total** | | **19/40** | **Poor** |

---

## Design Specificity Verdict

**Low-to-moderate.** The layout is a generic KPI dashboard template: four stat cards, mini-stats grid, chart, scheduling summary, two data tables, activity feed. Nothing is grounded in remedial-class operations. An unrelated product could use this layout unchanged.

**Deterministic scan:** The CLI detector found **0 issues** in the target file. One `ai-color-palette` warning in `AppShell.svelte` (indigo gradient) — outside scope, likely intentional branding.

---

## Overall Impression

The dashboard is competent but generic. It loads data, displays numbers, and provides links elsewhere. The biggest missed opportunity: a remedial dashboard should immediately answer "which students need attention today?" — instead, it presents the same KPIs any operations dashboard would show.

---

## What's Working

1. **Empty states are thoughtful.** Both the chart and scheduling sections have calm, descriptive copy with helpful guidance rather than blank silence.
2. **Lazy-loaded chart.** Dynamic `import()` with skeleton placeholder avoids blocking first paint — a good performance pattern.
3. **DataTable is solid.** Smart pagination, server-mode delegation, accessible sort controls, and deletion confirmation — well-built.

---

## Priority Issues

| Tag | Issue | Why It Matters | Fix | Command |
|-----|-------|----------------|-----|---------|
| **P0** | **Triple-duplicated KPIs.** "Active sessions", "Teacher attendance", and "M-Pesa collected" each appear in the KPI row, mini-stats grid, AND chart subheadings. | Triples cognitive load. Dashboard feels bloated. User sees the same number 3 times and wonders if they're different. | One canonical location per metric. Kill the mini-stats grid entirely — enrich KPI cards with secondary lines. | `$impeccable distill` |
| **P1** | **`sessionsCount` vs `sessions` ambiguity.** Two similarly-named fields with different meanings (occurrences in 14 days vs total active sessions) placed 3 lines apart. | Users will confuse them. "Sessions today: 5" vs "Active sessions: 12" looks contradictory. | Rename to `upcomingOccurrences` and `totalActiveSessions`, or merge into one KPI with a clear label. | `$impeccable clarify` |
| **P1** | **No error/failure state.** Seven parallel queries in `getReclassStats` with no catch, no error UI, no retry. | Any DB hiccup crashes the dashboard or shows stale values. School admin loses trust. | Add try/catch in server, pass error to page, show error state with retry CTA. | `$impeccable harden` |
| **P2** | **No date range or filter controls.** All metrics hard-coded to "last 14 days" or "today". | Principal reviewing monthly, bursar checking quarterly — no way to adjust scope. | Add date range picker or role-based defaults (teacher=weekly, bursar=monthly). | `$impeccable adapt` |
| **P2** | **"Remedial Operations" title is unanchored.** Subtitle describes contents, not purpose. | No remedial-specific framing (intervention, student risk, parent accountability). | Reframe title around the job: "Remedial Program Overview" or "Student Recovery Dashboard". | `$impeccable clarify` |

---

## Persona Red Flags

### Jordan (First-Timer)
- Triple-duplicated KPIs create confusion — Jordan thinks there are 3 different "session" metrics.
- "Today" KPI showing "Active" or "—" with no explanation of what "Active" means for remedial sessions is opaque.
- No contextual help at any decision point.

### Riley (Stress Tester)
- Zero error handling. Any database hiccup, network timeout, or permission edge case produces an unhandled failure.
- Empty states exist but are unreachable if the server query throws — the page will crash before rendering them.

### Casey (Mobile)
- 2×2 KPI grid works on mobile, but the mini-stats 2×3 grid and chart+sidebar layout (`lg:grid-cols-[1fr_1.5fr]`) stack vertically, pushing the chart below the fold.
- Scheduling 3-col grid (line 124) has no mobile breakpoint — stays 3-col, cramming content on small screens.

---

## Minor Observations

- `kpi` snippet badge defaults to "Live" (line 41) — semantically odd for "Today" KPI.
- `pos` parameter in `kpi` snippet controls green/red trend badges, but no KPI uses it. Dead feature.
- `mini` snippet `bg-ink-50/70` background is nearly invisible against white Card. Contrast too low.
- `recentStudents` DataTable uses `(r: any)` typing — acceptable given Svelte 5's generic limitation.
- `&rarr;` entities in snippet links should be `→` or SVG icon for consistency.

---

## Questions to Consider

1. What is the **single most important action** a school admin takes on this dashboard? If it's "check if today's sessions are covered," the design should make that unmistakable — not one of five equal-weight sections.
2. Can the mini-stats grid be eliminated entirely by enriching the KPI cards with a secondary line or sparkline?
3. Should the `activity` feed differentiate between routine events (attendance logged) and action-requiring events (parent payment pending, teacher absent)?

---

## Run Notes

- **Target slug:** `src-routes-app-admin-remedial-reclass-page-svelte`
- **Ignore list:** None (no `.impeccable/critique/ignore.md` found)
- **Assessment independence:** Dual-agent (A: design review, B: CLI detector) — isolated, no cross-contamination
- **CLI detector:** 0 issues in target, 1 warning in out-of-scope AppShell.svelte
- **Browser visualization:** Not available (no browser automation in this session)
- **Overlay injection:** Skipped (no browser)
- **Live server:** Not started (no browser)
- **Temp file cleanup:** N/A
