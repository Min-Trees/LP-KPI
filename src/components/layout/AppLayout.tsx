import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/features/auth/AuthProvider";
import { ChevronRight } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Tổng quan",
  "/kpi/manager": "KPI Ban Giám Hiệu",
  "/kpi/office-support": "KPI Văn phòng & Hỗ trợ",
  "/kpi/teacher/HS": "KPI Giáo viên HS",
  "/kpi/teacher/ST": "KPI Giáo viên ST",
  "/reports": "Báo cáo",
  "/approve-kpi": "Duyệt KPI",
  "/admin/employees": "Quản lý Nhân sự",
  "/admin/kpi-templates": "Mẫu KPI",
  "/admin/ranking-rules": "Xếp loại & Thưởng",
  "/admin/system-settings": "Cấu hình hệ thống",
  "/admin/audit-logs": "Nhật ký hoạt động",
};

const PAGE_GROUPS: Record<string, string> = {
  "/dashboard": "Tổng quan",
  "/kpi/manager": "KPI Chấm điểm",
  "/kpi/office-support": "KPI Chấm điểm",
  "/kpi/teacher/HS": "KPI Chấm điểm",
  "/kpi/teacher/ST": "KPI Chấm điểm",
  "/reports": "Báo cáo",
  "/approve-kpi": "Cá nhân",
  "/admin/employees": "Quản trị",
  "/admin/kpi-templates": "Quản trị",
  "/admin/ranking-rules": "Quản trị",
  "/admin/system-settings": "Quản trị",
  "/admin/audit-logs": "Quản trị",
};

export function AppLayout() {
  const { appUser } = useAuth();
  const { pathname } = useLocation();

  const title = PAGE_TITLES[pathname] ?? "KPI System";
  const group = PAGE_GROUPS[pathname] ?? "";

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar role={appUser?.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {/* Page header bar */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-5 py-2 text-xs text-slate-400">
          {group && (
            <>
              <span>{group}</span>
              <ChevronRight size={12} />
            </>
          )}
          <span className="font-medium text-slate-700">{title}</span>
        </div>
        <main className="flex-1 overflow-auto bg-slate-50 p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
