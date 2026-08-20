import { useState } from "react";
import { Plus } from "lucide-react";
import {
  useKpiPeriods,
  useCreatePeriod,
} from "@/api/hooks";
import type { KpiPeriod, KpiPeriodStatus } from "@/types";
import { formatDate } from "@/utils";

const STATUS_LABEL: Record<KpiPeriodStatus, string> = {
  UPCOMING: "Sắp tới",
  OPEN: "Đang mở",
  LOCKED: "Đã khóa",
  CLOSED: "Đã đóng",
};

export default function SystemSettingsPage() {
  const { data: periods = [], isLoading } = useKpiPeriods();
  const create = useCreatePeriod();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
    scoringDeadline: "",
    approvalDeadline: "",
    status: "UPCOMING" as KpiPeriodStatus,
  });

  async function createPeriod() {
    await create.mutateAsync({
      month: form.month,
      year: form.year,
      startDate: form.startDate,
      endDate: form.endDate,
      scoringDeadline: form.scoringDeadline,
      approvalDeadline: form.approvalDeadline,
      status: form.status,
    });
    setShowForm(false);
  }

  if (isLoading) return <div className="text-slate-500">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cấu hình hệ thống</h1>
          <p className="text-sm text-slate-500">Quản lý kỳ KPI và các thiết lập chung.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Tạo kỳ KPI
        </button>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">Danh sách kỳ KPI</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700">
              <th className="px-3 py-2">Tháng/Năm</th>
              <th className="px-3 py-2">Bắt đầu</th>
              <th className="px-3 py-2">Kết thúc</th>
              <th className="px-3 py-2">Hạn chấm</th>
              <th className="px-3 py-2">Hạn duyệt</th>
              <th className="px-3 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p: KpiPeriod) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium">{p.month}/{p.year}</td>
                <td className="px-3 py-2">{formatDate(p.startDate)}</td>
                <td className="px-3 py-2">{formatDate(p.endDate)}</td>
                <td className="px-3 py-2">{formatDate(p.scoringDeadline)}</td>
                <td className="px-3 py-2">{formatDate(p.approvalDeadline)}</td>
                <td className="px-3 py-2">{STATUS_LABEL[p.status]}</td>
              </tr>
            ))}
            {periods.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">Chưa có kỳ KPI.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="card w-full max-w-md space-y-3">
            <h2 className="text-lg font-semibold">Tạo kỳ KPI mới</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tháng</label>
                <input type="number" min={1} max={12} className="input" value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Năm</label>
                <input type="number" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <label className="label">Ngày bắt đầu</label>
                <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Ngày kết thúc</label>
                <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Hạn chấm</label>
                <input type="date" className="input" value={form.scoringDeadline} onChange={(e) => setForm({ ...form, scoringDeadline: e.target.value })} />
              </div>
              <div>
                <label className="label">Hạn duyệt</label>
                <input type="date" className="input" value={form.approvalDeadline} onChange={(e) => setForm({ ...form, approvalDeadline: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Trạng thái</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as KpiPeriodStatus })}>
                  <option value="UPCOMING">Sắp tới</option>
                  <option value="OPEN">Đang mở</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
              <button className="btn-primary" onClick={() => void createPeriod()} disabled={create.isPending}>
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}