# eShule React — User Guide (Parent, Teacher, Principal)

> App: `apps/web-react` (React + Vite). ReClass is the remedial module inside eShule, not the whole school system.
> Language: plain Kenya-first English, kidogo Kiswahili where it helps. Money in KES, dates in `en-KE`, time in East Africa Time.
> What this app does **not** do (by product decision, see `ROADMAP.md`): screening, homework, assignments, markbook, LMS / online classes, library, clubs.

---

## 0. First time for everyone

1. Open your school's eShule link on your phone or computer.
2. Go to `/login`. Enter email + password. Tap **Log in** (full-width button).
3. The app sends you home by role: parent → `/parent`, teacher → `/teacher`, principal → `/principal`.
4. If you hold two roles (e.g. teacher + committee member), use the role switcher in the sidebar footer. Only roles you truly hold appear.
5. Forgot password? Ask your school admin to reset it. Do not share logins — every action is stamped with your name in the audit log.
6. Login page shows one clear error at a time ("wrong email or password"). Read it, fix it, try again — do not keep tapping blindly.

**What success looks like:** you land on your own dashboard, you see your name, and the sidebar shows only your work.

**Mobile tips:** works at 360 px wide. Tables scroll sideways *inside* the table, not the whole page. Buttons are at least 44 px tall on parent/teacher primary actions — use your thumb. Dark mode follows the toggle in the sidebar footer.

---

## Part A — Parent journey

Routes: `/parent` (dashboard + ledger), `/parent/pay` (Pay Now), `/parent/payments` (history + receipts), `/parent/timetable`, `/notifications` (messages). Source: `parent/Parent.tsx`, `comms/Comms.tsx#NotificationInbox`.

### A1. See what you owe (ledger)

1. Open `/parent`. Top shows 3 cards: **Outstanding** (KES total), **Linked obligations** (count), **Completed payments** (count).
2. Below is the obligations table: Student · Fee · Period · Amount · Paid · Balance · Status.
3. Read the Balance column. That is what you still need to pay. Status tells you more: `pending` = waiting, `completed` = done, `cancelled` = no longer charged.

**What success looks like:** "Balance: KES 2,500. Pay with M-Pesa." You know who, how much, and for which term.

### A2. Pay Now with M-Pesa STK (step by step)

1. Tap **Pay ReClass fees** → `/parent/pay`.
2. **Tap 1 — pick the obligation.** Open the Obligation dropdown. It lists only your own children's unpaid items, e.g. "Amina — Term 2 Remedial — KES 2,500 outstanding". Picking it fills the amount box with the full balance. You may lower it to pay part of the balance, but you cannot pay more than the balance.
3. **Tap 2 — phone.** Type your M-Pesa phone, e.g. `0712345678` or `254712345678`. This must be the phone that will approve the payment.
4. **Tap 3 — Send STK push.** Tap the big **Send STK push** button. It says "Please wait…" while sending. Tap once only.
5. **Tap 4 — PIN on your phone.** Within seconds Safaricom sends an STK prompt to that phone. Enter your **M-Pesa PIN** on the phone (never inside eShule) and accept.
6. Wait for the message in eShule: "STK push sent. Complete the prompt on your phone." That means the request left our side — it is not yet proof of payment.
7. Proof of payment = a **receipt number** (e.g. `RC-001`) appearing in `/parent/payments`, plus an SMS "Receipt RC-001 confirmed KES 2,500. Asante."

**What success looks like:** obligation Balance drops, a new row appears in My ReClass payments with Status `completed` + receipt number + date, and you get the SMS receipt.

### A3. Receipts and history

1. Open `/parent/payments`. Columns: Student · Amount · Status · Receipt · Date.
2. A dash (`—`) under Receipt means no receipt yet — payment is still pending or failed.
3. Tap the receipt number (bursar side: `/bursar/receipts` → View) to open the print view. Print uses a clean white card with KES figures.

### A4. Timetable (when is my child's class?)

1. Open `/parent/timetable`. You see session rows: Session · Scheduled · Status.
2. Check date + time + room. `cancelled` sessions will not run — do not send your child for those.
3. Full school calendar lives with the admin (`/admin/calendar`). If a time looks wrong, ask the class teacher, not the bursar.

### A5. Messages and results

- **Messages:** bell icon in the top bar → `/notifications` inbox. You see Body · Channel · Status · Date. Fee reminders look like: "eShule: Amina fee balance KES 2,500. Lipa kabla ya 30 Jun." Receipt SMS: "eShule: Receipt RC-001 confirmed KES 2,500. Asante."
- **Results / attendance flags:** absence alerts read "eShule: Amina attendance alert. Tafadhali wasiliana na shule." Call the school number in the message. eShule does not host homework, markbook, or report cards — results here mean payment receipts and attendance notices only.

### A6. STOP granularity (SMS opt-out, read carefully)

- Replying **STOP** stops **that category** of SMS only (e.g. announcements), on **that phone number** only.
- It does **not** stop payment receipts, STK prompts, or account-security messages. Those are transactional — the school must reach you about money.
- To stop a different category, reply STOP to a message from that category.
- To start again, ask the school admin or SMS line to re-subscribe your number. Do this per phone: if two parents use two numbers, each number opts in/out separately.
- Changing SIM? Tell the school office your new number, or you will miss STK prompts and receipts.

### A7. Parent errors — what to do

| You see | It means | Do this |
|---|---|---|
| "STK push sent. Complete the prompt…" but no prompt arrives | Phone off, wrong number, or network delay | Wait 2 min. Check the phone number you typed. Do not tap Send again yet — check `/parent/payments` first. If Status is `pending`, the request is alive; wait for it to finish or expire before retrying. |
| Payment row stuck on `pending` after you entered PIN | Safaricom has not confirmed yet (timeout / callback late) | Wait. Do not pay twice. Pending means "we are waiting for M-Pesa". If still pending after ~15 min, contact the bursar with phone + amount + time. They check the reconciliation queue (`/admin/payments/unmatched`). |
| `DUPLICATE_REQUEST` / "Payment failed: duplicate…" | You tapped twice, or a request is already running | Stop. Wait 2–5 min. Check history. The first request is still processing. Only retry after it shows `failed` or expires. |
| "Enter an amount greater than zero and no more than the outstanding balance." | Amount empty, zero, or above balance | Lower the amount to the balance or less. To pay in parts, send a smaller amount first. |
| "Select an outstanding obligation." | No obligation picked (or it is `cancelled`) | Pick an item from the dropdown. Cancelled items cannot be paid — ask the bursar why it was cancelled. |
| Amount or phone looks wrong / not your child | Data mismatch | Do not pay. Contact the bursar (money problem) or school admin (wrong child linked). Never edit someone else's obligation. |
| "Payment failed: …" with no receipt | Rejected before Safaricom | Read the message, fix phone/amount, try once. If it repeats, screenshot + time and send to the bursar. |

**Mobile tips:** keep your M-Pesa line on and unlocked when paying. The STK prompt times out fast — have your PIN ready. Use Safaricom line registered for M-Pesa; the prompt only goes to the number you typed. One tap on Send, then look at your phone, not the app.

### A8. Quick answers (FAQ)

- **Two children, one phone?** Yes. The Obligation dropdown lists each child separately. Pay one at a time so each gets its own receipt.
- **Pay for next term early?** Only if the obligation exists with a balance. You cannot pay a fee the school has not invoiced yet.
- **Wrong child linked to my login?** Do not pay. Ask school admin to fix the linkage, then check the ledger again.
- **Phone lost / number changed?** Tell the school office before paying. STK goes to the number you type, receipts go by SMS.
- **Need a printed receipt for the office?** Open `/parent/payments`, note the receipt number, ask the bursar to print it from `/bursar/receipts` → View.

---

## Part B — Teacher journey

Routes: `/teacher` (workspace), `/teacher/attendance` (2-tap mark), `/teacher/timetable`, `/teacher/classes`, `/teacher/tasks`, committee surfaces under `/teacher/committee*` if you also hold a committee role. Source: `teacher/Teacher.tsx`, `reclass/CommitteeManagement.tsx`.

### B1. Morning queue (what do I teach today?)

1. Open `/teacher`. Top shows your name + employee number (e.g. "Wanjiku N. · EMP-014").
2. **Upcoming assigned sessions** lists your next ~20 occurrences: class · date · start–end · room. Only sessions assigned to *you* appear.
3. Tap through to `/teacher/timetable` for the wider view, `/teacher/tasks` for ops reminders.

**What success looks like:** you know today's rooms and times before assembly. Empty state "No assigned sessions found." means nothing assigned — ask school admin, do not mark for another teacher.

### B2. 2-tap attendance mark (the core move)

1. Open `/teacher/attendance`.
2. **Tap 1 — select session.** Open the Session dropdown (your last ~30 non-cancelled occurrences, newest first). Pick today's session.
3. **Tap 2 — Attended or Absent.** Tap **Attended** (green path) or **Absent**. That is it — two taps.
4. Read the receipt line (`role="status"`): "Attendance recorded and sent for review." It stays on screen — that is your proof. Toasts fade; this line does not.
5. Special line: "This attendance is already approved." That is **information, not an error**. Approval already turned it into payroll evidence. No further action.

**What success looks like:** one row per session, status recorded, sent for committee review. Your payroll later depends on approved attendance — mark the same day, every day.

### B3. Correction window (you made a mistake — fix fast)

- Before committee approval, re-mark the same session: select it again, tap the correct button. Latest mark before approval is what reviewers see.
- After approval, the row locks. You cannot change it yourself. Ask the committee secretary/chair to correct it with a written reason — the correction is audited.
- Never mark attendance for a session you did not attend/teach, and never mark for another teacher. The call `mark_own_teacher_attendance` binds teacher + profile + occurrence; misuse is visible in audit.

### B4. Committee approve / reject with reason (only if you hold a committee role)

1. Open `/teacher/committee` (chair/secretary/member) or `/teacher/committee/payroll` (treasurer/finance). Server permissions decide what you see — nav is only a hint.
2. Open the attendance review table (Teacher · Status · Date).
3. **Approve:** confirm the teacher was present. **Reject:** you must write a reason (e.g. "Room B locked, session did not run — caretaker confirms"). Reason-required dialogs always ask before Confirm; `window.confirm` is not used.
4. Rejected rows go back to the teacher for correction. Approved rows become payroll evidence.

**What success looks like:** queue cleared within 48 hours, every reject carries a reason a stranger could understand next term.

### B5. Teacher errors

| You see | It means | Do this |
|---|---|---|
| "Select a session first." | You tapped Attended/Absent with empty dropdown | Pick the session first, then tap. |
| "This attendance is already approved." | Locked by committee | Stop. If it is wrong, escalate to secretary/chair with date + session + reason. |
| "Failed: …" after tapping | Network or rights problem | Check connection, reload, retry once. If it repeats, screenshot + session date and tell school admin. Do not invent a second row for another date. |
| Session missing from dropdown | Cancelled, unassigned, or outside the 30-row window | Check `/teacher` queue and timetable. If still missing, ask school admin to check assignment/room clash. |
| Committee page says "not allowed" | You do not hold that permission | You are not on committee for that action. Ask the chair — do not borrow someone's login. |

**Mobile tips:** mark from the classroom doorway on your phone — 2 taps, then pocket it. If signal is weak, wait for the receipt line before leaving. Test at 768 px tablet too; dropdown + two buttons fit without zoom.

---

## Part C — Principal journey (Command Center, read-only oversight)

Routes: `/principal` (oversight KPIs), `/principal/school`, `/principal/reports`, `/principal/effectiveness`. Source: `misc/Misc.tsx#PrincipalDashboard`, `finance/Finance.tsx#FinanceReports`.

Principals **oversee, not operate**. You have no operational buttons — links route you to the owner's page (bursar, committee, admin). That is deliberate: oversight stays clean.

### C1. Daily command check (5 minutes)

1. Open `/principal`. Read 3 KPIs: **Students**, **Collected (KES)**, **Attendance %** (30-day window).
2. Compare against yesterday in your head: collected going up? Attendance below 90%? Outstanding growing?
3. Open `/principal/reports` for CSV exports: `revenue`, `students`, `subjects`, `teacher-attendance`, `teachers`. Download and share in the staff meeting.

### C2. Approval queue SLA — 48 hours

1. Ask the chair/secretary: how many attendance rows are unactioned older than 48 h? (`/reclass` → register + paginator, `/admin/attendance`.)
2. Rule: **every attendance mark gets approved or rejected with reason within 48 hours.** Unreviewed rows block payroll evidence and hide absenteeism.
3. If the queue is stale, message the committee (Comms composer), do not approve rows yourself beyond your permission — your job is to enforce the SLA, not to click through.

**What success looks like:** zero rows older than 48 h without a decision + reason. "Already approved — no further action" on the rest.

### C3. Effectiveness (is ReClass working?)

1. Open `/principal/effectiveness` + `/admin/analytics` (same dashboard family): 4 KPIs (Students · Collected · Outstanding · Attendance), 14-day attendance trend (line), payments trend (bar), recent-payments card.
2. Ask three questions: attendance steady or dropping? Collected tracking invoiced? Which class/period has the worst outstanding?
3. Send findings to bursar (money) and chair (attendance). Follow up next week with the same charts.

### C4. Principal errors and limits

- "Unable to load the school dashboard." → data or network issue. Reload; if it persists, ask school admin / super admin — do not keep retrying exports.
- You cannot edit fees, approve payroll, or change roles. If you need it done, assign to bursar / treasurer / school admin and track the audit entry.
- Never request features outside scope in staff meetings as promises: no screening, no homework/assignments/markbook, no LMS, no library, no clubs. Those need an explicit product decision first.

**Mobile tips:** command KPIs read fine on a phone between classes. For trend charts and CSVs, use a laptop (1280 px comfort width). Print reports white-on-white; check receipt/KPI figures are tabular KES (`KES 2,500`, never squeezed).

---

## Appendix — All-roles error vocabulary (plain words)

| Screen words | Plain meaning | Who fixes it |
|---|---|---|
| STK push sent | Request left eShule, waiting on your phone + Safaricom | You (enter PIN) → bursar if stuck on `pending` |
| Pending / queued | Waiting — do not retry yet | Wait; bursar checks unmatched queue |
| Completed / Paid · Receipt RC-xxx | Money confirmed, receipt is proof | Keep the receipt number |
| Payment failed | Rejected before or by Safaricom | Fix input, retry once, then bursar |
| DUPLICATE_REQUEST | A request is already running | Wait 2–5 min, check history |
| Already approved | Locked, auditable | Committee corrects with reason |
| Unable to load … | Data/network error, never your fault wording | Reload once, then school admin |
| Not allowed / no permission | Server said no | Ask role owner; never share logins |

*Harambee ya shule: mark on time, pay on time, approve on time. Asante.*
