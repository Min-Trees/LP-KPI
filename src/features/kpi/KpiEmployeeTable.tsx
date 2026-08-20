import { Link } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  Lock,
  AlertCircle,
  FileEdit,
  Eye,
  ThumbsUp,
} from "lucide-react";
import type { Employee, KpiRecord, KpiPeriod } from "@/types";
import { RANK_COLOR, RANK_LABEL } from "@/utils/labels";
import { STATUS_COLOR, STATUS_LABEL } from "@/utils/labels";

interface Props {
  employees: Employee[];
  records: KpiRecord[];
  period: KpiPeriod | null;
  onScore: (employee: Employee) => void;
  onView: (employee: Employee) => void;
  onApprove?: (employee: Employee, record: KpiRecord) => void;
  readOnly?: boolean;
}

export function KpiEmployeeTable({
  employees,
  records,
  period,
  onScore,
  onView,
  onApprove,
  readOnly,
}: Props) {
  const now = new Date();

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">#</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Mã NV</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Họ tên</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Phòng ban</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Kỳ</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Trạng thái</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Điểm KPI</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">% Thưởng</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Xếp loại</th>
              <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  Chưa có nhân viên nào trong danh sách này.
                </td>
              </tr>
            ) : (
              [...employees]
                .sort((a, b) => a.id.localeCompare(b.id))
                .map((emp, idx) => {
                const rec = records.find(
                  (r) => r.employeeId === emp.id && r.periodId === period?.id,
                );

                const status = rec?.status ?? "DRAFT";
                const isLocked = status === "APPROVED" || status === "LOCKED";
                const isSubmitted = status === "SUBMITTED";
                const isInProgress = status === "IN_PROGRESS";

                return (
                  <tr
                    key={emp.id}
                    className="group transition-colors hover:bg-brand-50"
                  >
                    <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {emp.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>
                        <p>{emp.fullName}</p>
                        {emp.program && (
                          <p className="text-xs text-slate-400">CT {emp.program}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.department ?? "—"}</td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {period ? `${period.month}/${period.year}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rec ? (
                        <span className={`badge ${STATUS_COLOR[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-500">Chưa chấm</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rec ? (
                        <span className="font-bold text-brand-700">
                          {rec.kpiScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rec ? (
                        <span className="font-semibold text-slate-700">
                          {rec.bonusPercent}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rec ? (
                        <span className={`badge ${RANK_COLOR[rec.rank]}`}>
                          {RANK_LABEL[rec.rank]}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View button - always shown if record exists */}
                        {rec && (
                          <button
                            onClick={() => onView(emp)}
                            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50"
                            title="Xem chi tiết"
                          >
                            <Eye size={12} />
                            <span className="hidden sm:inline">Xem</span>
                          </button>
                        )}

                        {/* Approve button - shown for SUBMITTED records when user can approve */}
                        {rec && onApprove && rec.status === "SUBMITTED" && (
                          <button
                            onClick={() => onApprove(emp, rec)}
                            className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 transition-colors hover:bg-emerald-100"
                            title="Duyệt KPI"
                          >
                            <ThumbsUp size={12} />
                            <span className="hidden sm:inline">Duyệt</span>
                          </button>
                        )}

                        {/* Score / Edit button */}
                        {!readOnly && (
                          <button
                            onClick={() => onScore(emp)}
                            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                              isLocked
                                ? "cursor-default text-slate-400"
                                : isInProgress
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                                  : "bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200"
                            }`}
                            disabled={isLocked}
                            title={isLocked ? "Đã khóa, không thể chỉnh sửa" : rec ? "Chỉnh sửa" : "Bắt đầu chấm"}
                          >
                            <FileEdit size={12} />
                            <span className="hidden sm:inline">
                              {isLocked ? "Đã chốt" : rec ? "Sửa" : "Chấm"}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
