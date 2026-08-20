import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileSpreadsheet,
  BarChart3,
  Settings,
  History,
  ListChecks,
  GaugeCircle,
  Award,
  ChevronDown,
  ChevronRight,
  UserCircle,
  Bell,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { Role } from "@/constants/roles";
import { ROLE } from "@/constants/roles";

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  roles?: Role[];
}

interface NavGroup {
  id: string;
  label: string;
  Icon: LucideIcon;
  items: NavItem[];
  roles?: Role[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    id: "dashboard",
    label: "Tổng quan",
    Icon: LayoutDashboard,
    defaultOpen: true,
    items: [{ to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard }],
  },
  {
    id: "kpi",
    label: "KPI Chấm điểm",
    Icon: ClipboardList,
    defaultOpen: true,
    roles: [ROLE.ADMIN, ROLE.BOARD, ROLE.OPERATION_MANAGER, ROLE.PROGRAM_MANAGER],
    items: [
      { to: "/kpi/manager", label: "Ban Giám Hiệu", Icon: ClipboardList, roles: [ROLE.ADMIN, ROLE.BOARD] },
      { to: "/kpi/office-support", label: "Văn phòng + Hỗ trợ", Icon: ClipboardList, roles: [ROLE.ADMIN, ROLE.OPERATION_MANAGER] },
      { to: "/kpi/teacher/HS", label: "Giáo viên HS", Icon: ListChecks, roles: [ROLE.ADMIN, ROLE.PROGRAM_MANAGER] },
      { to: "/kpi/teacher/ST", label: "Giáo viên ST", Icon: ListChecks, roles: [ROLE.ADMIN, ROLE.PROGRAM_MANAGER] },
    ],
  },
  {
    id: "personal",
    label: "Cá nhân",
    Icon: UserCircle,
    defaultOpen: true,
    items: [
      { to: "/my-kpi", label: "KPI Cá nhân", Icon: GaugeCircle },
      { to: "/approve-kpi", label: "Duyệt KPI", Icon: CheckCircle, roles: [ROLE.ADMIN, ROLE.BOARD] },
      { to: "/notifications", label: "Thông báo", Icon: Bell },
    ],
  },
  {
    id: "reports",
    label: "Báo cáo",
    Icon: BarChart3,
    defaultOpen: true,
    items: [{ to: "/reports", label: "Xem báo cáo", Icon: BarChart3 }],
  },
  {
    id: "admin",
    label: "Quản trị",
    Icon: Settings,
    defaultOpen: false,
    roles: [ROLE.ADMIN],
    items: [
      { to: "/admin/employees", label: "Nhân sự", Icon: Users, roles: [ROLE.ADMIN] },
      { to: "/admin/kpi-templates", label: "Mẫu KPI", Icon: FileSpreadsheet, roles: [ROLE.ADMIN] },
      { to: "/admin/ranking-rules", label: "Xếp loại & Thưởng", Icon: Award, roles: [ROLE.ADMIN] },
      { to: "/admin/system-settings", label: "Cấu hình hệ thống", Icon: Settings, roles: [ROLE.ADMIN] },
      { to: "/admin/audit-logs", label: "Nhật ký hoạt động", Icon: History, roles: [ROLE.ADMIN] },
    ],
  },
];

interface Props {
  role?: string | null;
}

function isActivePath(to: string, location: { pathname: string }) {
  if (to === "/dashboard") return location.pathname === "/dashboard";
  return location.pathname.startsWith(to);
}

export function Sidebar({ role }: Props) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <GaugeCircle size={18} className="text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-slate-900">KPI System</span>
          <p className="text-[10px] text-slate-400 leading-tight">Bang cham diem KPI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (i) => !i.roles || (role && i.roles.includes(role as Role)),
          );
          if (visibleItems.length === 0) return null;

          const isGroupOpen = !collapsed.has(group.id);
          const hasActiveChild = group.items.some((i) => isActivePath(i.to, location));

          return (
            <div key={group.id} className="px-2">
              {/* Group header */}
              <button
                onClick={() => toggle(group.id)}
                className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                  hasActiveChild ? "text-brand-700" : "text-slate-400"
                } hover:text-slate-700 transition-colors`}
              >
                <group.Icon size={14} />
                <span className="flex-1 text-left">{group.label}</span>
                {isGroupOpen ? (
                  <ChevronDown size={12} className="opacity-50" />
                ) : (
                  <ChevronRight size={12} className="opacity-50" />
                )}
              </button>

              {/* Group items */}
              {isGroupOpen && (
                <div className="mb-1 ml-1 space-y-0.5 border-l border-slate-100 pl-2">
                  {visibleItems.map(({ to, label, Icon }) => {
                    const active = isActivePath(to, location);
                    return (
                      <NavLink
                        key={to}
                        to={to}
                        className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-all ${
                          active
                            ? "bg-brand-50 text-brand-700 shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-md text-xs ${
                            active
                              ? "bg-brand-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Icon size={13} />
                        </div>
                        {label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 px-4 py-3 text-[10px] text-slate-400">
        v0.1.0 · Configuration-driven
      </div>
    </aside>
  );
}
