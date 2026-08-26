import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { RequireRole } from "@/features/auth/RequireRole";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import EmployeesPage from "@/pages/admin/EmployeesPage";
import AccountsPage from "@/pages/admin/AccountsPage";
import KpiTemplatesPage from "@/pages/admin/KpiTemplatesPage";
import RankingRulesPage from "@/pages/admin/RankingRulesPage";
import SystemSettingsPage from "@/pages/admin/SystemSettingsPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import KpiManagerPage from "@/pages/kpi/KpiManagerPage";
import KpiOfficeSupportPage from "@/pages/kpi/KpiOfficeSupportPage";
import KpiTeacherPage from "@/pages/kpi/KpiTeacherPage";
import ReportsPage from "@/pages/reports/ReportsPage";
import PersonalKpiPage from "@/pages/PersonalKpiPage";
import NotificationsPage from "@/pages/NotificationsPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { ROLE } from "@/constants/roles";
import KpiLookupPage from "@/pages/KpiLookupPage";
import ApproveKpiPage from "@/pages/ApproveKpiPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Public route - no auth required */}
      <Route path="/lookup" element={<KpiLookupPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/kpi/manager" element={<KpiManagerPage />} />
        <Route path="/kpi/office-support" element={<KpiOfficeSupportPage />} />
        <Route path="/kpi/teacher/:program" element={<KpiTeacherPage />} />

        <Route path="/reports" element={<ReportsPage />} />

        <Route path="/approve-kpi" element={<ApproveKpiPage />} />

        {/* Personal KPI */}
        <Route path="/my-kpi" element={<PersonalKpiPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        <Route
          path="/admin/accounts"
          element={
            <RequireRole allow={[ROLE.ADMIN]}>
              <AccountsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <RequireRole allow={[ROLE.ADMIN]}>
              <EmployeesPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/kpi-templates"
          element={
            <RequireRole allow={[ROLE.ADMIN]}>
              <KpiTemplatesPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/ranking-rules"
          element={
            <RequireRole allow={[ROLE.ADMIN]}>
              <RankingRulesPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/system-settings"
          element={
            <RequireRole allow={[ROLE.ADMIN]}>
              <SystemSettingsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <RequireRole allow={[ROLE.ADMIN]}>
              <AuditLogsPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}