import { useMemo, useState, useEffect } from "react";
import type { Employee, KpiEvent, KpiTemplate, KpiRecord } from "@/types";
import { computeCriterionRecord, computeKpiScore, resolveRankAndBonus } from "@/utils/kpiCalculator";
import { useRankingRules } from "@/api/hooks";
import { defaultRankingRules } from "@/utils/kpiCalculator";
import { RANK_COLOR, RANK_LABEL } from "@/utils/labels";
import { X, Save, Send, ChevronLeft, ChevronRight, Check, Plus } from "lucide-react";
import { STATUS_LABEL, STATUS_COLOR } from "@/utils/labels";

interface Props {
  template: KpiTemplate;
  employee: Employee | null;
  record: KpiRecord | null;
  periodId: string;
  open: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (data: {
    events: KpiEvent[];
    kpiScore: number;
    bonusPercent: number;
    rank: "XUAT_SAC" | "TOT" | "DAT" | "CAN_CAI_THIEN";
  }) => Promise<void>;
}

export function KpiScoringPanel({
  template,
  employee,
  record,
  open,
  readOnly,
  onClose,
  onSave,
}: Props) {
  const [events, setEvents] = useState<KpiEvent[]>(record?.criteria.flatMap((c) => c.events) ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [activeCriterionIdx, setActiveCriterionIdx] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const { data: rankingRules } = useRankingRules();
  const rules = rankingRules ?? defaultRankingRules();

  // Reset when employee changes
  useEffect(() => {
    setEvents(record?.criteria.flatMap((c) => c.events) ?? []);
    setActiveCriterionIdx(0);
    setShowConfirmSubmit(false);
  }, [employee?.id, record?.id]);

  const criteriaRecords = useMemo(
    () =>
      template.criteria.map((c) =>
        computeCriterionRecord(
          c,
          events.filter((e) => !!c.rules.find((r) => r.code === e.ruleCode)),
          template.maxScorePerCriterion,
        ),
      ),
    [template, events],
  );

  const kpiScore = computeKpiScore(criteriaRecords);
  const { bonusPercent, rank } = resolveRankAndBonus(kpiScore, rules);

  const today = new Date().getDate();

  function applyRule(
    criterionId: string,
    ruleCode: string,
    points: number,
    type: "ADD" | "SUBTRACT",
    day: number,
    note?: string,
  ) {
    setEvents((prev) => [
      ...prev,
      {
        date: day,
        ruleCode,
        points: type === "SUBTRACT" ? -Math.abs(points) : Math.abs(points),
        note: note ?? ruleCode,
        createdBy: employee?.id ?? "unknown",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function removeEvent(idx: number) {
    setEvents((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      await onSave({ events, kpiScore, bonusPercent, rank });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSave({ events, kpiScore, bonusPercent, rank });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const activeCriterion = template.criteria[activeCriterionIdx];
  const activeRecord = criteriaRecords[activeCriterionIdx];

  // events for current criterion
  const criterionEvents = events.filter(
    (e) => !!activeCriterion.rules.find((r) => r.code === e.ruleCode),
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl sm:w-[480px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {employee?.fullName ?? "—"}
            </h2>
            <p className="text-xs text-slate-500">
              {employee?.code} · {employee?.department}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* KPI Summary Strip */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-4 text-sm">
            {record && (
              <span className={`badge ${STATUS_COLOR[record.status]}`}>
                {STATUS_LABEL[record.status]}
              </span>
            )}
            <span className="text-xs text-slate-500">
              Điểm chuẩn: <b className="text-slate-700">{template.criteria.length} tiêu chí</b>
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Điểm KPI</p>
              <p className="text-lg font-bold text-brand-700">{kpiScore.toFixed(1)}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <p className="text-[10px] text-slate-500">% Thưởng</p>
              <p className="text-lg font-semibold text-slate-700">{bonusPercent}%</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <span className={`badge ${RANK_COLOR[rank]} text-xs`}>
              {RANK_LABEL[rank]}
            </span>
          </div>
        </div>

        {/* Criterion Tabs */}
        <div className="flex gap-1 border-b border-slate-200 bg-white px-5 pt-3">
          {template.criteria.map((c, i) => {
            const rec = criteriaRecords[i];
            const hasEvents = events.some((e) =>
              c.rules.find((r) => r.code === e.ruleCode),
            );
            return (
              <button
                key={c.id}
                onClick={() => setActiveCriterionIdx(i)}
                className={`flex flex-col items-center gap-0.5 rounded-t-md border-x border-t px-4 py-2 text-xs font-medium transition-colors ${
                  activeCriterionIdx === i
                    ? "border-slate-200 bg-white text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="max-w-[120px] truncate">{c.name}</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold">{rec?.total.toFixed(0) ?? 100}</span>
                  <span className="text-slate-400">({Math.round(c.weight * 100)}%)</span>
                  {hasEvents && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Criterion Info */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">{activeCriterion.name}</p>
                <p className="text-xs text-slate-500">
                  Trọng số {Math.round(activeCriterion.weight * 100)}% · Cáp {template.maxScorePerCriterion} điểm
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Điểm tiêu chí</p>
                <p className="text-2xl font-bold text-brand-700">
                  {activeRecord?.total.toFixed(1) ?? "100.0"}
                </p>
              </div>
            </div>
          </div>

          {/* Rule Buttons */}
          {!readOnly && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wide">
                Áp dụng quy tắc cho ngày hôm nay ({today})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activeCriterion.rules.map((rule) => {
                  const alreadyApplied = events.some(
                    (e) => e.ruleCode === rule.code && e.date === today,
                  );
                  return (
                    <button
                      key={rule.code}
                      onClick={() =>
                        applyRule(
                          activeCriterion.id,
                          rule.code,
                          rule.points,
                          rule.type,
                          today,
                          rule.label,
                        )
                      }
                      disabled={alreadyApplied}
                      title={
                        alreadyApplied
                          ? "Đã áp dụng hôm nay"
                          : rule.label
                      }
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 transition-all ${
                        alreadyApplied
                          ? "cursor-default bg-slate-100 text-slate-400 ring-slate-200"
                          : rule.type === "SUBTRACT"
                            ? "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {rule.type === "SUBTRACT" ? "" : "+"}{rule.points}đ
                      {alreadyApplied && <Check size={10} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Score Summary Table */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wide">
              Bảng điểm tháng
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                    <th className="px-2 py-1.5 text-center font-semibold">Ngày</th>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <th
                        key={d}
                        className={`px-1 py-1.5 text-center font-medium ${
                          d === today ? "bg-brand-100 text-brand-700" : ""
                        }`}
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-center">
                    <td className="px-2 py-1 text-left font-medium text-slate-600">Điểm</td>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                      const ev = criterionEvents.filter((e) => e.date === d);
                      const sum = ev.reduce((a, e) => a + e.points, 0);
                      return (
                        <td
                          key={d}
                          className={`px-1 py-1.5 text-center ${
                            d === today ? "bg-brand-50" : ""
                          } ${
                            sum > 0
                              ? "bg-emerald-50 text-emerald-700 font-semibold"
                              : sum < 0
                                ? "bg-rose-50 text-rose-700 font-semibold"
                                : "text-slate-300"
                          }`}
                        >
                          {sum === 0 ? "" : sum > 0 ? `+${sum}` : sum}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Event Log */}
          {criterionEvents.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500 tracking-wide">
                Sự kiện đã ghi ({criterionEvents.length})
              </p>
              <div className="space-y-1.5">
                {criterionEvents.map((ev, idx) => {
                  const rule = activeCriterion.rules.find((r) => r.code === ev.ruleCode);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                        ev.points > 0 ? "bg-emerald-50" : "bg-rose-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-1.5 py-0.5 font-bold ${
                            ev.points > 0
                              ? "bg-emerald-200 text-emerald-800"
                              : "bg-rose-200 text-rose-800"
                          }`}
                        >
                          {ev.points > 0 ? `+${ev.points}` : ev.points}đ
                        </span>
                        <div>
                          <p className="font-medium text-slate-700">{rule?.label ?? ev.ruleCode}</p>
                          <p className="text-slate-400">Ngày {ev.date}</p>
                        </div>
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => {
                            const globalIdx = events.findIndex(
                              (e) => e.date === ev.date && e.ruleCode === ev.ruleCode,
                            );
                            if (globalIdx >= 0) removeEvent(globalIdx);
                          }}
                          className="rounded-md p-1 text-rose-500 hover:bg-rose-100"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!readOnly && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-4">
            {/* Criterion navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveCriterionIdx((i) => Math.max(0, i - 1))}
                disabled={activeCriterionIdx === 0}
                className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft size={12} />
                Trước
              </button>
              <span className="text-xs text-slate-500">
                {activeCriterionIdx + 1} / {template.criteria.length}
              </span>
              <button
                onClick={() =>
                  setActiveCriterionIdx((i) =>
                    Math.min(template.criteria.length - 1, i + 1),
                  )
                }
                disabled={activeCriterionIdx === template.criteria.length - 1}
                className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
              >
                Sau
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Save / Submit */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleSave()}
                disabled={submitting}
                className="btn-secondary text-sm"
              >
                <Save size={14} />
                Lưu nháp
              </button>
              {!showConfirmSubmit ? (
                <button
                  onClick={() => setShowConfirmSubmit(true)}
                  disabled={submitting}
                  className="btn-primary text-sm"
                >
                  <Send size={14} />
                  Gửi duyệt
                </button>
              ) : (
                <button
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Xác nhận gửi
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
