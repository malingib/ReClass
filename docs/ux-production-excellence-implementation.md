# UX Production Excellence — Implementation Contract

## Capability-driven UI/UX

The application UI is derived from the authenticated user's base role, committee assignments, responsibilities, and additive rights. UI visibility is not a security boundary; every mutation remains server-side/RLS protected.

### Layers
1. Base role — Teacher, Bursar, Principal, Admin, etc.
2. Committee assignment — an existing ReClass committee role assigned by Admin to a staff/teacher account.
3. Responsibilities — business areas the assignee is responsible for.
4. Rights — specific actions allowed inside those responsibilities.
5. Derived UI — navigation, dashboard cards, queues, filters and actions are rendered only when relevant.

### Teacher baseline
Dashboard, Today, My Classes, My Attendance, My ReClass (when assigned), My Payments, My Receipts and Notifications.

### Dynamic teacher UX
- Attendance approver responsibility exposes an attendance approval queue and review actions.
- ReClass committee responsibility exposes committee workspace and assigned tasks.
- Payroll responsibility exposes only the payroll workspace/actions granted.
- Payment initiator exposes the approved-payment initiation queue.
- Payment approver exposes the payment approval queue.
- No teacher can approve their own attendance/payment where separation-of-duties rules prohibit it.

## Teacher attendance
Only two attendance statuses exist: `attended` and `absent`.
Attendance is marked by the teacher and approved by an authorized ReClass committee member with the attendance-approval right. Approval state is separate: `pending`, `approved`, `rejected`.

## Student communication
This is a high-school system. Students are never communication recipients. Student-list messaging resolves linked parents/guardians. Teachers are direct recipients in the teacher workspace.

### Communication composer
Shared by Students and Teachers. Supports:
- filter-selected audience
- template selection or custom message
- validated tags/variables
- one-real-recipient preview
- recipient/message count
- SMS, email and in-app channels according to recipient availability
- audit trail and delivery status

Student-list sending is one message per selected student. If a parent has multiple selected children, that parent receives a separate personalized message for each selected student.

## ReClass finance
There is exactly one student-side ReClass obligation: the ReClass/remedial fee. It is separate from teacher compensation.

## Teacher payments
Teacher payment definitions are flexible and independent of the student ReClass obligation. They support teaching payments, allowances, committee-member payments, role-based payments, session payments, special assignments, one-off payments and other configured items. Committee compensation is a separate payroll line from ReClass teaching compensation.

## Payroll and payments
Weekly payroll is a consolidated payroll sheet. Individual teacher payments produce individual receipts. Payroll and receipts are separate documents.

Workflow:
1. Payroll committee member prepares/submits payroll.
2. Principal approves payroll.
3. Payment initiator initiates approved payment.
4. Separate payment approver approves payment.
5. System automatically notifies the teacher when payment is approved/paid according to the payment event.
6. Teacher confirms receipt only after actually receiving funds.

Teacher confirmation belongs to the individual payment/receipt and never automatically marks receipt merely because payment was approved.

## Receipts
One successful payment produces one receipt. Student/parent payments, ReClass payments and teacher payroll payments use the same receipt concept while remaining separate from invoices, obligations, payroll sheets and payment batches.

## Audit
Every auditable action records WHO, WHAT, affected record, WHEN, WHY where applicable, previous/new values where applicable, source, result and relevant approval context. Automated events identify the system plus the human/system event that triggered them.

## Notifications
A shared event/template/delivery service handles payroll, payment, attendance, ReClass and administrative notifications. Templates are versioned and auditable. Delivery states include queued/sent/delivered/failed with retry support.

## Analytics and reports
Analytics are actual-data dashboards, not download-only pages. Use transactional data for KPIs and charts, with date filters, trends, drill-downs and meaningful empty states. Exports/printing are secondary actions.

## Student workspace
Student list supports combined filters such as balance status, class/stream, ReClass status and lifecycle status; individual and bulk actions are permission-aware. Bulk actions include parent messaging and other authorized operational actions. Destructive actions require explicit confirmation.

## Design principle
`User → Base Role → Committee Assignment → Responsibilities → Rights → Derived Navigation/Dashboard/Actions`, with server-side authorization independently enforcing every operation.
