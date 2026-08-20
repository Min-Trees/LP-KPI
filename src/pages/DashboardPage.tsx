import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Users,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  ListChecks,
  Settings,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useEmployees } from "@/api/hooks";
import { useKpiRecords } from "@/api/hooks";
import { useCurrentPeriod } from "@/api/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { RANK_COLOR, RANK_LABEL, formatDate } from "@/utils";
import { ROLE } from "@/constants/roles";
import type { Role } from "@/constants/roles";

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`rounded-xl p-3 ${accent ?? "bg-slate-100"}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { appUser } = useAuth();
  const { data: employees = [], isLoading: l1 } = useEmployees();
  const period = useCurrentPeriod();
  const { data: records = [], isLoading: l3 } = useKpiRecords(period?.id);

  const stats = useMemo(() => {
    const activeEmployees = employees.filter((e) => e.status === "ACTIVE");
    const locked = records.filter((r) => r.status === "LOCKED" || r.status === "APPROVED");
    const avg =
      locked.length
        ? locked.reduce((a, r) => a + r.kpiScore, 0) / locked.length
        : 0;
    const excellent = locked
      .filter((r) => r.rank === "XUAT_SAC")
      .sort((a, b) => b.kpiScore - a.kpiScore)
      .slice(0, 5);
    const need = locked
      .filter((r) => r.rank === "CAN_CAI_THIEN")
      .sort((a, b) => a.kpiScore - b.kpiScore)
      .slice(0, 5);

    const byDept = new Map<string, { count: number; total: number }>();
    for (const r of locked) {
      const emp = employees.find((e) => e.id === r.employeeId);
      const dept = emp?.department ?? "Khác";
      const cur = byDept.get(dept) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += r.kpiScore;
      byDept.set(dept, cur);
    }
    const deptChart = Array.from(byDept.entries())
      .map(([name, v]) => ({
        name,
        avg: Math.round((v.total / v.count) * 10) / 10,
        count: v.count,
      }))
      .sort((a, b) => b.avg - a.avg);

    return {
      totalEmployees: activeEmployees.length,
      avgScore: Math.round(avg * 10) / 10,
      lockedCount: locked.length,
      totalRecords: records.length,
      excellent,
      need,
      deptChart,
    };
  }, [employees, records]);

  if (l1 || l3) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Đang tải dữ liệu...
      </div>
    );
  }

  const isAdmin = appUser?.role === ROLE.ADMIN;

  return (
    <div className="space-y-5">
      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Users size={20} className="text-blue-600" />}
          label="Tổng nhân sự"
          value={stats.totalEmployees}
          accent="bg-blue-50"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          label="KPI trung bình"
          value={stats.avgScore.toFixed(1)}
          sub="điểm"
          accent="bg-emerald-50"
        />
        <StatCard
          icon={<CheckCircle2 size={20} className="text-brand-600" />}
          label="Đã chốt"
          value={stats.lockedCount}
          sub={`/ ${stats.totalRecords} bản ghi`}
          accent="bg-brand-50"
        />
        <StatCard
          icon={<AlertTriangle size={20} className="text-rose-600" />}
          label="Cần cải thiện"
          value={stats.need.length}
          sub="dưới 80 điểm"
          accent="bg-rose-50"
        />
      </div>

      {/* Quick Actions - Admin only */}
      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { to: "/kpi/manager", label: "Chấm KPI BGH", icon: ClipboardList, roles: [ROLE.ADMIN, ROLE.BOARD] },
              { to: "/kpi/office-support", label: "Chấm KPI VP", icon: ClipboardList, roles: [ROLE.ADMIN, ROLE.OPERATION_MANAGER] },
              { to: "/kpi/teacher/HS", label: "Chấm KPI GV HS", icon: ListChecks, roles: [ROLE.ADMIN, ROLE.PROGRAM_MANAGER] },
              { to: "/kpi/teacher/ST", label: "Chấm KPI GV ST", icon: ListChecks, roles: [ROLE.ADMIN, ROLE.PROGRAM_MANAGER] },
              { to: "/admin/employees", label: "Quản lý nhân sự", icon: Users, roles: [ROLE.ADMIN] },
              { to: "/admin/kpi-templates", label: "Mẫu KPI", icon: Settings, roles: [ROLE.ADMIN] },
            ].map(({ to, label, icon: Icon, roles }) => {
              if (!roles.includes(appUser?.role as Role)) return null;
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Icon size={15} className="shrink-0 text-slate-400" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Period Banner */}
      {period && (
        <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-800">
              Kỳ hiện tại: {period.name}
            </p>
            <p className="text-xs text-brand-500">
              {formatDate(period.startDate)} → {formatDate(period.endDate)}
              {period.deadline && ` · Hạn chốt: ${formatDate(period.deadline)}`}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              period.status === "OPEN"
                ? "bg-emerald-100 text-emerald-700"
                : period.status === "LOCKED"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {period.status === "OPEN" ? "Đang mở" : period.status === "LOCKED" ? "Đã chốt" : "Đã đóng"}
          </span>
        </div>
      )}

      {!period && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm text-rose-700">Chưa có kỳ KPI nào. Vào Cấu hình hệ thống để tạo.</p>
          <Link to="/admin/system-settings" className="btn-primary text-xs">
            Tạo kỳ KPI
          </Link>
        </div>
      )}

      {/* Charts + Top Lists */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Department Chart */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            KPI trung bình theo phòng ban
          </h2>
          {stats.deptChart.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu đã chốt.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.deptChart} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis domain={[0, 105]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="avg"
                    name="Điểm TB"
                    fill="#1f5cf2"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Excellent */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Sparkles size={14} className="text-amber-500" />
              Top xuất sắc
            </h2>
            <Link
              to="/reports"
              className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
            >
              Xem tất cả <ArrowRight size={11} />
            </Link>
          </div>
          {stats.excellent.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu.
            </div>
          ) : (
            <ul className="space-y-1">
              {stats.excellent.map((r, i) => {
                const emp = employees.find((e) => e.id === r.employeeId);
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          i === 0
                            ? "bg-amber-100 text-amber-700"
                            : i === 1
                              ? "bg-slate-200 text-slate-600"
                              : i === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="font-medium text-slate-800">
                        {emp?.fullName ?? r.employeeId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{r.kpiScore.toFixed(1)}</span>
                      <span className={`badge ${RANK_COLOR[r.rank]}`}>
                        {RANK_LABEL[r.rank]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Need Improvement */}
      {stats.need.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <AlertTriangle size={14} className="text-rose-500" />
              Cần cải thiện ({stats.need.length})
            </h2>
            <Link
              to="/reports"
              className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
            >
              Xem báo cáo <ArrowRight size={11} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="pb-2 font-medium">Nhân viên</th>
                  <th className="pb-2 font-medium">Phòng ban</th>
                  <th className="pb-2 text-right font-medium">Điểm KPI</th>
                  <th className="pb-2 text-right font-medium">Xếp loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.need.map((r) => {
                  const emp = employees.find((e) => e.id === r.employeeId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-800">
                        {emp?.fullName ?? r.employeeId}
                      </td>
                      <td className="py-2 text-slate-500">{emp?.department ?? "—"}</td>
                      <td className="py-2 text-right font-semibold text-rose-600">
                        {r.kpiScore.toFixed(1)}
                      </td>
                      <td className="py-2 text-right">
                        <span className={`badge ${RANK_COLOR[r.rank]}`}>
                          {RANK_LABEL[r.rank]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
