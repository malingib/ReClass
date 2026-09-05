# eShule — Design System

> **Current-state design reference — 1 September 2026.** This document governs interface language, hierarchy, accessibility and interaction patterns. ReClass is presented as a product module within eShule, not as the global application identity.

## 1. Product experience

eShule should feel calm, trustworthy, legible and operational. Education software should not feel like a generic analytics dashboard. Dense tables and queues are appropriate for administrators; clear, task-led surfaces are appropriate for teachers and parents.

The interface should make responsibilities obvious:

```text
Role / assignment -> responsibility -> task -> action -> evidence
```

The design must never imply rights that the server does not grant.

## 2. Visual foundations

Use the existing Tailwind design tokens and shared UI components as the source of truth. Avoid introducing raw component-level colors or one-off styling systems.

- Neutral, high-contrast workspace surfaces.
- Emerald/green action language for positive school operations.
- Clear warning and danger states paired with text/icons.
- Moderate corner radii and restrained shadows.
- Tabular numerals for KES amounts and operational metrics.
- Consistent Lucide iconography.
- Minimum 44px touch targets on primary interactive controls.

Do not copy assets, branding or layout code from external design references.

## 3. Typography and layout

- H1: approximately 28–32px; H2: 22–24px; H3: 18–20px.
- Body: 14–16px with comfortable line height.
- Supporting text: 12–14px.
- Use an 8px spacing rhythm where practical.
- Desktop operational pages may use a maximum content width around 1280px.
- Parent and other mobile-first journeys should prioritize readable single-column layouts.

## 4. Application shell

Desktop:

- role-scoped sidebar;
- compact top utilities;
- notification access;
- account context;
- clear page title and task hierarchy.

Mobile:

- simplify navigation to the most important role tasks;
- use sheets/drawers where appropriate;
- keep primary actions reachable by thumb;
- never hide a critical permission or warning solely because the viewport is narrow.

Navigation is derived from rights, but route/server authorization remains authoritative.

## 5. Role-driven UX

### Teacher
Prioritize today's classes, attendance/delivery marking, timetable and assigned students. Do not show governance actions unless the teacher has the corresponding committee assignment/capability.

### Bursar
Prioritize school finance: receivables, payments, reconciliation, waivers and financial reporting. Do not present ReClass committee operations as Bursar responsibilities.

### Principal
Prioritize oversight, approvals, alerts and school-wide performance. Avoid implying that Principal oversight replaces operational ownership by Bursar, Payroll or ReClass.

### ReClass committee
Show governance queues only when the user's remedial assignment grants the relevant right. Separate attendance review from payroll preparation and payout authorization.

### Parent / Guardian
Prioritize linked children, attendance, balances, receipts, payment actions and important messages. Never expose another student's or tenant's data.

### School Admin
Provide broad operational administration according to granted rights, with clear separation between configuration, finance, payroll and programme workflows.

## 6. Components

### Cards
Use cards to group related information, not as decoration. Prefer quiet borders and moderate radii.

### Buttons
Primary, secondary, ghost and destructive variants should have predictable meaning. Loading and disabled states must be explicit.

### Forms
Every input needs a visible or programmatically associated label, useful hint/error text and an obvious focus state.

### Tables
Use sticky headers where useful, clear column labels, compact but readable rows, bounded pagination and explicit empty/error states.

### Dialogs
Dialogs require focus management, Escape support and clear confirmation/cancellation actions.

### Empty states
Explain what is missing and provide the next legitimate action. Never offer an action the current user cannot perform.

### Loading/error states
Prefer skeletons for data-heavy surfaces. Errors should explain recovery without exposing database/provider details.

## 7. Status language

Never communicate important state by color alone.

| State | Meaning |
|---|---|
| Paid / approved / successful | Completed and accepted |
| Partial / pending | Work or payment is incomplete |
| Unpaid / rejected / failed | Action or correction may be required |
| Locked | Further mutation is restricted |

Use text, icons and accessible status labels alongside visual treatment.

## 8. Notifications

Notifications are a shared service, not a domain-owned page.

- Persistent bell/inbox access.
- Clear unread state.
- Priority visible through text and semantics.
- Mobile-friendly sheet or page.
- Keyboard and screen-reader support.
- Explicit loading, empty and failure states.
- Delivery/retry state should be understandable to operators without exposing provider secrets.

## 9. Accessibility

Critical journeys target WCAG 2.1 AA:

- keyboard reachability;
- visible focus;
- semantic headings and landmarks;
- labels and descriptions for controls;
- sufficient contrast;
- screen-reader-friendly tables/statuses;
- reflow at narrow widths;
- reduced-motion support;
- no color-only state communication.

Accessibility testing should combine automated checks with keyboard and assistive-technology review.

## 10. Content and localization

Copy should be plain, direct and respectful. Avoid unnecessary technical jargon.

English is the primary interface language. Swahili can be introduced through the shared translation layer where coverage exists. Currency is KES and school-local dates/times should use East Africa Time unless the tenant configuration explicitly requires otherwise.

## 11. Dashboard principles

Every role dashboard should answer three questions quickly:

1. **What matters now?**
2. **What do I need to do?**
3. **What evidence or result should I review?**

Do not turn role dashboards into generic analytics pages. Metrics must map to the user's responsibilities and permitted actions.

## 12. Developer guardrails

- Reuse shared components before creating page-specific equivalents.
- Use design tokens rather than raw hex values in components.
- Keep mobile-first responsive utilities.
- Keep interaction state accessible and deterministic.
- Respect `prefers-reduced-motion`.
- Do not duplicate authorization logic in UI conditions.
- Do not expose actions merely because they are visually convenient.
- Update this document when a global design invariant changes.
