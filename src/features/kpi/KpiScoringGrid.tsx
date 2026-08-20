import { useMemo, useState } from "react";
import type { Employee, KpiEvent, KpiTemplate } from "@/types";
import { computeCriterionRecord, computeKpiScore, resolveRankAndBonus } from "@/utils/kpiCalculator";
import { useRankingRules } from "@/api/hooks";
import { defaultRankingRules } from "@/utils/kpiCalculator";
import { RANK_COLOR, RANK_LABEL } from "@/utils/labels";
import { Save, Send } from "lucide-react";

interface Props {
  template: KpiTemplate;
  employee: Employee;
  initialEvents: KpiEvent[];
  periodId: string;
  readOnly?: boolean;
  onSubmit: (data: {
    events: KpiEvent[];
    kpiScore: number;
    bonusPercent: number;
    rank: "XUAT_SAC" | "TOT" | "DAT" | "CAN_CAI_THIEN";
  }) => Promise<void>;
}

export function KpiScoringGrid({
  template,
  employee,
  initialEvents,
  readOnly,
  onSubmit,
}: Props) {
  const [events, setEvents] = useState<KpiEvent[]>(initialEvents);
  const [submitting, setSubmitting] = useState(false);
  const { data: rankingRules } = useRankingRules();
  const rules = rankingRules ?? defaultRankingRules();

  const criteriaRecords = useMemo(
    () =>
      template.criteria.map((c) =>
        computeCriterionRecord(
          c,
          events.filter((e) => {
            const rule = c.rules.find((r) => r.code === e.ruleCode);
            return !!rule;
          }),
          template.maxScorePerCriterion,
        ),
      ),
    [template, events],
  );

  const kpiScore = computeKpiScore(criteriaRecords);
  const { bonusPercent, rank } = resolveRankAndBonus(kpiScore, rules);

  function applyRule(criterionId: string, ruleCode: string, points: number, type: "ADD" | "SUBTRACT", day: number, note?: string) {
    void criterionId;
    setEvents((prev) => [
      ...prev,
      {
        date: day,
        ruleCode,
        points: type === "SUBTRACT" ? -Math.abs(points) : Math.abs(points),
        note: note ?? ruleCode,
        createdBy: employee.id,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function removeEvent(idx: number) {
    setEvents((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(action: "save" | "submit") {
    setSubmitting(true);
    try {
      await onSubmit({
        events: action === "save" ? events : events,
        kpiScore,
        bonusPercent,
        rank,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{employee.fullName}</h2>
          <p className="text-sm text-slate-500">
            {employee.code} · {employee.department}
            {employee.program ? ` · Chương trình ${employee.program}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-slate-500">Tổng KPI</p>
            <p className="text-3xl font-bold text-brand-700">{kpiScore.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">% Thưởng</p>
            <p className="text-2xl font-semibold">{bonusPercent}%</p>
          </div>
          <span className={`badge ${RANK_COLOR[rank]}`}>{RANK_LABEL[rank]}</span>
        </div>
      </div>

      <div className="space-y-6">
        {template.criteria.map((criterion, ci) => {
          const record = criteriaRecords[ci];
          return (
            <div key={criterion.id} className="card">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{criterion.name}</h3>
                  <p className="text-xs text-slate-500">
                    Trọng số {Math.round(criterion.weight * 100)}% · Cap {template.maxScorePerCriterion} điểm
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Tổng tiêu chí</p>
                  <p className="text-xl font-semibold text-brand-700">
                    {record?.total.toFixed(1) ?? "100.0"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="px-2 py-1 text-left">Ngày</th>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <th key={d} className="px-2 py-1 text-center font-medium">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1 font-medium">Điểm</td>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                        const v = record?.dailyScores[d] ?? 0;
                        return (
                          <td
                            key={d}
                            className={`px-1 py-1 text-center ${v > 0 ? "bg-emerald-50 text-emerald-700" : v < 0 ? "bg-rose-50 text-rose-700" : "text-slate-400"}`}
                          >
                            {v === 0 ? "" : v > 0 ? `+${v}` : v}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {!readOnly && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-slate-500">Áp dụng quy tắc:</p>
                  <div className="flex flex-wrap gap-2">
                    {criterion.rules.map((rule) => (
                      <RuleButton
                        key={rule.code}
                        rule={rule}
                        onApply={(day) =>
                          applyRule(criterion.id, rule.code, rule.points, rule.type, day)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500">Sự kiện đã ghi:</p>
                {record?.events.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-400">Chưa có.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-xs">
                    {record?.events.map((ev, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1">
                        <span>
                          Ngày {ev.date} · {ev.note} ({ev.points > 0 ? `+${ev.points}` : ev.points})
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeEvent(events.indexOf(ev))}
                            className="text-rose-600 hover:underline"
                          >
                            Xóa
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="btn-secondary"
            disabled={submitting}
            onClick={() => void handleSubmit("save")}
          >
            <Save size={16} />
            Lưu nháp
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={submitting}
            onClick={() => void handleSubmit("submit")}
          >
            <Send size={16} />
            Gửi duyệt
          </button>
        </div>
      )}
    </div>
  );
}

function RuleButton({
  rule,
  onApply,
}: {
  rule: { code: string; label: string; type: "ADD" | "SUBTRACT"; points: number };
  onApply: (day: number) => void;
}) {
  const today = new Date().getDate();
  return (
    <button
      type="button"
      onClick={() => onApply(today)}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 ${
        rule.type === "SUBTRACT"
          ? "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100"
          : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
      }`}
      title={rule.label}
    >
      {rule.type === "SUBTRACT" ? "" : "+"}{rule.points}đ · {rule.label}
    </button>
  );
}