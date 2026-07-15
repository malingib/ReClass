# ReClass — Design System (design.md)

**Philosophy:** Calm, trustworthy, Kenya-first. Education software must feel safe and legible to teachers, parents, and bursars — not flashy. Density where pros need it (tables, reports), warmth where parents land (portal). Accessible by default (WCAG 2.1 AA). Bilingual (EN/SW). Mobile-first because most parents arrive by phone.

**Reference synthesis:** Flowbite Admin Dashboard is the structural reference for a clear desktop application shell, compact top-level utilities, data tables, and focused operational hierarchy. Preskool is the domain reference for school-centred navigation, academic-year context, action-led school dashboards, and task-specific cards. ReClass takes the strengths of both without copying their assets, layout code, or branding: the result is a light neutral workspace, a white role-scoped sidebar, an emerald action color, and a responsive bottom navigation for mobile.

---

## 1. Design Tokens (Tailwind theme extension)
```js
// tailwind.config.ts
colors: {
  brand: { 50:'#ecfdf3', 500:'#12b76a', 600:'#039855', 700:'#027a48' },
  success:'#039855', warning:'#dc8b14', danger:'#d92d20', info:'#175cd3',
  ink: { 900:'#0f172a', 700:'#334155', 500:'#64748b', 300:'#cbd5e1', 100:'#f1f5f9', 50:'#f8fafc' },
}
fontFamily: { sans:['DM Sans','sans-serif'], mono:['DM Mono','monospace'], sw:['"Noto Sans"','DM Sans'] }
borderRadius: { sm:'6px', md:'10px', lg:'14px', xl:'20px' }
spacing: 8px base scale (1=4px … 4=16px … 8=32px)
shadow: { card:'0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.1)' }
```
Dark mode via `class` strategy; tokens swap ink tones.

## 2. Typography
- **Display/H1:** Inter 28/32 bold. **H2:** 22/28. **H3:** 18/24. **Body:** 14/20. **Small:** 12/16. **Table:** 13/18.
- Swahili: same scale, `font-sw`, slightly looser tracking.
- Numerals: tabular for money (`font-variant-numeric: tabular-nums`) — KES aligned.

## 3. Spacing & Grid
- 8px grid. Page max-width 1280 (admin), 480 (parent mobile-first). Content padding 16/24. Gap 12/16/24.
- Calendar grid uses 7-col week; timetable uses time-rows.

## 4. Components
- **Card:** white, radius 18, shadow-card, padding 16/20, header row (title + action). Avoid oversized rounded cards and glass effects on operational surfaces.
- **Button:** primary (brand-600, hover 700), secondary (white/ink-300 border), ghost, danger. Sizes sm/md/lg. Loading spinner. Disabled 50% opacity. Touch ≥44px. Default radius is 10 rather than pill-shaped.
- **Form field:** label (12/ink-700), input radius 10, focus ring brand-500 2px, error text danger 12px, hint ink-500.
- **Table:** sticky header where the page scrolls, zebra rows, sort chevrons, row-hover, density toggle (comfortable/compact), pagination footer. The table wrapper uses a 14-18px radius and a quiet border, not a heavy floating panel.
- **Modal:** center, backdrop blur, radius 14, focus-trap, ESC close, footer actions.
- **Toast:** top-right stack; success/info/danger; auto-dismiss 4s; action link.
- **Empty state:** icon + title + CTA (e.g. "No remedial groups yet — Create one").
- **Loading:** skeletons (shimmer) not spinners for lists; optimistic attendance save.
- **Error:** inline field errors + page-level 500 with "Retry" + support link.
- **Calendar:** month grid, session chips color-coded by subject, click → drawer with roster.

## 5. Charts (reports)
- Line (attendance trend), Bar (revenue by term), Donut (payment status), Stacked (teacher workload). Library: Recharts (light, accessible). Tooltips keyboard-navigable; alt-text summaries for screen readers.

## 6. Icons & Illustration
- Icon set: Lucide (consistent stroke 1.75). Illustration: rare, only onboarding/empty states; friendly flat, school motif (books, clock, phone). Avoid clip-art.

## 7. Color & Meaning
- status: paid=green, partial=amber, unpaid=red, locked=slate. present=green, late=amber, absent=red, excused=slate. Never convey status by color alone — pair with icon/text (a11y).

## 8. Animations & Microinteractions
- Page transitions 150ms ease; modal scale+fade 120ms; toast slide; respect `prefers-reduced-motion`. Button press scale .98. Attendance mark → check pop.

## 9. Responsive Rules
- ≥1024 sidebar + content. 640–1024 collapsed sidebar (icons). <640 bottom tab nav (role-scoped), single column, FAB for "mark attendance."

## 10. Brand Voice
- Clear, warm, plain. Teacher copy: "Mark all present, then adjust." Parent SMS: "Malingi HS: Your child was absent from Math remedial today. Reply STOP to opt out." No jargon, no ALL CAPS.

## 11. Accessibility (non-negotiable)
- All interactive elements keyboard reachable; visible focus ring; ARIA labels on icon buttons; 4.5:1 contrast min; forms associated labels; tables have scope; dark mode retains contrast; language toggle persists.

## 12. Tailwind Guidelines for Devs
- Use tokens only (no raw hex in components). Compose with `flex gap-4`, `grid`, `p-4`. Prefer `components/ui/*` over ad-hoc. Mobile-first utilities; `sm:/md:/lg:` only to enhance. Keep bundle lean (purge on).

## 13. Notification UX Enhancements (2026-07)
- Primary users: teachers, admins, and parents. Notifications should feel like a calm inbox first, with high-priority items able to surface as toast-style prompts when action is urgent.
- Inbox behavior: open from a persistent bell, show unread count, support quick actions such as “mark all read”, and surface loading/error states without empty-screen confusion.
- Mobile-first behavior: keep notifications reachable on mobile web with a full-width sheet that fits the thumb and preserves focus and keyboard support.
- Accessibility: every bell and notification item must be keyboard reachable, support Escape to close, and announce unread updates for screen readers.
- Content: use plain-language subject lines, relative timestamps, and clear priority hints so users instantly understand what needs attention.

---

## 14. Dashboard Reference (2026-07)

**Sources:** Flowbite Admin Dashboard and Preskool Admin Dashboard.

This is an implementation reference for information hierarchy and interface rhythm. It does not replace the ReClass design system above: retain Kenya-first language, ReClass emerald brand colors, role-specific workflows, WCAG 2.1 AA requirements, and mobile-first behavior.

### Reference characteristics
- A contained, spacious dashboard surface with a compact top bar, role-scoped navigation, utility controls, notification access, and account access.
- A first-screen composition led by one decisive operational metric, then a two-column rhythm of primary insight and active work. Supporting cards remain compact, nested, and clearly grouped.
- Moderate-radius cards, quiet borders, pale surfaces, restrained shadows, compact controls, and concise status badges. Use ReClass token values rather than copying external raw hex values.
- Metric emphasis uses a clear label, large tabular number, short explanatory copy, and a scoped period control. Charts should communicate attendance, fees, enrollment, or workload rather than generic marketing performance.
- The right rail is reserved for active work, alerts, or recent activity. It is supplementary on desktop and becomes stacked content on smaller screens.

### Motion and responsiveness
- Use masked or upward entrance reveals only as a supporting cue. Keep motion below 450ms, stagger related panels subtly, and fully disable non-essential movement for `prefers-reduced-motion`.
- Preserve the reference's dense desktop composition at wide widths. At tablet width, reduce the secondary rail first; below 640px, stack panels in task order and retain 44px minimum touch targets.

### Guardrails
- Do not introduce black or slate outer chrome in place of the ReClass canvas, and do not change school status meanings to match the reference palette.
- Do not convert role dashboards into generic analytics pages. Teacher, parent, bursar, principal, admin, and platform tasks stay domain-led.
- Preserve existing semantic markup, keyboard behavior, visible focus states, text alternatives, and plain-language copy.
