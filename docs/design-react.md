# eShule React — Design System (Vite + Tailwind 4)

> Scope: `apps/web-react`. Stack: React + Vite, Tailwind CSS 4 (`src/index.css`),
> Lucide-react icons, Recharts, Sonner toasts. Parent doc: `docs/design.md`
> (calm / trustworthy, 44px targets, tabular KES numerals, 8px rhythm, shell with
> role sidebar + topbar, role/task-led surfaces). ReClass is a product module
> inside eShule, never the global identity.

Component/page map uses real paths: `src/components/ui.tsx`, `AppShell.tsx`,
`layout/app-sidebar.tsx`, `layout/authenticated-layout.tsx`, `DataTable.tsx`,
`KpiCard.tsx`, `TrendChart.tsx`, `SmsComposer.tsx`, `NotificationBell.tsx`,
`ReceiptModal.tsx`, `PayrollPanel.tsx`, `FeeManager.tsx`, `ConfirmDelete.tsx`,
`ErrorBoundary.tsx`; pages `admin/Dashboard.tsx`, `finance/Finance.tsx`,
`reclass/Reclass.tsx` + `CommitteeManagement.tsx`, `parent/Parent.tsx`,
`teacher/Teacher.tsx`, `comms/Comms.tsx`, `misc/Misc.tsx`, `Login.tsx`;
shell IA in `src/App.tsx`, nav in `layout/nav-data.ts`.

---

## 1. Philosophy + brand voice (Kenya-first plain English)

1. **Calm operations, not analytics theatre.** Every role dashboard answers:
   _What matters now? What do I do? What evidence do I review?_ (`admin/Dashboard.tsx`,
   `misc/Misc.tsx` follow this; keep it).
2. **Role → responsibility → task → action → evidence.** Never render an action
   the server would reject. Nav (`nav-data.ts` + `filterNavByRole`) is a hint;
   `ProtectedRoute` + `PERMISSIONS.*` in `App.tsx` are authoritative.
3. **Kenya-first plain English.** Short sentences. KES amounts, `en-KE` dates,
   East Africa Time unless tenant config says otherwise. Example voice:
   "Balance: KES 2,500. Pay with M-Pesa." — not "Outstanding receivables exposure".
4. **Do / Don't copy.**
   - Do: quiet borders, one accent per row, text + icon + label for status.
   - Don't: gradients (banned — flat surfaces only), external brand assets,
     generic dashboard wallpaper charts.
5. **Module framing.** Headers say "ReClass operations" as eyebrow, eShule as
   product (`Reclass.tsx#PageHeading`). About page (`misc/Misc.tsx#About`)
   states ReClass is the remedial module.

## 2. Design tokens (`src/index.css`)

Tailwind 4 theme via `@theme inline`. **Always use token classes**
(`bg-primary`, `text-muted-foreground`, `border-border` …). No one-off hex.

| Token family | Light (`oklch`) | Usage |
|---|---|---|
| `background` / `foreground` | `0.98 0.008 245` / `0.22 0.035 255` | App canvas + body text |
| `card` / `popover` | white / ink | `Card`, dialogs, popovers |
| `primary` / `primary-fg` | indigo `0.49 0.22 275` | Actions, active nav, KPI rail |
| `secondary` | teal `0.94 0.045 178` | Operational highlight chips |
| `muted` / `muted-fg` | `0.955…` / `0.49…` | Skeletons, helper text, table heads |
| `accent` amber | `0.95 0.075 88` | Attention hover (`hover:bg-accent`), fee follow-up |
| `destructive` red | `0.58 0.22 25` | Danger, failed sync, form errors |
| `success` emerald | `0.62 0.18 158` | Paid / approved / synced |
| `warning` amber | `0.78 0.17 82` | Partial / pending / unmatched |
| `info` blue | `0.62 0.16 220` | Neutral notices |
| `sidebar*` | own bg/fg/accent/border | `app-sidebar.tsx` only |

> **Action-color note:** `docs/design.md` specifies emerald action language;
> current `--primary` is indigo and `--success` is emerald. Treat `bg-primary`
> as _the_ action token today; new positive-action affordances should prefer
> `success`/emerald accents so a future primary→emerald swap is one token edit.

- **KES tabular numerals.** Money always `tabular-nums` + `en-KE` grouping:
  `KES 2,500.00` (`Parent.tsx#money`), ledger `KES {n.toLocaleString()}`
  (`Finance.tsx`, `Reclass.tsx#money`). Never proportional figures in tables/KPIs.
- **Spacing (8px rhythm).** Page stacks `space-y-4/6`, card padding `p-5`/`p-4`,
  table cells `px-4 py-3`, grids `gap-3/4`. Base unit 4px (`--spacing` default);
  compose to multiples of 8.
- **Radii.** `--radius: 0.5rem`; `rounded-md` cards/buttons/inputs,
  `rounded-full` only for `Badge` pills, `rounded-xl` for `DataTable` shells.
- **Shadows.** Restrained: flat `border` by default; `shadow-sm` max for
  popovers/dialogs. No colored or large shadows.
- **Typography.** System stack via Tailwind default; tight tracking on headings.
  H1 28–32 (`text-2xl` page titles), H2 22–24, H3 18–20 (`CardTitle` is
  `text-sm` semibold by design — card titles are _not_ page headings),
  body 14–16 (`text-sm` default), support 12–14 (`text-xs` helpers, `text-[11px]`
  nav group labels only).

## 3. Grid + app shell

- **Desktop ops (≤1280–1440px).** `AuthenticatedLayout` centers
  `max-w-[1440px] p-4 md:p-6 lg:p-8` on a `bg-muted/35` canvas. Treat 1280px as
  the content comfort width; 1440px is the hard cap already in code.
- **Sidebar per role** (`app-sidebar.tsx` + `nav-data.ts`). Groups: General /
  Operations / ReClass / System; collapsible `w-64 ↔ w-[3.5rem]`; active item
  `bg-sidebar-accent` + `border-primary` rail on children. Footer: theme toggle,
  Alerts link, role `switchRole` select (multi-role only), logout. Legacy
  `AppShell.tsx` top-nav is deprecated — do not extend it.
- **Topbar** (`Header` in `app-sidebar.tsx`). `sticky h-14`, mobile nav button,
  page `title`, right cluster: `NotificationBell` + theme toggle. Keep utilities
  compact; page H1 lives in content, not the bar.
- **Parent mobile (360px single column).** `ParentDashboard` stacks 3 stat cards
  → one ledger table (horizontal scroll inside `DataTable`, never page scroll);
  `ParentPay` is `max-w-lg` single column with full-width STK button.
  Thumb-reachable primary action; critical warnings never hidden at narrow widths.

## 4. Component library specs

**Buttons** (`ui.tsx#Button`, `LoadingButton`). Variants: `default` primary
action · `secondary` alternate · `outline` pagination/filters · `ghost` row
utilities · `destructive` delete (always behind `ConfirmDelete`) · `link`
inline. Sizes: `sm h-8` dense tables, `default h-9`, `lg h-10` parent Pay Now /
login. Rules: one primary per view; `LoadingButton` shows "Please wait…"
and disables; min 44px (`min-h-11`) on parent/teacher primaries.

**Forms (RHF + Zod target).** Current code uses controlled state + native
validation (`FeeManager`, `ParentPay`, `SmsComposer`, `Login`). New forms must
use react-hook-form + Zod (both in `package.json`) with: visible `<label>`,
`h-9+` `Input`, hint/error slot, `focus-visible:ring-2 ring-ring`, inline
`text-destructive` errors (see `Login#error`). Reason-required dialogs
(committee approve, payroll approve, waivers) need a mandatory reason field —
extend `ConfirmDelete`'s two-step pattern, don't `window.confirm`.

**Tables** (`DataTable.tsx`). Sticky-header-ready `overflow-x-auto` shell,
`bg-muted/50` head row, `px-4 py-3` rows, keyset-or-offset pagination bar
(`Reclass.tsx#Attendance`: Previous/Next + "Page n · total"), always an
`empty` string prop ("No … found." + next legitimate action in the caller).
Filters sit above the table as `outline` chips/inputs. Screen-reader: real
`<table>`, header `text-xs font-medium`, never color-only status cells.

**Cards / KPI** (`ui.tsx#Card`, `KpiCard.tsx`). `rounded-md border bg-card`;
header `p-5 pb-3`, content `p-5 pt-0`. `KpiCard`: left `w-1 bg-primary` rail,
uppercase `text-xs` label, `text-2xl tabular-nums` value, icon in
`bg-primary/10` tile, `trend` helper line. Used by `admin/Dashboard`,
`ReclassDashboard`, `ParentDashboard`, `Misc` dashboards.

**Charts (Recharts)** (`TrendChart.tsx`). `ResponsiveContainer` fixed `220px`;
`line` for attendance/payments trends, `bar` for volume. Palette: `primary`
series + `muted-foreground` secondary only; `fontSize 11`, no axis lines,
`Tooltip` default. No pie/3D; dashboard charts support evidence, never replace it.

**Calendar.** Timetable (`Parent.tsx#Timetable`, `/admin/scheduling`) is a
`DataTable` of session occurrences today; full calendar stays in
`admin/Tables.tsx#Calendar`. Occurrence rows show date · time · class · room · status.

**Dialogs.** `ReceiptModal` (print view) and `ConfirmDelete` (inline two-step)
are the patterns. Dialog bar: focus trap + Escape + labelled Confirm/Cancel;
destructive confirm is `destructive` variant. Payroll/committee approvals add a
reason input before Confirm.

**Toasts + inbox (Sonner).** Sonner (`^1.5.0`) for transient confirmations
("STK push sent", "Queued for delivery"); persistent state lives in
`NotificationInbox` (`comms/Comms.tsx`) reached via `NotificationBell` header
bell with unread count. Never toast the only copy of a failure — pair with
inline `role="status"` text as `teacher/Teacher.tsx#MarkAttendance` does.

**Receipts print** (`ReceiptModal.tsx`, `finance/Finance.tsx#Receipts`). Modal
`max-w-md`, definition list of ≤12 fields, `window.print()` + Close. Print CSS
must isolate the receipt (white card, ink text, KES tabular) on paper.

## 5. Page templates per role (`App.tsx` IA)

| Route(s) | Template | Spec |
|---|---|---|
| `/admin`, `/admin/analytics` → `admin/Dashboard.tsx` | Admin overview | Eyebrow + H1 + 30-day lede; 4 `KpiCard`s; attendance `line` + recent-payments card; payments `bar`. Skeleton blocks while loading; `text-destructive` card on error. |
| `/principal*` → `misc/Misc.tsx` | Principal Command | Read-only oversight: 3 KPIs (students / collected / attendance %), alerts, school-wide trends. No operational buttons; links route to owner pages. |
| `/finance`, `/admin/fees`, `/finance/payroll`, `/finance/receipts`, `/admin/payments/unmatched`, `/finance/reports` → `finance/Finance.tsx` | Bursar Finance | Summary strip (invoiced · paid · outstanding) → ledger `DataTable` → `FeeManager` CRUD → `PayrollPanel` generate/approve/mark-paid → `Receipts` + `ReceiptModal` → CSV report buttons. Finance owns money movement; never committee ops. |
| `/teacher`, `/teacher/attendance` → `teacher/Teacher.tsx` | Teacher queue (2-tap mark) | Workspace: identity line → upcoming sessions list. Mark view: session `<select>` + Attended/Absent buttons (tap 1 select, tap 2 confirm) + `role=status` receipt line. `already_approved` is informational, not an error. |
| `/parent*` → `parent/Parent.tsx` | Parent ledger + Pay Now | 3 stat cards (outstanding / obligations / completed) → obligations ledger → `ParentPay` (obligation select pre-fills balance, phone + amount clamped to balance, STK push) → payments history with receipt numbers. Single column ≤480px. |
| `/reclass`, `/admin/attendance`, `/admin/fee`, `/admin/parent-payments`, `/admin/payroll`, `/admin/committee`, `/admin/reclass*`, `/admin/scheduling` → `reclass/Reclass.tsx`, `CommitteeManagement.tsx` | Committee approve | `PageHeading` (eyebrow "ReClass operations") → KPI row → register `DataTable` with paginator → focus card (attendance vs fee follow-up). Attendance review, payroll prep, payout auth stay separate surfaces; server rights decide visibility. |
| `/super-admin*` → `misc/Misc.tsx` | Super Admin | Tenants + Modules tables only. Tenant-scoped data never renders here. |
| `/comms`, `/admin/communications*`, `/admin/notifications*`, `/notifications` → `comms/Comms.tsx` | Comms | `SmsComposer` (trigger template + `254…` recipients + read-only preview except custom, balance check) → recent queue table → full `NotificationInbox`. |
| `/login` → `Login.tsx` | Auth | Centered `max-w-sm` card, E tile, email + password `Input`s, inline error, full-width submit; post-login routes via `roleHome`. |

## 6. States

- **Empty.** `DataTable#empty` copy + caller CTA when permitted: "No payments
  yet." / "No assigned sessions found." / "No ReClass obligations found."
  Never offer forbidden actions (parent never sees committee approve).
- **Loading.** Skeletons for dashboards (`admin/Dashboard` pulse cards),
  `Skeleton` in `ui.tsx`, muted "Loading…" lines in registers. Keep layout
  stable; no spinner-only pages.
- **Error.** `ErrorBoundary` per route (`App.tsx` root) renders
  "Something went wrong." Inline fetch errors are `text-destructive` cards with
  recovery text ("Unable to load …"), never DB/provider internals.
- **Offline / pending vs synced.** SMS queue (`SmsComposer` "Queued for
  delivery"), payroll runs (`paid` vs pending count in `PayrollPanel`),
  parent payments (`completed` vs pending in `Parent.tsx`), notifications
  (`queued` unread in `NotificationBell`) all pair status text + icon + token
  (`warning` pending, `success` synced, `destructive` failed) — never color alone.

## 7. Responsive + dark mode + reduced motion

- **Breakpoints.** Mobile-first: `grid gap-3 sm:grid-cols-2 lg:grid-cols-4`
  KPIs; `lg:grid-cols-[1.6fr_1fr]` ops splits; `DataTable` scrolls internally.
  Test at 360px (parent), 768px (teacher tablet), 1280px (ops).
- **Dark mode.** `.dark` token set in `index.css` (`@custom-variant dark`);
  toggle in sidebar footer + header (`app-sidebar.tsx`). All surfaces must use
  tokens so dark resolves automatically; check receipt print stays legible.
- **Reduced motion.** `transition-colors duration-200` sidebar/nav only;
  `animate-pulse` skeletons must respect `prefers-reduced-motion`
  (`motion-safe:animate-pulse`); charts render statically without animation when
  reduced motion is requested.

## 8. Accessibility (WCAG 2.1 AA)

- Focus always visible: `focus-visible:ring-2 ring-ring` on buttons/inputs/links
  (baked into `ui.tsx`); dialogs move + trap focus, Escape closes.
- Labels: every input/select/textarea has a visible or `aria-label` label
  (role switcher, recipients, obligation select all comply — keep it).
- Targets ≥44px on primaries, nav rows (`py-2` + text height), icon buttons get
  `p-2` hit area with `title`/`aria-label` (`Header`, `SidebarFooter`).
- Screen readers: semantic H1-per-page, landmarks (`header`/`nav`/`main`),
  `role="status"` for mutation receipts, table headers + status text
  ("Paid", "Pending", "Failed") alongside dots/badges.
- Contrast: `muted-foreground` on `card`/`background` must hold 4.5:1; status
  pairs (`success-fg`, `warning-fg`, `destructive`) are the approved text colors.
- Reflow to 320px without 2-D scroll outside tables; test full flows by keyboard.

## 9. Microinteractions / animation

- Nav hover `hover:bg-sidebar-accent`, chevron `rotate-90` on expand,
  sidebar `transition-[width]`, row `hover:bg-muted/30` — 150–200ms, no bounce.
- Buttons: `transition-colors` to `/90` fills; `LoadingButton` swaps to
  "Please wait…" (no layout shift); `ConfirmDelete` expands inline Confirm/Cancel.
- Toasts slide/fade via Sonner defaults; charts mount without looping animation.
- All motion disabled under `prefers-reduced-motion` except opacity fades.

## 10. Tailwind guidelines (tokens only)

1. Use token utilities: `bg-card text-card-foreground border-border`,
   `bg-primary text-primary-foreground`, `text-muted-foreground`,
   `bg-muted/35`, `text-success-foreground` — never raw hex/`oklch()` in tsx.
2. New colors = new `--color-*` token in `index.css` `@theme inline` + dark value.
3. Spacing scale only (`p-2/3/4/5/6/8`, `gap-2/3/4`, `space-y-4/6`); radii
   `rounded-md` / `rounded-full` (badges); borders `border` + `border-sidebar-border`.
4. State: `hover:bg-accent`, `focus-visible:ring-2`, `disabled:opacity-50`
   come from `buttonVariants` — extend the CVA map, don't hand-roll.
5. Icons: Lucide only (`size-4` inline, `size-3` chevrons), `title` on icon-only
   buttons; charts: Recharts only, two-series max, primary + muted palette.
6. Reuse before inventing: `Button/LoadingButton/Card/Input/Badge/Skeleton`,
   `DataTable`, `KpiCard`, `TrendChart`, `ConfirmDelete`, `ReceiptModal`,
   `PayrollPanel`, `FeeManager`, `SmsComposer`, `NotificationBell`,
   `ErrorBoundary`. Page-specific duplicates are a review blocker.

## Appendix A — component → file map

| Component | File | Used by |
|---|---|---|
| `Button`, `LoadingButton`, `Card*`, `Input`, `Badge`, `Skeleton` | `components/ui.tsx` | All pages |
| `AppSidebar`, `Header` | `components/layout/app-sidebar.tsx` | `layout/authenticated-layout.tsx` |
| `navGroups`, `filterNavByRole` | `components/layout/nav-data.ts` | `app-sidebar.tsx` |
| `DataTable` | `components/DataTable.tsx` | Finance, ReClass, Parent, Comms, Misc, SIS |
| `KpiCard` | `components/KpiCard.tsx` | `admin/Dashboard`, `reclass/Reclass`, `misc/Misc` |
| `TrendChart` | `components/TrendChart.tsx` | `admin/Dashboard` (attendance line, payments bar) |
| `SmsComposer` | `components/SmsComposer.tsx` | `comms/Comms.tsx#CommsOverview` |
| `NotificationBell` | `components/NotificationBell.tsx` | `app-sidebar.tsx#Header` |
| `ReceiptModal` | `components/ReceiptModal.tsx` | `finance/Finance.tsx#Receipts` |
| `PayrollPanel` | `components/PayrollPanel.tsx` | `Finance.tsx#SchoolPayroll/#RemedialPayroll` |
| `FeeManager` | `components/FeeManager.tsx` | `Finance.tsx#Fees/#PaymentDefinitions`, `Reclass.tsx#RemedialFees` |
| `ConfirmDelete` | `components/ConfirmDelete.tsx` | `FeeManager`, destructive actions |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | `App.tsx` root + route shells |
| `ProtectedRoute` | `components/ProtectedRoute.tsx` | Every `shell()` route in `App.tsx` |
| `PageHeading` | `reclass/Reclass.tsx` (local) | Promote to shared when a third page needs it |

## Appendix B — status language (text + icon + token, never color alone)

| State | Token | Example copy |
|---|---|---|
| Paid / approved / successful / synced / completed | `success` | "Paid · KES 2,500 · Receipt RC-001" |
| Partial / pending / queued | `warning` | "Pending review · 3 runs" |
| Unpaid / rejected / failed | `destructive` | "Payment failed: enter an amount…" |
| Locked / already approved | `muted` | "Already approved — no further action" |
| Info / neutral | `info` / `secondary` | "STK push sent. Complete the prompt on your phone." |
