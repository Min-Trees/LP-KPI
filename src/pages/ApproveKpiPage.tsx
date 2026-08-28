import { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  CheckSquare,
  Square,
  User,
  AlertCircle,
} from "lucide-react";
import { useApproveKpiRecord, useRejectKpiRecord, useEmployees, useKpiPeriods, useAllKpiRecords } from "@/api/hooks";
import { useAuth } from "@/features/auth/AuthProvider";
import { STATUS_LABEL, STATUS_COLOR, RANK_LABEL, RANK_COLOR } from "@/utils/labels";
import type { KpiRecord } from "@/types";

export default function ApproveKpiPage() {
  const { appUser } = useAuth();
  const { data: employees = [] } = useEmployees();
  const { data: periods = [] } = useKpiPeriods();
  const { data: records = [], isLoading } = useAllKpiRecords();

  const approveMutation = useApproveKpiRecord();
  const rejectMutation = useRejectKpiRecord();

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBatchReject, setShowBatchReject] = useState(false);
  const [batchRejectReason, setBatchRejectReason] = useState("");

  const periodMap = useMemo(() => new Map(periods.map((p) => [p.id, p])), [periods]);
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterPeriod !== "all" && r.periodId !== filterPeriod) return false;
      if (searchTerm) {
        const emp = employeeMap.get(r.employeeId);
        const searchLower = searchTerm.toLowerCase();
        const matchName = emp?.fullName?.toLowerCase().includes(searchLower);
        const matchCode = emp?.code?.toLowerCase().includes(searchLower);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [records, filterStatus, filterPeriod, searchTerm, employeeMap]);

  const submittedRecords = useMemo(
    () => filteredRecords.filter((r) => r.status === "SUBMITTED"),
    [filteredRecords]
  );

  const visibleRecords = useMemo(() => {
    // Hiển thị cả records có status SUBMITTED + APPROVED/REJECTED để OP theo dõi
    if (filterStatus !== "all") return filteredRecords;
    return filteredRecords.filter((r) =>
      ["SUBMITTED", "APPROVED", "REJECTED"].includes(r.status)
    );
  }, [filteredRecords, filterStatus]);

  const selectedRecord = filteredRecords.find((r) => r.id === selectedRecordId) ?? filteredRecords[0];
  const selectedPeriod = selectedRecord ? periodMap.get(selectedRecord.periodId) : null;
  const selectedEmployee = selectedRecord ? employeeMap.get(selectedRecord.employeeId) : null;

  const pendingCount = records.filter((r) => r.status === "SUBMITTED").length;

  const toggleSelectAll = () => {
    if (selectedRecordIds.size === submittedRecords.length) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(submittedRecords.map((r) => r.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApproveOne = async (record: KpiRecord) => {
    if (!appUser?.email) return;
    try {
      await approveMutation.mutateAsync({
        recordId: record.id,
        approvedBy: appUser.email,
      });
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleApproveSelected = async () => {
    if (!appUser?.email || selectedRecordIds.size === 0) return;
    const promises = Array.from(selectedRecordIds).map((id) =>
      approveMutation.mutateAsync({ recordId: id, approvedBy: appUser.email })
    );
    try {
      await Promise.all(promises);
      setSelectedRecordIds(new Set());
    } catch (error) {
      console.error("Failed to approve selected:", error);
    }
  };

  const handleRejectOne = async () => {
    if (!appUser?.email || !selectedRecord || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({
        recordId: selectedRecord.id,
        rejectedBy: appUser.email,
        reason: rejectReason.trim(),
      });
      setShowRejectModal(false);
      setRejectReason("");
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const handleRejectSelected = async () => {
    if (!appUser?.email || selectedRecordIds.size === 0 || !batchRejectReason.trim()) return;
    const promises = Array.from(selectedRecordIds).map((id) =>
      rejectMutation.mutateAsync({
        recordId: id,
        rejectedBy: appUser.email,
        reason: batchRejectReason.trim(),
      })
    );
    try {
      await Promise.all(promises);
      setSelectedRecordIds(new Set());
      setShowBatchReject(false);
      setBatchRejectReason("");
    } catch (error) {
      console.error("Failed to reject selected:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Đang tải dữ liệu KPI...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header + Filters */}
      <div className="mb-3 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">Duyệt KPI</h1>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              {pendingCount} chờ duyệt
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm tên, mã NV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-48 rounded-lg border border-slate-200 py-1.5 pl-3 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
          >
            <option value="all">Tất cả</option>
            <option value="SUBMITTED">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Trả lại</option>
          </select>
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-200"
          >
            <option value="all">Tất cả kỳ</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                T{p.month}/{p.year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedRecordIds.size > 0 && (
        <div className="mb-3 shrink-0 flex items-center justify-between rounded-lg bg-brand-50 border border-brand-200 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-brand-700">
              Đã chọn {selectedRecordIds.size} KPI
            </span>
            <button
              onClick={() => setSelectedRecordIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Bỏ chọn
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApproveSelected}
              disabled={approveMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              Duyệt ({selectedRecordIds.size})
            </button>
            <button
              onClick={() => setShowBatchReject(true)}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              <XCircle size={14} />
              Trả lại ({selectedRecordIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 gap-3 min-h-0">
        {/* Table */}
        <div className="flex flex-1 flex-col min-w-0 rounded-xl border border-slate-200 bg-white">
          <div className="shrink-0 border-b border-slate-100 px-4 py-2">
            <p className="text-xs font-semibold text-slate-500">
              Danh sách KPI ({visibleRecords.length})
            </p>
          </div>
          <div className="flex-1 overflow-auto">
            {visibleRecords.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <p className="text-sm">Không có KPI nào để hiển thị</p>
                {records.length > 0 && filteredRecords.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Có {records.length} bản ghi nhưng không khớp bộ lọc hiện tại
                  </p>
                )}
                {records.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Bạn chưa có KPI nào được gửi duyệt. Vào trang Chấm KPI để gửi duyệt.
                  </p>
                )}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="w-10 px-2 py-2 text-center">
                      {submittedRecords.length > 0 && (
                        <button
                          onClick={toggleSelectAll}
                          className="text-slate-400 hover:text-slate-600"
                          title="Chọn tất cả"
                        >
                          {selectedRecordIds.size === submittedRecords.length &&
                          submittedRecords.length > 0 ? (
                            <CheckSquare size={14} className="text-brand-600" />
                          ) : (
                            <Square size={14} />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Nhân viên</th>
                    <th className="px-3 py-2 text-left font-medium">Kỳ</th>
                    <th className="px-3 py-2 text-center font-medium">Điểm</th>
                    <th className="px-3 py-2 text-center font-medium">Xếp loại</th>
                    <th className="px-3 py-2 text-center font-medium">Trạng thái</th>
                    <th className="w-20 px-3 py-2 text-center font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleRecords.map((rec) => {
                    const period = periodMap.get(rec.periodId);
                    const employee = employeeMap.get(rec.employeeId);
                    const isSelected = selectedRecord?.id === rec.id;
                    const isChecked = selectedRecordIds.has(rec.id);
                    const canSelect = rec.status === "SUBMITTED";

                    return (
                      <tr
                        key={rec.id}
                        onClick={() => setSelectedRecordId(rec.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-brand-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-2 py-2.5 text-center">
                          {canSelect && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectOne(rec.id);
                              }}
                              className="text-slate-400 hover:text-brand-600"
                            >
                              {isChecked ? (
                                <CheckSquare size={14} className="text-brand-600" />
                              ) : (
                                <Square size={14} />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                              <User size={12} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-800">
                                {employee?.fullName ?? "N/A"}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {employee?.code ?? ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {period?.name ?? rec.periodId}
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold text-brand-600">
                          {rec.kpiScore.toFixed(1)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`badge ${RANK_COLOR[rec.rank]} text-xs`}>
                            {RANK_LABEL[rec.rank]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`badge ${STATUS_COLOR[rec.status]} text-xs`}>
                            {STATUS_LABEL[rec.status]}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {rec.status === "SUBMITTED" && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveOne(rec);
                                }}
                                disabled={approveMutation.isPending}
                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                title="Duyệt"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRecordId(rec.id);
                                  setShowRejectModal(true);
                                }}
                                className="rounded p-1 text-rose-600 hover:bg-rose-50"
                                title="Trả lại"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="w-80 shrink-0 rounded-xl border border-slate-200 bg-white">
          {selectedRecord ? (
            <div className="flex h-full flex-col">
              {/* Employee header */}
              <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <User size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">
                      {selectedEmployee?.fullName ?? "N/A"}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {selectedEmployee?.code ?? ""} · {selectedEmployee?.position ?? ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`badge ${STATUS_COLOR[selectedRecord.status]} text-xs`}>
                    {STATUS_LABEL[selectedRecord.status]}
                  </span>
                  <span className={`badge ${RANK_COLOR[selectedRecord.rank]} text-xs`}>
                    {RANK_LABEL[selectedRecord.rank]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-400">Điểm</p>
                    <p className="text-lg font-black text-brand-600">{selectedRecord.kpiScore.toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-400">Thưởng</p>
                    <p className="text-lg font-black text-emerald-600">{selectedRecord.bonusPercent}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-400">Kỳ</p>
                    <p className="text-sm font-bold text-slate-700">
                      T{selectedPeriod?.month}/{selectedPeriod?.year}
                    </p>
                  </div>
                </div>
              </div>

              {/* Criteria */}
              <div className="flex-1 overflow-auto px-4 py-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">Tiêu chí</p>
                <div className="space-y-2">
                  {selectedRecord.criteria.map((c) => (
                    <div key={c.criterionId} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-700">{c.name}</p>
                        <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${Math.min(100, (c.total / 100) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-brand-600">{c.total.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              {selectedRecord.status === "SUBMITTED" && (
                <div className="shrink-0 border-t border-slate-100 px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveOne(selectedRecord)}
                      disabled={approveMutation.isPending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Duyệt
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                    >
                      <XCircle size={14} />
                      Trả lại
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <p className="text-sm">Chọn KPI để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal (Single) */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-600" />
              <h2 className="text-base font-bold text-slate-900">Trả lại KPI</h2>
            </div>
            <p className="mb-3 text-sm text-slate-600">
              Nhập lý do trả lại KPI:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Lý do trả lại..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-200"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectOne}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Reject Modal */}
      {showBatchReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-600" />
              <h2 className="text-base font-bold text-slate-900">
                Trả lại {selectedRecordIds.size} KPI
              </h2>
            </div>
            <p className="mb-3 text-sm text-slate-600">
              Nhập lý do trả lại cho tất cả KPI đã chọn:
            </p>
            <textarea
              value={batchRejectReason}
              onChange={(e) => setBatchRejectReason(e.target.value)}
              placeholder="Lý do trả lại..."
              rows={3}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-200"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setShowBatchReject(false);
                  setBatchRejectReason("");
                }}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectSelected}
                disabled={!batchRejectReason.trim() || rejectMutation.isPending}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? "Đang xử lý..." : "Xác nhận trả lại"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
