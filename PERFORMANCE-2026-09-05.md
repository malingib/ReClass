# Performance Engineering Baseline and Budgets

## Targets
- TTFB: <300ms warm, investigate >800ms
- FCP: <1.8s on representative mobile
- LCP: <2.5s
- INP: <200ms
- CLS: <0.1

## Rules
1. Keep authentication and tenant resolution on the critical path; defer everything else.
2. Dashboard data must be fetched in parallel when dependencies allow.
3. Never load charts, reports or large tables before they are needed.
4. Select only required database columns and paginate operational lists.
5. Treat slow queries and server waterfalls as defects.
6. Use route-level code splitting and dynamic imports for heavy optional UI.
7. Measure production latency with structured timing, not in-memory counters.

## Release budget
Any new route that materially increases initial JS, adds blocking third-party scripts, or introduces sequential independent queries requires justification and measurement.
