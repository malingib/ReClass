import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  ADMIN_ROLES, MEMBER_MANAGEMENT_ROLES, FINANCE_ROLES, COMPLIANCE_ROLES,
  REPORTS_ROLES, SETTINGS_ROLES, USER_MANAGEMENT_ROLES, TRANSACTION_VIEW_ROLES,
  TEACHER_ROLES, PARENT_ROLES, SUPER_ADMIN_ROLES,
} from '@/lib/rbac';
import { Stub } from '@/pages/Stub';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/admin/Dashboard';
import StudentDetails from '@/pages/admin/StudentDetails';
import Students from '@/pages/sis/Students';
import * as Tables from '@/pages/admin/Tables';
import * as Ops from '@/pages/admin/Ops';
import * as Finance from '@/pages/finance/Finance';
import * as Reclass from '@/pages/reclass/Reclass';
import * as Parent from '@/pages/parent/Parent';
import * as Teacher from '@/pages/teacher/Teacher';
import * as Comms from '@/pages/comms/Comms';
import * as Misc from '@/pages/misc/Misc';

function shell(roles: readonly string[], el: React.ReactNode) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      <AuthenticatedLayout>{el}</AuthenticatedLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<div className="p-8 text-sm opacity-70">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Navigate to="/login" replace />} />

            {/* Admin */}
            <Route path="/admin" element={shell(ADMIN_ROLES, <AdminDashboard />)} />
            <Route path="/admin/analytics" element={shell(REPORTS_ROLES, <AdminDashboard />)} />
            <Route path="/admin/admissions" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Admissions />)} />
            <Route path="/admin/admissions/new" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Admissions />)} />
            <Route path="/admin/enrollment" element={shell(MEMBER_MANAGEMENT_ROLES, <Stub title="Enrollment" />)} />
            <Route path="/admin/graduation" element={shell(MEMBER_MANAGEMENT_ROLES, <Stub title="Graduation" />)} />
            <Route path="/admin/retention" element={shell(MEMBER_MANAGEMENT_ROLES, <Stub title="Retention" />)} />
            <Route path="/admin/lessons" element={shell(MEMBER_MANAGEMENT_ROLES, <Stub title="Lessons" />)} />
            <Route path="/admin/modules" element={<Navigate to="/admin/settings" replace />} />
            <Route path="/admin/operations" element={shell(MEMBER_MANAGEMENT_ROLES, <Stub title="Operations" />)} />
            <Route path="/admin/operations/calendar" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Calendar />)} />
            <Route path="/admin/operations/discipline" element={shell(COMPLIANCE_ROLES, <Tables.Discipline />)} />
            <Route path="/admin/operations/lifecycle" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Lifecycle />)} />
            <Route path="/admin/operations/tasks" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Tasks />)} />
            <Route path="/admin/calendar" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Calendar />)} />
            <Route path="/admin/audit" element={shell(COMPLIANCE_ROLES, <Tables.Audit />)} />
            <Route path="/admin/reports" element={shell(REPORTS_ROLES, <Finance.FinanceReports />)} />
            <Route path="/admin/settings" element={shell(SETTINGS_ROLES, <Ops.SchoolSettings />)} />
            <Route path="/admin/users" element={shell(USER_MANAGEMENT_ROLES, <Ops.Users />)} />
            <Route path="/admin/students/:id" element={shell(MEMBER_MANAGEMENT_ROLES, <StudentDetails />)} />
            <Route path="/admin/payments/unmatched" element={shell(FINANCE_ROLES, <Finance.UnmatchedPayments />)} />

            {/* SIS */}
            <Route path="/admin/sis" element={shell(MEMBER_MANAGEMENT_ROLES, <Students />)} />
            <Route path="/admin/sis/classes" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Classes />)} />
            <Route path="/admin/sis/admissions" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Admissions />)} />
            <Route path="/admin/students" element={shell(MEMBER_MANAGEMENT_ROLES, <Students />)} />
            <Route path="/admin/students/import" element={shell(MEMBER_MANAGEMENT_ROLES, <Ops.StudentImport />)} />
            <Route path="/admin/subjects" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Subjects />)} />
            <Route path="/admin/teachers" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Teachers />)} />
            <Route path="/admin/parents" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Parents />)} />

            {/* Finance */}
            <Route path="/finance" element={shell(FINANCE_ROLES, <Finance.FinanceOverview />)} />
            <Route path="/admin/fees" element={shell(FINANCE_ROLES, <Finance.Fees />)} />
            <Route path="/admin/payment-definitions" element={shell(FINANCE_ROLES, <Finance.PaymentDefinitions />)} />
            <Route path="/finance/income" element={shell(FINANCE_ROLES, <Tables.Income />)} />
            <Route path="/finance/expenses" element={shell(FINANCE_ROLES, <Tables.Expenses />)} />
            <Route path="/finance/payroll" element={shell(FINANCE_ROLES, <Finance.SchoolPayroll />)} />
            <Route path="/finance/receipts" element={shell(FINANCE_ROLES, <Finance.Receipts />)} />
            <Route path="/finance/receipts/:id/print" element={shell(FINANCE_ROLES, <Finance.Receipts />)} />
            <Route path="/finance/reports" element={shell(REPORTS_ROLES, <Finance.FinanceReports />)} />
            <Route path="/receipts" element={shell(TRANSACTION_VIEW_ROLES, <Finance.Receipts />)} />

            {/* ReClass */}
            <Route path="/reclass" element={shell(ADMIN_ROLES, <Reclass.ReclassDashboard />)} />
            <Route path="/admin/attendance" element={shell(ADMIN_ROLES, <Reclass.Attendance />)} />
            <Route path="/admin/committee" element={shell(ADMIN_ROLES, <Reclass.Committee />)} />
            <Route path="/admin/fee" element={shell(FINANCE_ROLES, <Reclass.RemedialFees />)} />
            <Route path="/admin/remedial-fees" element={shell(FINANCE_ROLES, <Reclass.RemedialFees />)} />
            <Route path="/admin/parent-payments" element={shell(FINANCE_ROLES, <Reclass.ParentPayments />)} />
            <Route path="/admin/payroll" element={shell(FINANCE_ROLES, <Reclass.RemedialPayroll />)} />
            <Route path="/admin/reclass" element={shell(ADMIN_ROLES, <Reclass.ReclassDashboard />)} />
            <Route path="/admin/reclass/students" element={shell(ADMIN_ROLES, <Students />)} />
            <Route path="/admin/reclass/students/:id" element={shell(ADMIN_ROLES, <StudentDetails />)} />
            <Route path="/admin/remedial/receipts" element={shell(FINANCE_ROLES, <Reclass.ParentPayments />)} />
            <Route path="/admin/scheduling" element={shell(ADMIN_ROLES, <Tables.Calendar />)} />

            {/* Comms */}
            <Route path="/comms" element={shell(ADMIN_ROLES, <Comms.CommsOverview />)} />
            <Route path="/admin/communications" element={shell(ADMIN_ROLES, <Comms.CommsOverview />)} />
            <Route path="/admin/communications/announcements" element={shell(ADMIN_ROLES, <Comms.Announcements />)} />
            <Route path="/admin/communications/templates" element={shell(ADMIN_ROLES, <Comms.CommTemplates />)} />
            <Route path="/admin/notifications" element={shell(ADMIN_ROLES, <Comms.CommsOverview />)} />
            <Route path="/admin/notifications/templates" element={shell(ADMIN_ROLES, <Comms.CommTemplates />)} />
            <Route path="/notifications" element={shell([...ADMIN_ROLES, 'teacher', 'parent'], <Comms.NotificationInbox />)} />

            {/* Parent */}
            <Route path="/parent" element={shell(PARENT_ROLES, <Parent.ParentDashboard />)} />
            <Route path="/parent/child" element={shell(PARENT_ROLES, <Parent.ParentDashboard />)} />
            <Route path="/parent/fees" element={shell(PARENT_ROLES, <Parent.ParentDashboard />)} />
            <Route path="/parent/payments" element={shell(PARENT_ROLES, <Parent.ParentPayments />)} />
            <Route path="/parent/pay" element={shell(PARENT_ROLES, <Parent.ParentPay />)} />
            <Route path="/parent/timetable" element={shell(PARENT_ROLES, <Parent.Timetable who="parent" />)} />

            {/* Teacher */}
            <Route path="/teacher" element={shell(TEACHER_ROLES, <Teacher.TeacherDashboard />)} />
            <Route path="/teacher/classes" element={shell(TEACHER_ROLES, <Tables.Classes />)} />
            <Route path="/teacher/tasks" element={shell(TEACHER_ROLES, <Tables.Tasks />)} />
            <Route path="/teacher/timetable" element={shell(TEACHER_ROLES, <Parent.Timetable who="teacher" />)} />
            <Route path="/teacher/committee" element={shell(TEACHER_ROLES, <Reclass.Committee />)} />
            <Route path="/teacher/committee/payroll" element={shell(TEACHER_ROLES, <Reclass.RemedialPayroll />)} />
            <Route path="/teacher/attendance" element={shell(TEACHER_ROLES, <Teacher.MarkAttendance />)} />

            {/* Principal / Bursar / Payroll */}
            <Route path="/principal" element={shell(COMPLIANCE_ROLES, <Misc.PrincipalDashboard />)} />
            <Route path="/principal/school" element={shell(COMPLIANCE_ROLES, <Misc.SchoolOverview />)} />
            <Route path="/principal/reports" element={shell(REPORTS_ROLES, <Finance.FinanceReports />)} />
            <Route path="/principal/effectiveness" element={shell(COMPLIANCE_ROLES, <Misc.PrincipalDashboard />)} />
            <Route path="/bursar" element={shell(FINANCE_ROLES, <Misc.BursarDashboard />)} />
            <Route path="/bursar/receipts" element={shell(FINANCE_ROLES, <Finance.Receipts />)} />
            <Route path="/payroll" element={shell(FINANCE_ROLES, <Finance.SchoolPayroll />)} />

            {/* Super admin */}
            <Route path="/super-admin" element={shell(SUPER_ADMIN_ROLES, <Misc.SuperAdminDashboard />)} />
            <Route path="/super-admin/settings" element={shell(SUPER_ADMIN_ROLES, <Ops.SchoolSettings />)} />
            <Route path="/super-admin/audit" element={shell(SUPER_ADMIN_ROLES, <Tables.Audit />)} />

            {/* Misc */}
            <Route path="/about" element={shell([...ADMIN_ROLES, 'teacher', 'parent'], <Misc.About />)} />
            <Route path="/account" element={shell([...ADMIN_ROLES, 'teacher', 'parent'], <Misc.Account />)} />

            <Route path="*" element={<Stub title="Not found" />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}
