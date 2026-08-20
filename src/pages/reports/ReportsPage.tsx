import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Download, FileSpreadsheet, ExternalLink, Globe } from "lucide-react";
import { useEmployees, useKpiRecords, useKpiPeriods, exportKpiReportToExcel, exportKpiReportDetailed } from "@/api/hooks";
import { RANK_COLOR, RANK_LABEL } from "@/utils";
import { BranchSelector } from "@/components/common/BranchSelector";
import { useAuth } from "@/features/auth/AuthProvider";
import { isAdmin } from "@/features/auth/AuthProvider";
import { useToast } from "@/hooks/useToast";
import type { Branch } from "@/types/branch";

export default function ReportsPage() {
  const { appUser } = useAuth();
  const userIsAdmin = isAdmin(appUser?.role);
  const toast = useToast();
  const navigate = useNavigate();
  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = useKpiPeriods();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [filterBranch, setFilterBranch] = useState<Branch | "">(appUser?.branch ?? "");

  const activePeriodId = selectedPeriodId ?? periods.find((p) => p.status === "OPEN")?.id ?? periods[0]?.id;
  const { data: records = [] } = useKpiRecords(activePeriodId, {
    branch: filterBranch || undefined,
  });

  const deptRanking = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const r of records) {
      if (r.status !== "APPROVED" && r.status !== "LOCKED") continue;
      const emp = employees.find((e) => e.id === r.employeeId);
      const dept = emp?.department ?? "Khác";
      const cur = map.get(dept) ?? { total: 0, count: 0 };
      cur.total += r.kpiScore;
      cur.count += 1;
      map.set(dept, cur);
    }
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      avg: Math.round((v.total / v.count) * 10) / 10,
    }));
  }, [employees, records]);

  const distribution = useMemo(() => {
    const counts: Record<string, number> = { XUAT_SAC: 0, TOT: 0, DAT: 0, CAN_CAI_THIEN: 0 };
    for (const r of records) {
      if (r.status !== "APPROVED" && r.status !== "LOCKED") continue;
      counts[r.rank] = (counts[r.rank] ?? 0) + 1;
    }
    return Object.entries(counts).map(([k, v]) => ({
      name: RANK_LABEL[k as keyof typeof RANK_LABEL],
      value: v,
      color: RANK_COLOR[k as keyof typeof RANK_COLOR].includes("emerald") ? "#10b981" :
             RANK_COLOR[k as keyof typeof RANK_COLOR].includes("sky") ? "#0ea5e9" :
             RANK_COLOR[k as keyof typeof RANK_COLOR].includes("amber") ? "#f59e0b" :
             RANK_COLOR[k as keyof typeof RANK_COLOR].includes("rose") ? "#e11d48" : "#64748b",
    }));
  }, [records]);

  const trend = useMemo(() => {
    return periods
      .map((p) => {
        const periodRecords = records.filter((r) => r.periodId === p.id);
        const locked = periodRecords.filter((r) => r.status === "APPROVED" || r.status === "LOCKED");
        const avg = locked.length ? locked.reduce((a, r) => a + r.kpiScore, 0) / locked.length : 0;
        return {
          name: `${p.month}/${p.year}`,
          avg: Math.round(avg * 10) / 10,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [periods, records]);

  const currentPeriod = periods.find((p) => p.id === activePeriodId);

  async function handleExport() {
    try {
      await exportKpiReportToExcel({
        periodId: activePeriodId ?? undefined,
        branch: filterBranch || undefined,
      });
      toast.success("Đã xuất báo cáo tóm tắt");
    } catch (e) {
      toast.error(`Lỗi khi xuất: ${(e as Error).message ?? "unknown"}`);
    }
  }

  async function handleExportDetail() {
    try {
      await exportKpiReportDetailed({
        periodId: activePeriodId ?? undefined,
        branch: filterBranch || undefined,
      });
      toast.success("Đã xuất báo cáo chi tiết (kèm sự kiện)");
    } catch (e) {
      toast.error(`Lỗi khi xuất: ${(e as Error).message ?? "unknown"}`);
    }
  }

  function openPublicLookup() {
    navigate("/lookup");
  }

  function copyLookupUrl() {
    const url = `${window.location.origin}/lookup`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Đã sao chép liên kết tra cứu công khai"),
      () => toast.error("Không thể sao chép liên kết"),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Báo cáo KPI</h1>
          <p className="text-sm text-slate-500">
            {currentPeriod
              ? `Kỳ ${currentPeriod.name} · ${records.filter((r) => r.status === "APPROVED" || r.status === "LOCKED").length} nhân viên đã duyệt`
              : "Chưa có dữ liệu"}
          </p>
        </div>

        {/* Filters & Export */}
        <div className="flex flex-wrap items-center gap-3">
          {userIsAdmin && (
            <BranchSelector
              value={filterBranch}
              onChange={setFilterBranch}
              placeholder="Tất cả cơ sở"
              className="w-40"
            />
          )}
          {periods.length > 1 && (
            <select
              value={activePeriodId ?? ""}
              onChange={(e) => setSelectedPeriodId(e.target.value || null)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === "OPEN" ? "(Đang mở)" : ""}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-brand-50 hover:border-brand-200 hover:text-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Xuất báo cáo tóm tắt - 1 dòng / nhân viên"
          >
            <Download size={16} />
            Xuất CSV tóm tắt
          </button>
          <button
            onClick={handleExportDetail}
            disabled={records.length === 0}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Xuất báo cáo chi tiết - mỗi dòng là 1 sự kiện KPI (cho cả nhân viên đã chấm)"
          >
            <Download size={16} />
            Xuất CSV toàn bộ
          </button>
        </div>
      </div>

      {/* Public Lookup Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-sky-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
            <Globe size={20} className="text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Tra cứu KPI công khai cho nhân viên</p>
            <p className="text-xs text-slate-500">
              Gửi liên kết này để nhân viên tự tra cứu bằng mã NV / tên — không cần đăng nhập
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyLookupUrl}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            title="Sao chép liên kết tra cứu"
          >
            <ExternalLink size={14} />
            Sao chép liên kết
          </button>
          <button
            onClick={openPublicLookup}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
            title="Mở trang tra cứu công khai"
          >
            <ExternalLink size={14} />
            Mở trang tra cứu
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tổng KPI</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{records.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Đã duyệt</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">
            {records.filter((r) => r.status === "APPROVED" || r.status === "LOCKED").length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chờ duyệt</p>
          <p className="mt-1 text-2xl font-black text-amber-600">
            {records.filter((r) => r.status === "SUBMITTED").length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cần cải thiện</p>
          <p className="mt-1 text-2xl font-black text-rose-600">
            {records.filter((r) => r.rank === "CAN_CAI_THIEN").length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-800">KPI trung bình theo phòng ban</h2>
          {deptRanking.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center text-slate-400">
              <FileSpreadsheet size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptRanking}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 105]} />
                  <Tooltip />
                  <Bar dataKey="avg" name="Điểm TB" fill="#1f5cf2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-slate-800">Phân bố xếp loại</h2>
          {distribution.every((d) => d.value === 0) ? (
            <div className="flex h-72 flex-col items-center justify-center text-slate-400">
              <FileSpreadsheet size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Số NV" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold text-slate-800">So sánh điểm KPI các kỳ</h2>
          {trend.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center text-slate-400">
              <FileSpreadsheet size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 105]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg" name="Điểm TB" stroke="#1f5cf2" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
