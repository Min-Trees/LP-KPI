import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePermissions } from "@/features/auth/usePermissions";
import { ChevronRight, AlertCircle } from "lucide-react";

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
  const { appUser, firebaseUser, loading, signOut } = useAuth();
  const { has } = usePermissions();
  const { pathname } = useLocation();

  const title = PAGE_TITLES[pathname] ?? "KPI System";
  const group = PAGE_GROUPS[pathname] ?? "";

  // User đã đăng nhập Firebase nhưng KHÔNG có doc users/{uid} (auth user mồ côi).
  // Hiển thị thông báo rõ ràng thay vì trắng giao diện.
  if (!loading && firebaseUser && !appUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
        <div className="card max-w-md text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle size={24} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">
            Tài khoản chưa được kích hoạt
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Tài khoản <strong>{firebaseUser.email}</strong> đã đăng nhập Firebase
            thành công nhưng chưa có hồ sơ trong hệ thống.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Vui lòng liên hệ Admin để được cấp quyền, hoặc dùng email khác.
          </p>
          <button
            className="btn-primary mt-4 w-full"
            onClick={() => void signOut()}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar role={appUser?.role} hasPermission={has} />
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
