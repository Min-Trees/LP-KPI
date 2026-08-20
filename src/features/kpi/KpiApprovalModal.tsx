import { useState } from "react";
import {
  X,
  ThumbsUp,
  ThumbsDown,
  Check,
  FileText,
  Clock,
} from "lucide-react";
import type { KpiRecord } from "@/types";
import { formatDateTime } from "@/utils";

interface Props {
  record: KpiRecord;
  employeeName: string;
  periodLabel: string;
  onClose: () => void;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export function KpiApprovalModal({
  record,
  employeeName,
  periodLabel,
  onClose,
  onApprove,
  onReject,
}: Props) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingReject, setSubmittingReject] = useState(false);

  async function handleApprove() {
    setSubmitting(true);
    try {
      await onApprove();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setSubmittingReject(true);
    try {
      await onReject(rejectReason.trim());
    } finally {
      setSubmittingReject(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <FileText size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Duyệt KPI</h2>
              <p className="text-xs text-slate-500">{periodLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Employee info */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-800">{employeeName}</p>
              <p className="text-xs text-slate-500">Kỳ {periodLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-brand-600">{record.kpiScore.toFixed(1)}</p>
              <p className="text-xs text-slate-500">Điểm KPI</p>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Điểm</p>
              <p className="text-lg font-black text-brand-600">{record.kpiScore.toFixed(1)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">% Thưởng</p>
              <p className="text-lg font-bold text-emerald-600">{record.bonusPercent}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Xếp loại</p>
              <p className="text-sm font-bold text-slate-700">{record.rank.replace("_", " ")}</p>
            </div>
          </div>

          {/* Events count */}
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>
                +{record.criteria
                  .flatMap((c) => c.events)
                  .filter((e) => e.points > 0)
                  .reduce((a, e) => a + e.points, 0)} điểm thưởng
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>
                {record.criteria
                  .flatMap((c) => c.events)
                  .filter((e) => e.points < 0)
                  .reduce((a, e) => a + e.points, 0)} điểm phạt
              </span>
            </div>
          </div>

          {/* Submitted info */}
          {record.submittedAt && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Clock size={12} />
              <span>Đã gửi duyệt lúc {formatDateTime(record.submittedAt)}</span>
            </div>
          )}

          {/* Reject reason form */}
          {showRejectForm && (
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-slate-600">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối để người chấm biết và chỉnh sửa lại..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Hủy
          </button>

          {!showRejectForm ? (
            <>
              <button
                onClick={() => setShowRejectForm(true)}
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100"
              >
                <ThumbsDown size={16} />
                Từ chối
              </button>
              <button
                onClick={() => void handleApprove()}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
              >
                <ThumbsUp size={16} />
                Duyệt đồng ý
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectReason("");
                }}
                className="btn-secondary"
              >
                Quay lại
              </button>
              <button
                onClick={() => void handleReject()}
                disabled={submittingReject || !rejectReason.trim()}
                className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-600 disabled:opacity-50"
              >
                <ThumbsDown size={16} />
                Gửi từ chối
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
