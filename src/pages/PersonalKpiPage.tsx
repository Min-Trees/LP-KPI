import { useMemo, useState } from "react";
import {
  TrendingUp,
  Award,
  Clock,
  FileText,
  BarChart3,
  Target,
  Download,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useEmployeeKpiRecords, useKpiPeriods } from "@/api/hooks";
import { useRankingRules } from "@/api/hooks";
import { defaultRankingRules } from "@/utils/kpiCalculator";
import { RANK_COLOR, RANK_LABEL } from "@/utils/labels";
import { STATUS_COLOR, STATUS_LABEL } from "@/utils/labels";
import { formatDate } from "@/utils";
import type { KpiEvent } from "@/types";

export default function PersonalKpiPage() {
  const { appUser } = useAuth();
  const { data: records = [], isLoading } = useEmployeeKpiRecords(appUser?.uid);
  const { data: periods = [] } = useKpiPeriods();
  const { data: rankingRules } = useRankingRules();
  const rules = rankingRules ?? defaultRankingRules();

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const periodMap = useMemo(
    () => new Map(periods.map((p) => [p.id, p])),
    [periods],
  );

  const selectedRecord = records.find((r) => r.id === selectedRecordId) ?? records[0];
  const selectedPeriod = selectedRecord ? periodMap.get(selectedRecord.periodId) : null;

  // Stats
  const totalRecords = records.length;
  const approvedRecords = records.filter((r) => r.status === "APPROVED");
  const avgScore = approvedRecords.length > 0
    ? approvedRecords.reduce((a, r) => a + r.kpiScore, 0) / approvedRecords.length
    : 0;
  const avgBonus = approvedRecords.length > 0
    ? approvedRecords.reduce((a, r) => a + r.bonusPercent, 0) / approvedRecords.length
    : 0;

  const rankCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) {
      counts[r.rank] = (counts[r.rank] ?? 0) + 1;
    }
    return counts;
  }, [records]);

  /**
   * Nhân viên tự xuất lịch sử chấm điểm của mình ra CSV
   * — mỗi dòng 1 sự kiện, kèm kỳ + điểm + xếp loại.
   */
  function exportPersonalCsv() {
    if (records.length === 0) return;
    const headers = [
      "STT", "Kỳ", "Từ ngày", "Đến ngày", "Tiêu chí", "Trọng số (%)",
      "Ngày", "Mã rule", "Mô tả", "Loại", "Điểm", "Trạng thái kỳ",
    ];
    const rows: string[][] = [headers];
    let stt = 1;
    records
      .slice()
      .sort((a, b) => b.periodId.localeCompare(a.periodId))
      .forEach((rec) => {
        const period = periodMap.get(rec.periodId);
        rec.criteria.forEach((crit) => {
          if (crit.events.length === 0) {
            rows.push([
              String(stt++),
              period?.name ?? rec.periodId,
              period ? formatDate(period.startDate) : "",
              period ? formatDate(period.endDate) : "",
              crit.name,
              String(Math.round(crit.weight * 100)),
              "", "", "", "", "",
              STATUS_LABEL[rec.status],
            ]);
            return;
          }
          crit.events.forEach((ev: KpiEvent) => {
            const rule = (rec.criteria.find((c) => c.criterionId === crit.criterionId) ?? crit);
            rows.push([
              String(stt++),
              period?.name ?? rec.periodId,
              period ? formatDate(period.startDate) : "",
              period ? formatDate(period.endDate) : "",
              crit.name,
              String(Math.round(crit.weight * 100)),
              String(ev.date),
              ev.ruleCode,
              ev.note ?? "",
              ev.points >= 0 ? "Thưởng" : "Phạt",
              String(ev.points),
              STATUS_LABEL[rec.status],
            ]);
            void rule;
          });
        });
        // Dòng tổng kết kỳ
        rows.push([]);
        rows.push([
          "TỔNG KỲ",
          period?.name ?? rec.periodId,
          "", "", "", "", "", "", "", "",
          `${rec.kpiScore.toFixed(2)} điểm · ${RANK_LABEL[rec.rank]} · ${rec.bonusPercent}%`,
          STATUS_LABEL[rec.status],
        ]);
      });
    const csvContent = rows.map((r) => r.map((c) => {
      const s = String(c ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const u = appUser ?? {};
    const safe = (u.email ?? "me").replace(/[^a-z0-9]/gi, "_");
    link.download = `KPI_CaNhan_${safe}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KPI Cá nhân</h1>
          <p className="text-sm text-slate-500">
            Theo dõi lịch sử chấm điểm KPI của bạn qua các kỳ
          </p>
        </div>
        {records.length > 0 && (
          <button
            onClick={exportPersonalCsv}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            title="Tải toàn bộ lịch sử KPI của bạn ra file CSV"
          >
            <Download size={15} />
            Xuất dữ liệu
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
            <FileText size={22} className="text-brand-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{totalRecords}</p>
            <p className="text-xs text-slate-500">Kỳ đã chấm</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <TrendingUp size={22} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{avgScore.toFixed(1)}</p>
            <p className="text-xs text-slate-500">Điểm TB</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
            <Award size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{avgBonus}%</p>
            <p className="text-xs text-slate-500">% Thưởng TB</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <Target size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {rankCounts["XUAT_SAC"] ?? 0}
            </p>
            <p className="text-xs text-slate-500">Kỳ Xuất sắc</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col gap-5 lg:flex-row">

        {/* Record list */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="card p-0">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Lịch sử chấm điểm
              </p>
            </div>
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <BarChart3 size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Chưa có KPI nào</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
                {records.map((rec) => {
                  const period = periodMap.get(rec.periodId);
                  const isSelected = selectedRecord?.id === rec.id;
                  return (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedRecordId(rec.id)}
                      className={`w-full text-left px-4 py-3.5 transition-colors ${
                        isSelected
                          ? "bg-brand-50 ring-2 ring-brand-400 ring-inset"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {period?.name ?? rec.periodId}
                          </p>
                          {period && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {formatDate(period.startDate)} — {formatDate(period.endDate)}
                            </p>
                          )}
                        </div>
                        <span className={`badge ${STATUS_COLOR[rec.status]}`}>
                          {STATUS_LABEL[rec.status]}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Điểm KPI</span>
                            <span className="font-bold text-brand-600">{rec.kpiScore.toFixed(1)}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-brand-500"
                              style={{
                                width: `${Math.min(100, (rec.kpiScore / rules.bands[0].max) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className={`badge ${RANK_COLOR[rec.rank]} shrink-0`}>
                          {RANK_LABEL[rec.rank]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Record detail */}
        <div className="flex-1">
          {selectedRecord ? (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {selectedPeriod?.name ?? "Kỳ không xác định"}
                    </p>
                    <span className={`badge mt-2 ${STATUS_COLOR[selectedRecord.status]}`}>
                      {STATUS_LABEL[selectedRecord.status]}
                    </span>
                  </div>
                  {selectedRecord.note && (
                    <div className="max-w-xs rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <p className="text-xs text-amber-700">{selectedRecord.note}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Điểm KPI</p>
                    <p className="mt-1 text-3xl font-black text-brand-600">
                      {selectedRecord.kpiScore.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">% Thưởng</p>
                    <p className="mt-1 text-3xl font-black text-emerald-600">
                      {selectedRecord.bonusPercent}%
                    </p>
                  </div>
                  <div className="text-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Xếp loại</p>
                    <p className="mt-1">
                      <span className={`badge ${RANK_COLOR[selectedRecord.rank]} text-lg`}>
                        {RANK_LABEL[selectedRecord.rank]}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Approval info */}
                {(selectedRecord.approvedAt || selectedRecord.submittedAt) && (
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    {selectedRecord.submittedAt && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} />
                        <span>Gửi duyệt: {formatDate(selectedRecord.submittedAt)}</span>
                      </div>
                    )}
                    {selectedRecord.approvedAt && (
                      <div className="flex items-center gap-1.5">
                        <Award size={13} />
                        <span>Duyệt: {formatDate(selectedRecord.approvedAt)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Criteria breakdown */}
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Chi tiết theo tiêu chí</h3>
                <div className="space-y-3">
                  {selectedRecord.criteria.map((criterion) => (
                    <div
                      key={criterion.criterionId}
                      className="flex items-center gap-4"
                    >
                      <div className="w-36 shrink-0">
                        <p className="text-sm font-semibold text-slate-700">{criterion.name}</p>
                        <p className="text-xs text-slate-400">{Math.round(criterion.weight * 100)}%</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>{criterion.events.length} sự kiện</span>
                          <span className="font-bold text-brand-600">{criterion.total.toFixed(0)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{
                              width: `${Math.min(100, (criterion.total / 100) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-14 text-right text-xs font-semibold text-slate-500">
                        /{selectedRecord.criteria.length * 100}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events summary */}
              <div className="card p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Tóm tắt sự kiện</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-600" />
                      <p className="text-xs font-semibold text-emerald-700">Thưởng</p>
                    </div>
                    <p className="mt-1 text-xl font-black text-emerald-700">
                      +{selectedRecord.criteria
                        .flatMap((c) => c.events)
                        .filter((e) => e.points > 0)
                        .reduce((a, e) => a + e.points, 0)}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {selectedRecord.criteria
                        .flatMap((c) => c.events)
                        .filter((e) => e.points > 0).length} sự kiện
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-rose-600 rotate-180" />
                      <p className="text-xs font-semibold text-rose-700">Phạt</p>
                    </div>
                    <p className="mt-1 text-xl font-black text-rose-700">
                      {selectedRecord.criteria
                        .flatMap((c) => c.events)
                        .filter((e) => e.points < 0)
                        .reduce((a, e) => a + e.points, 0)}
                    </p>
                    <p className="text-xs text-rose-600">
                      {selectedRecord.criteria
                        .flatMap((c) => c.events)
                        .filter((e) => e.points < 0).length} sự kiện
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-20 text-slate-400">
              <BarChart3 size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Chưa có dữ liệu KPI</p>
              <p className="mt-1 text-xs text-slate-400">
                KPI của bạn sẽ xuất hiện sau khi được chấm điểm
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
