import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LegacyRedirect } from '@/components/LegacyRedirect';
import { ADMIN_ROLES, MEMBER_MANAGEMENT_ROLES, FINANCE_ROLES, COMPLIANCE_ROLES, REPORTS_ROLES, SETTINGS_ROLES, USER_MANAGEMENT_ROLES, TRANSACTION_VIEW_ROLES, TEACHER_ROLES, PARENT_ROLES, RECLASS_ROLES, RECLASS_FINANCE_ROLES, RECLASS_COMMITTEE_ROLES, SUPER_ADMIN_ROLES, PERMISSIONS, type Permission } from '@/lib/rbac';
import { Stub } from '@/pages/Stub';
import Login from '@/pages/Login';
import RoleHomeRedirect from '@/pages/RoleHomeRedirect';
import AdminDashboard from '@/pages/admin/Dashboard';
import { SchedulingCalendar } from '@/pages/admin/Scheduling';
import StudentDetails from '@/pages/admin/StudentDetails';
import Students from '@/pages/sis/Students';
import * as Tables from '@/pages/admin/Tables';
import * as Ops from '@/pages/admin/Ops';
import * as Finance from '@/pages/finance/Finance';
import * as Reclass from '@/pages/reclass/Reclass';
import CommitteeManagement from '@/pages/reclass/CommitteeManagement';
import * as Parent from '@/pages/parent/Parent';
import * as Teacher from '@/pages/teacher/Teacher';
import * as Misc from '@/pages/misc/Misc';
import * as Academics from '@/pages/academics/Classes';
import SubjectsPage from '@/pages/academics/Subjects';
import * as PeopleExtra from '@/pages/people/PeopleExtra';
import * as FeesExtra from '@/pages/finance/FeesExtra';
import * as Settings from '@/pages/settings/Settings';
import * as Reports from '@/pages/reports/Reports';
import * as HRM from '@/pages/hrm/HRM';

function shell(roles: readonly string[], el: React.ReactNode, permissions: readonly Permission[] = []) {
  return <ProtectedRoute allowedRoles={roles} requiredPermissions={permissions}><AuthenticatedLayout>{el}</AuthenticatedLayout></ProtectedRoute>;
}

export default function App() {
  return <ErrorBoundary><AuthProvider><Suspense fallback={<div className="p-8 text-sm opacity-70">Loading…</div>}><Routes>
    {/* ── Auth ── */}
    <Route path="/" element={<RoleHomeRedirect />} />
    <Route path="/login" element={<Login />} />

    {/* ── Admin Dashboard ── */}
    <Route path="/admin" element={shell(ADMIN_ROLES, <AdminDashboard />)} />
    <Route path="/admin/analytics" element={shell(REPORTS_ROLES, <AdminDashboard />)} />

    {/* ── People & Admission: Students ── */}
    <Route path="/admin/students" element={shell(MEMBER_MANAGEMENT_ROLES, <Students />)} />
    <Route path="/admin/students/:id" element={shell(MEMBER_MANAGEMENT_ROLES, <StudentDetails />)} />
    <Route path="/admin/students/import" element={shell(MEMBER_MANAGEMENT_ROLES, <Ops.StudentImport />)} />
    <Route path="/admin/sis/admissions" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Admissions />)} />
    <Route path="/admin/admissions" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Admissions />)} />
    <Route path="/admin/admissions/new" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Admissions />)} />
    <Route path="/admin/student-promotion" element={shell(MEMBER_MANAGEMENT_ROLES, <PeopleExtra.StudentPromotion />)} />
    <Route path="/admin/alumni" element={shell(MEMBER_MANAGEMENT_ROLES, <PeopleExtra.Alumni />)} />
    <Route path="/admin/student-documents" element={shell(MEMBER_MANAGEMENT_ROLES, <PeopleExtra.StudentDocuments />)} />

    {/* ── People & Admission: Teachers ── */}
    <Route path="/admin/teachers" element={shell(MEMBER_MANAGEMENT_ROLES, <Teacher.TeacherList />)} />
    <Route path="/admin/teachers/add" element={shell(MEMBER_MANAGEMENT_ROLES, <Teacher.AddTeacher />)} />
    <Route path="/admin/teachers/:id" element={shell(MEMBER_MANAGEMENT_ROLES, <Teacher.TeacherProfile />)} />
    <Route path="/admin/teachers/routine" element={shell(MEMBER_MANAGEMENT_ROLES, <Teacher.TeacherRoutine />)} />

    {/* ── People & Admission: Parents & Guardians ── */}
    <Route path="/admin/parents" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Parents />)} />

    {/* ── People & Admission: Staff ── */}
    <Route path="/admin/staff" element={shell(MEMBER_MANAGEMENT_ROLES, <PeopleExtra.StaffList />)} />
    <Route path="/admin/departments" element={shell(MEMBER_MANAGEMENT_ROLES, <PeopleExtra.Departments />)} />
    <Route path="/admin/designation" element={shell(MEMBER_MANAGEMENT_ROLES, <PeopleExtra.Designation />)} />

    {/* ── People & Admission: Users ── */}
    <Route path="/admin/users" element={shell(USER_MANAGEMENT_ROLES, <Ops.Users />)} />
    <Route path="/admin/roles-permission" element={shell(USER_MANAGEMENT_ROLES, <Ops.Users />)} />
    <Route path="/admin/delete-account" element={shell(USER_MANAGEMENT_ROLES, <PeopleExtra.DeleteAccountRequests />)} />

    {/* ── Academic: Classes ── */}
    <Route path="/admin/classes" element={shell(MEMBER_MANAGEMENT_ROLES, <Academics.default />)} />
    <Route path="/admin/academic-calendar" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Calendar />)} />

    {/* ── Academic: Subjects ── */}
    <Route path="/admin/subjects" element={shell(MEMBER_MANAGEMENT_ROLES, <SubjectsPage />)} />

    {/* ── HRM: Attendance — teacher attendance only (remedial + normal classes) ── */}
    <Route path="/admin/teacher-attendance" element={shell(TEACHER_ROLES, <HRM.TeacherAttendance />)} />

    {/* ── Finance: Fees ── */}
    <Route path="/finance" element={shell(FINANCE_ROLES, <Finance.FinanceOverview />)} />
    <Route path="/admin/fees" element={shell(FINANCE_ROLES, <Finance.Fees />)} />
    <Route path="/admin/fees/structure" element={shell(FINANCE_ROLES, <FeesExtra.FeeStructure />)} />
    <Route path="/admin/due-reports" element={shell(FINANCE_ROLES, <Finance.FinanceReports />)} />
    <Route path="/admin/payment-definitions" element={shell(FINANCE_ROLES, <Finance.PaymentDefinitions />)} />

    {/* ── Finance: Billing ── */}
    <Route path="/finance/invoices" element={shell(FINANCE_ROLES, <Finance.Invoices />)} />
    <Route path="/finance/invoice-details" element={shell(FINANCE_ROLES, <Finance.Invoices />)} />
    <Route path="/finance/payment-history" element={shell(FINANCE_ROLES, <Finance.PaymentHistory />)} />

    {/* ── Finance: Accounts ── */}
    <Route path="/finance/expenses" element={shell(FINANCE_ROLES, <Finance.Expenses />)} />
    <Route path="/finance/income" element={shell(FINANCE_ROLES, <Finance.Income />)} />
    <Route path="/finance/financial-reports" element={shell(FINANCE_ROLES, <Finance.FinancialReports />)} />

    {/* ── Finance: Payroll & Receipts ── */}
    <Route path="/finance/payroll" element={shell(FINANCE_ROLES, <Finance.SchoolPayroll />)} />
    <Route path="/finance/receipts" element={shell(FINANCE_ROLES, <Finance.Receipts />)} />
    <Route path="/finance/receipts/:id/print" element={shell(FINANCE_ROLES, <Finance.Receipts />)} />
    <Route path="/finance/reports" element={shell(REPORTS_ROLES, <Finance.FinanceReports />)} />
    <Route path="/receipts" element={shell(TRANSACTION_VIEW_ROLES, <Finance.Receipts />)} />
    <Route path="/admin/payments/unmatched" element={shell(FINANCE_ROLES, <Finance.UnmatchedPayments />)} />
    <Route path="/payroll" element={shell(FINANCE_ROLES, <Finance.SchoolPayroll />)} />

    {/* ── Reports & Analytics — live data only (fee collection, teacher attendance, custom) ── */}
    <Route path="/admin/reports" element={shell(REPORTS_ROLES, <Finance.FinanceReports />)} />
    <Route path="/admin/reports/fee-collection" element={shell(REPORTS_ROLES, <Reports.FeeCollectionReport />)} />
    <Route path="/admin/reports/teacher-performance" element={shell(REPORTS_ROLES, <Reports.TeacherPerformance />)} />
    <Route path="/admin/reports/custom" element={shell(REPORTS_ROLES, <Reports.CustomReports />)} />

    {/* ── Administration: Events ── */}
    <Route path="/admin/events" element={shell(ADMIN_ROLES, <Tables.Calendar />)} />
    <Route path="/admin/activities" element={shell(ADMIN_ROLES, <Tables.Calendar />)} />

    {/* ── Administration: Multi School ── */}
    <Route path="/admin/tenant-settings" element={shell(SUPER_ADMIN_ROLES, <Ops.TenantSettings />)} />
    <Route path="/admin/central-dashboard" element={shell(SUPER_ADMIN_ROLES, <Misc.SuperAdminDashboard />)} />

    {/* ── Settings ── */}
    <Route path="/admin/settings" element={shell(SETTINGS_ROLES, <Settings.SchoolProfile />)} />
    <Route path="/admin/settings/profile" element={shell(SETTINGS_ROLES, <Settings.ProfileSettings />)} />
    <Route path="/admin/settings/school" element={shell(SETTINGS_ROLES, <Settings.SchoolProfile />)} />
    <Route path="/admin/settings/academic-year" element={shell(SETTINGS_ROLES, <Settings.AcademicYear />)} />
    <Route path="/admin/settings/payment" element={shell(SETTINGS_ROLES, <Settings.PaymentSettings />)} />

    {/* ── ReClass ── */}
    <Route path="/reclass" element={shell(RECLASS_ROLES, <Reclass.ReclassDashboard />, [PERMISSIONS.reclassProgramme.view])} />
    <Route path="/admin/reclass" element={shell(RECLASS_ROLES, <Reclass.ReclassDashboard />, [PERMISSIONS.reclassProgramme.view])} />
    <Route path="/admin/reclass/students" element={shell(RECLASS_COMMITTEE_ROLES, <Students />, [PERMISSIONS.reclassProgramme.view])} />
    <Route path="/admin/reclass/students/:id" element={shell(RECLASS_COMMITTEE_ROLES, <StudentDetails />, [PERMISSIONS.reclassProgramme.view])} />
    <Route path="/admin/attendance" element={shell(RECLASS_ROLES, <Reclass.Attendance />, [PERMISSIONS.reclassAttendance.view])} />
    <Route path="/admin/attendance/review" element={shell(RECLASS_COMMITTEE_ROLES, <Reclass.ReviewQueue />, [PERMISSIONS.reclassAttendance.manage])} />
    <Route path="/admin/committee" element={shell(RECLASS_COMMITTEE_ROLES, <CommitteeManagement />, [PERMISSIONS.reclassCommittee.view])} />
    <Route path="/admin/fee" element={shell(RECLASS_FINANCE_ROLES, <Reclass.RemedialFees />, [PERMISSIONS.reclassFinance.view])} />
    <Route path="/admin/parent-payments" element={shell(RECLASS_FINANCE_ROLES, <Reclass.ParentPayments />, [PERMISSIONS.reclassPayments.view])} />
    <Route path="/admin/payroll" element={shell(RECLASS_FINANCE_ROLES, <Reclass.RemedialPayroll />, [PERMISSIONS.reclassFinance.view])} />
    <Route path="/admin/remedial/receipts" element={shell(RECLASS_FINANCE_ROLES, <Reclass.ParentPayments />, [PERMISSIONS.reclassPayments.view])} />
    <Route path="/admin/scheduling" element={shell(RECLASS_ROLES, <SchedulingCalendar />, [PERMISSIONS.reclassTeaching.view])} />

    {/* ── Operations (legacy) ── */}
    <Route path="/admin/operations" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Calendar />)} />
    <Route path="/admin/operations/calendar" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Calendar />)} />
    <Route path="/admin/operations/discipline" element={shell(COMPLIANCE_ROLES, <Tables.Discipline />)} />
    <Route path="/admin/operations/lifecycle" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Lifecycle />)} />
    <Route path="/admin/operations/tasks" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Tasks />)} />
    <Route path="/admin/calendar" element={shell(MEMBER_MANAGEMENT_ROLES, <Tables.Calendar />)} />
    <Route path="/admin/audit" element={shell(COMPLIANCE_ROLES, <Tables.Audit />)} />

    {/* ── Parent Portal ── */}
    <Route path="/parent" element={shell(PARENT_ROLES, <Parent.ParentDashboard />)} />
    <Route path="/parent/child" element={shell(PARENT_ROLES, <Parent.ParentDashboard />)} />
    <Route path="/parent/fees" element={shell(PARENT_ROLES, <Parent.ParentDashboard />)} />
    <Route path="/parent/payments" element={shell(PARENT_ROLES, <Parent.ParentPayments />)} />
    <Route path="/parent/pay" element={shell(PARENT_ROLES, <Parent.ParentPay />)} />
    <Route path="/parent/timetable" element={shell(PARENT_ROLES, <Parent.Timetable who="parent" />)} />

    {/* ── Teacher Workspace ── */}
    <Route path="/teacher" element={shell(TEACHER_ROLES, <Teacher.TeacherDashboard />)} />
    <Route path="/teacher/profile" element={shell(TEACHER_ROLES, <Teacher.TeacherProfile />)} />
    <Route path="/teacher/routine" element={shell(TEACHER_ROLES, <Teacher.TeacherRoutine />)} />
    <Route path="/teacher/list" element={shell(MEMBER_MANAGEMENT_ROLES, <Teacher.TeacherList />)} />
    <Route path="/teacher/new" element={shell(MEMBER_MANAGEMENT_ROLES, <Teacher.AddTeacher />)} />
    <Route path="/teacher/classes" element={shell(TEACHER_ROLES, <Tables.Classes />)} />
    <Route path="/teacher/tasks" element={shell(TEACHER_ROLES, <Tables.Tasks />)} />
    <Route path="/teacher/timetable" element={shell(TEACHER_ROLES, <Parent.Timetable who="teacher" />)} />
    <Route path="/teacher/committee" element={shell(RECLASS_COMMITTEE_ROLES, <CommitteeManagement />, [PERMISSIONS.reclassCommittee.view])} />
    <Route path="/teacher/committee/payroll" element={shell(RECLASS_FINANCE_ROLES, <Reclass.RemedialPayroll />, [PERMISSIONS.reclassFinance.view])} />
    <Route path="/teacher/attendance" element={shell(TEACHER_ROLES, <Teacher.MarkAttendance />)} />

    {/* ── Principal ── */}
    <Route path="/principal" element={shell(COMPLIANCE_ROLES, <Misc.PrincipalDashboard />)} />
    <Route path="/principal/school" element={shell(COMPLIANCE_ROLES, <Misc.SchoolOverview />)} />
    <Route path="/principal/reports" element={shell(REPORTS_ROLES, <Finance.FinanceReports />)} />
    <Route path="/principal/effectiveness" element={shell(COMPLIANCE_ROLES, <Misc.PrincipalDashboard />)} />

    {/* ── Bursar ── */}
    <Route path="/bursar" element={shell(FINANCE_ROLES, <Misc.BursarDashboard />)} />
    <Route path="/bursar/receipts" element={shell(FINANCE_ROLES, <Finance.Receipts />)} />

    {/* ── Super Admin ── */}
    <Route path="/super-admin" element={shell(SUPER_ADMIN_ROLES, <Misc.SuperAdminDashboard />)} />
    <Route path="/super-admin/settings" element={shell(SUPER_ADMIN_ROLES, <Settings.SchoolProfile />)} />
    <Route path="/super-admin/audit" element={shell(SUPER_ADMIN_ROLES, <Tables.Audit />)} />

    {/* ── Misc ── */}
    <Route path="/about" element={shell([...ADMIN_ROLES, 'teacher', 'parent'], <Misc.About />)} />
    <Route path="/account" element={shell([...ADMIN_ROLES, 'teacher', 'parent'], <Misc.Account />)} />

    {/* ── Legacy redirects (collapsed registry — see lib/legacyRedirects.ts).
        Static routes above always win over these splats in React Router v6. */}
    <Route path="/comms" element={<LegacyRedirect />} />
    <Route path="/notifications" element={<LegacyRedirect />} />
    <Route path="/admin/*" element={<LegacyRedirect />} />
    <Route path="/finance/*" element={<LegacyRedirect />} />

    {/* ── Fallback ── */}
    <Route path="*" element={<Stub title="Not found" />} />
  </Routes></Suspense></AuthProvider></ErrorBoundary>;
}
