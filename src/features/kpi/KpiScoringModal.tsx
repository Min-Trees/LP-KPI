import { useMemo, useState, useEffect } from "react";
import type { Employee, KpiEvent, KpiTemplate, KpiRecord } from "@/types";
import { computeCriterionRecord, computeKpiScore, resolveRankAndBonus } from "@/utils/kpiCalculator";
import { useRankingRules } from "@/api/hooks";
import { defaultRankingRules } from "@/utils/kpiCalculator";
import { RANK_COLOR, RANK_LABEL } from "@/utils/labels";
import { generateId } from "@/utils";
import { X, Save, Send, ChevronLeft, ChevronRight, Check, Plus, Minus, Calendar, Download } from "lucide-react";
import { STATUS_LABEL, STATUS_COLOR } from "@/utils/labels";

interface Props {
  template: KpiTemplate;
  employee: Employee | null;
  record: KpiRecord | null;
  periodId: string;
  periodDays: number;
  open: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (data: {
    events: KpiEvent[];
    kpiScore: number;
    bonusPercent: number;
    rank: "XUAT_SAC" | "TOT" | "DAT" | "CAN_CAI_THIEN";
  }) => Promise<void>;
  onSubmit?: (recordId: string) => Promise<void>;
}

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_NAMES = [
  "Tháng 01", "Tháng 02", "Tháng 03", "Tháng 04", "Tháng 05", "Tháng 06",
  "Tháng 07", "Tháng 08", "Tháng 09", "Tháng 10", "Tháng 11", "Tháng 12",
];

export function KpiScoringModal({
  template,
  employee,
  record,
  periodDays: _periodDays,
  open,
  readOnly,
  onClose,
  onSave,
  onSubmit,
}: Props) {
  const [events, setEvents] = useState<KpiEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const { data: rankingRules } = useRankingRules();
  const rules = rankingRules ?? defaultRankingRules();

  // Pre-generate record ID so Submit button works even before first save
  const pendingRecordId = record?.id ?? generateId("rec");

  // Track save state for Submit button
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasEverSaved, setHasEverSaved] = useState(false);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  useEffect(() => {
    setEvents(record?.criteria.flatMap((c) => c.events) ?? []);
    setSelectedDay(null);
    setSelectedCriterionId(template.criteria[0]?.id ?? null);
    setHasUnsavedChanges(false);
    setHasEverSaved(!!record);
  }, [employee?.id, record?.id]);

  // Auto-select first criterion
  useEffect(() => {
    if (!selectedCriterionId && template.criteria[0]) {
      setSelectedCriterionId(template.criteria[0].id);
    }
  }, [template.criteria, selectedCriterionId]);

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

  // Calendar data
  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const cells: Array<{ day: number | null }> = [];
    for (let i = 0; i < startOffset; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
    return cells;
  }, [calYear, calMonth]);

  function dayScore(day: number) {
    return events.filter((e) => e.date === day).reduce((a, e) => a + e.points, 0);
  }
  function dayStatus(day: number) {
    const dayEvents = events.filter((e) => e.date === day);
    if (dayEvents.length === 0) return "empty";
    const hasPenalty = dayEvents.some((e) => e.points < 0);
    const hasReward = dayEvents.some((e) => e.points > 0);
    if (hasPenalty && !hasReward) return "penalty";
    if (hasReward && !hasPenalty) return "reward";
    return "mixed";
  }

  function toggleRule(
    ruleCode: string,
    points: number,
    type: "ADD" | "SUBTRACT",
    day: number,
    note?: string,
  ) {
    const existing = events.findIndex((e) => e.date === day && e.ruleCode === ruleCode);
    if (existing >= 0) {
      setEvents((prev) => prev.filter((_, i) => i !== existing));
    } else {
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
    setHasUnsavedChanges(true);
  }

  async function handleSave(submit = false) {
    setSubmitting(true);
    try {
      await onSave({ events, kpiScore, bonusPercent, rank });
      setHasUnsavedChanges(false);
      setHasEverSaved(true);
      if (submit) {
        // Submit to approval flow
        if (onSubmit) {
          await onSubmit(record?.id ?? pendingRecordId);
        }
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Xuất toàn bộ dữ liệu chấm điểm của nhân viên ra file CSV
   * Mỗi dòng = 1 sự kiện, kèm tiêu chí + ngày + điểm + ghi chú
   * Nhân viên có thể tự tải về để lưu trữ / đối chiếu.
   */
  function handleExportCSV() {
    if (!employee) return;

    const rows: string[][] = [];
    rows.push([
      "STT",
      "Mã NV",
      "Họ tên",
      "Cơ sở",
      "Phòng ban",
      "Tiêu chí",
      "Trọng số (%)",
      "Ngày",
      "Mã rule",
      "Mô tả",
      "Loại",
      "Điểm",
      "Ghi chú",
      "Trạng thái Record",
    ]);

    let stt = 1;
    template.criteria.forEach((criterion) => {
      const critEvents = events.filter((e) =>
        criterion.rules.some((r) => r.code === e.ruleCode),
      );
      if (critEvents.length === 0) {
        // vẫn liệt kê tiêu chí dù không có sự kiện
        rows.push([
          String(stt++),
          employee.code ?? "",
          employee.fullName,
          employee.branch ?? "",
          employee.department ?? "",
          criterion.name,
          String(Math.round(criterion.weight * 100)),
          "",
          "",
          "",
          "",
          "",
          "Không có sự kiện",
          STATUS_LABEL[(record?.status as keyof typeof STATUS_LABEL) ?? "IN_PROGRESS"],
        ]);
      } else {
        critEvents
          .sort((a, b) => a.date - b.date)
          .forEach((ev) => {
            const rule = criterion.rules.find((r) => r.code === ev.ruleCode);
            rows.push([
              String(stt++),
              employee.code ?? "",
              employee.fullName,
              employee.branch ?? "",
              employee.department ?? "",
              criterion.name,
              String(Math.round(criterion.weight * 100)),
              String(ev.date),
              ev.ruleCode,
              rule?.label ?? "",
              (ev.points >= 0 ? "Thưởng" : "Phạt"),
              String(ev.points),
              ev.note ?? "",
              STATUS_LABEL[(record?.status as keyof typeof STATUS_LABEL) ?? "IN_PROGRESS"],
            ]);
          });
      }
    });

    // Tổng kết dòng cuối
    rows.push([]);
    rows.push([
      "TỔNG",
      employee.code ?? "",
      employee.fullName,
      "",
      "",
      template.criteria.length + " tiêu chí",
      "",
      "",
      events.length + " sự kiện",
      "",
      "",
      `${kpiScore.toFixed(2)} điểm`,
      `Xếp loại: ${RANK_LABEL[rank]} · Thưởng: ${bonusPercent}%`,
      `Ngày xuất: ${new Date().toLocaleString("vi-VN")}`,
    ]);

    const csvContent = rows.map((r) =>
      r.map((cell) => {
        const s = String(cell ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","),
    ).join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (employee.fullName ?? "nhan-vien").replace(/\s+/g, "_");
    const month = calMonth + 1;
    link.download = `KPI_${employee.code ?? "nv"}_${safeName}_T${month}-${calYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  const selectedCriterion = template.criteria.find((c) => c.id === selectedCriterionId);
  const selectedDayEvents = selectedDay != null
    ? events.filter((e) => e.date === selectedDay)
    : [];
  const selectedDayCriterionEvents = selectedDay != null && selectedCriterion != null
    ? events.filter((e) =>
        e.date === selectedDay && selectedCriterion.rules.some((r) => r.code === e.ruleCode),
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex h-[95vh] w-[96vw] flex-col rounded-2xl bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-3">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{employee?.fullName}</h2>
              <p className="text-xs text-slate-500">
                {employee?.code} · {employee?.department}
              </p>
            </div>
            {record?.status ? (
              <span className={`badge ${STATUS_COLOR[record.status]}`}>
                {STATUS_LABEL[record.status]}
              </span>
            ) : hasUnsavedChanges ? (
              <span className="badge bg-amber-100 text-amber-700">Chưa lưu</span>
            ) : (
              <span className="badge bg-slate-100 text-slate-500">Mới</span>
            )}
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Điểm KPI</p>
              <p className="text-2xl font-black text-brand-600">{kpiScore.toFixed(1)}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">% Thưởng</p>
              <p className="text-xl font-bold text-slate-700">{bonusPercent}%</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-slate-400">Xếp loại</p>
              <span className={`badge ${RANK_COLOR[rank]} text-sm`}>{RANK_LABEL[rank]}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body: 3 columns ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Column 1: Mini Calendar (200px) ── */}
          <div className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-slate-50">

            {/* Month nav */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <button
                onClick={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                  else setCalMonth(m => m - 1);
                }}
                className="rounded p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-slate-700">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                onClick={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                  else setCalMonth(m => m + 1);
                }}
                className="rounded p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 px-2 pt-2">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-[9px] font-semibold text-slate-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid flex-1 grid-cols-7 gap-0.5 px-2 pb-2">
              {calDays.map((cell, idx) => {
                if (cell.day === null) return <div key={`e-${idx}`} />;
                const status = dayStatus(cell.day);
                const isSelected = selectedDay === cell.day;
                const isToday = today.getDate() === cell.day
                  && today.getMonth() === calMonth
                  && today.getFullYear() === calYear;
                return (
                  <button
                    key={cell.day}
                    onClick={() => setSelectedDay(cell.day)}
                    className={`aspect-square flex items-center justify-center rounded text-[10px] font-semibold transition-all ${
                      isSelected
                        ? "bg-brand-600 text-white shadow-sm"
                        : isToday
                          ? "bg-brand-100 text-brand-700"
                          : status === "penalty"
                            ? "bg-rose-200 text-rose-700"
                            : status === "reward"
                              ? "bg-emerald-200 text-emerald-700"
                              : status === "mixed"
                                ? "bg-amber-200 text-amber-700"
                                : "text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="border-t border-slate-200 px-3 py-2.5 space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Màu sắc</p>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded bg-emerald-200 ring-1 ring-emerald-300 shrink-0" />
                <span className="text-[10px] text-slate-500">Thưởng (+)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded bg-rose-200 ring-1 ring-rose-300 shrink-0" />
                <span className="text-[10px] text-slate-500">Phạt (−)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded bg-amber-200 ring-1 ring-amber-300 shrink-0" />
                <span className="text-[10px] text-slate-500">Cả hai</span>
              </div>
            </div>
          </div>

          {/* ── Column 2: Criteria List (260px) ── */}
          <div className="flex w-64 shrink-0 flex-col border-r border-slate-200 overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-2.5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tiêu chí · {template.criteria.length} mục
              </p>
            </div>

            {template.criteria.map((criterion, ci) => {
              const rec = criteriaRecords[ci];
              const eventCount = events.filter((e) =>
                criterion.rules.some((r) => r.code === e.ruleCode),
              ).length;
              const isActive = selectedCriterionId === criterion.id;
              const hasEventsOnSelectedDay = selectedDay != null && events.some(
                (e) => e.date === selectedDay && criterion.rules.some((r) => r.code === e.ruleCode),
              );

              return (
                <button
                  key={criterion.id}
                  onClick={() => setSelectedCriterionId(criterion.id)}
                  className={`w-full text-left border-b border-slate-100 px-4 py-3 transition-all ${
                    isActive
                      ? "bg-brand-50 ring-2 ring-brand-400 ring-inset"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Criterion name */}
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold leading-tight ${isActive ? "text-brand-700" : "text-slate-800"}`}>
                      {criterion.name}
                    </p>
                    {hasEventsOnSelectedDay && (
                      <span className="shrink-0 rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        ●
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <p className="mt-1 text-[10px] text-slate-400">
                    {Math.round(criterion.weight * 100)}% · max {template.maxScorePerCriterion}
                  </p>

                  {/* Stats */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{eventCount} sự kiện</span>
                    <span className={`text-lg font-black ${isActive ? "text-brand-600" : "text-slate-600"}`}>
                      {rec?.total.toFixed(0) ?? 100}
                    </span>
                  </div>

                  {/* Mini progress bar */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${((rec?.total ?? 100) / template.maxScorePerCriterion) * 100}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Column 3: Main Content ── */}
          <div className="flex flex-1 flex-col overflow-hidden">

            {/* Day header */}
            <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-3">
              {selectedDay != null ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Ngày {String(selectedDay).padStart(2, "0")} / {String(calMonth + 1).padStart(2, "0")} / {calYear}
                    </p>
                    <p className={`text-xl font-black mt-0.5 ${
                      dayScore(selectedDay) > 0 ? "text-emerald-600"
                        : dayScore(selectedDay) < 0 ? "text-rose-600"
                        : "text-slate-400"
                    }`}>
                      {dayScore(selectedDay) > 0
                        ? `+${dayScore(selectedDay)} điểm`
                        : dayScore(selectedDay) < 0
                          ? `${dayScore(selectedDay)} điểm`
                          : "Chưa có sự kiện"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-brand-100 ring-1 ring-brand-200" />
                      Hôm nay
                    </span>
                    <span>{selectedDayEvents.length} sự kiện</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Chọn ngày trong lịch bên trái để bắt đầu chấm</p>
              )}
            </div>

            {/* Content area */}
            {selectedDay != null && selectedCriterion ? (
              <div className="flex flex-1 flex-col overflow-y-auto">
                {/* Criterion section */}
                <div className="border-b border-slate-100 px-6 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700">
                      {selectedCriterion.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {Math.round(selectedCriterion.weight * 100)}%
                    </span>
                    {selectedDayCriterionEvents.length > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {selectedDayCriterionEvents.length} sự kiện
                      </span>
                    )}
                  </div>

                  {!readOnly ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCriterion.rules.map((rule) => {
                        const applied = events.some(
                          (e) => e.date === selectedDay && e.ruleCode === rule.code,
                        );
                        return (
                          <button
                            key={rule.code}
                            onClick={() =>
                              toggleRule(rule.code, rule.points, rule.type, selectedDay, rule.label)
                            }
                            title={rule.label}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition-all ${
                              applied
                                ? rule.type === "SUBTRACT"
                                  ? "bg-rose-200 text-rose-800 ring-rose-300 shadow-sm"
                                  : "bg-emerald-200 text-emerald-800 ring-emerald-300 shadow-sm"
                                : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-brand-50 hover:ring-brand-300 hover:text-brand-600"
                            }`}
                          >
                            {rule.type === "SUBTRACT" ? (
                              <Minus size={14} className="shrink-0" />
                            ) : (
                              <Plus size={14} className="shrink-0" />
                            )}
                            <span>{rule.label}</span>
                            <span className={`shrink-0 text-xs ${
                              applied
                                ? rule.type === "SUBTRACT" ? "text-rose-600" : "text-emerald-600"
                                : "text-slate-400"
                            }`}>
                              {rule.type === "SUBTRACT" ? "" : "+"}{rule.points}đ
                            </span>
                            {applied && <Check size={14} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Read-only */
                    <div className="space-y-2">
                      {selectedDayCriterionEvents.map((ev, i) => {
                        const rule = selectedCriterion.rules.find((r) => r.code === ev.ruleCode);
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
                              ev.points > 0
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-rose-200 bg-rose-50"
                            }`}
                          >
                            <span className={`shrink-0 rounded-full p-1.5 ${
                              ev.points > 0 ? "bg-emerald-200" : "bg-rose-200"
                            }`}>
                              {ev.points > 0
                                ? <Plus size={12} className="text-emerald-700" />
                                : <Minus size={12} className="text-rose-700" />}
                            </span>
                            <span className="flex-1 text-sm font-semibold text-slate-700">
                              {rule?.label ?? ev.ruleCode}
                            </span>
                            <span className={`text-sm font-black ${
                              ev.points > 0 ? "text-emerald-700" : "text-rose-700"
                            }`}>
                              {ev.points > 0 ? `+${ev.points}` : ev.points}đ
                            </span>
                          </div>
                        );
                      })}
                      {selectedDayCriterionEvents.length === 0 && (
                        <p className="text-xs text-slate-400">Không có sự kiện nào</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Other criteria with events on this day */}
                {selectedDayEvents.length > 0 && (
                  <div className="px-6 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Sự kiện ngày này (các tiêu chí khác)
                    </p>
                    <div className="space-y-3">
                      {template.criteria
                        .filter((c) =>
                          c.id !== selectedCriterionId &&
                          events.some((e) =>
                            e.date === selectedDay && c.rules.some((r) => r.code === e.ruleCode),
                          ),
                        )
                        .map((criterion) => {
                          const dayEvents = events.filter((e) =>
                            e.date === selectedDay && criterion.rules.some((r) => r.code === e.ruleCode),
                          );
                          return (
                            <div key={criterion.id}>
                              <p className="mb-1.5 text-xs font-semibold text-slate-500">{criterion.name}</p>
                              <div className="space-y-1.5">
                                {dayEvents.map((ev, i) => {
                                  const rule = criterion.rules.find((r) => r.code === ev.ruleCode);
                                  return (
                                    <div
                                      key={i}
                                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                                        ev.points > 0
                                          ? "border-emerald-200 bg-emerald-50"
                                          : "border-rose-200 bg-rose-50"
                                      }`}
                                    >
                                      <span className={`shrink-0 rounded-full p-1 ${
                                        ev.points > 0 ? "bg-emerald-200" : "bg-rose-200"
                                      }`}>
                                        {ev.points > 0
                                          ? <Plus size={10} className="text-emerald-700" />
                                          : <Minus size={10} className="text-rose-700" />}
                                      </span>
                                      <span className="flex-1 font-medium text-slate-700">
                                        {rule?.label ?? ev.ruleCode}
                                      </span>
                                      <span className={`font-bold ${
                                        ev.points > 0 ? "text-emerald-700" : "text-rose-700"
                                      }`}>
                                        {ev.points > 0 ? `+${ev.points}` : ev.points}đ
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedDay == null ? (
              /* No day selected */
              <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                <Calendar size={32} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">Chọn ngày trong lịch</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>{events.length} sự kiện</span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200 ring-1 ring-emerald-300" />
              Thưởng
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-200 ring-1 ring-rose-300" />
              Phạt
            </span>
            {record?.status === "REJECTED" && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-200 ring-1 ring-amber-300" />
                Bị từ chối - cần chỉnh sửa
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              disabled={!employee}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
              title="Xuất toàn bộ dữ liệu chấm điểm ra file CSV để xem/lưu trữ"
            >
              <Download size={15} />
              Xuất dữ liệu
            </button>
            {!readOnly && onSubmit && (hasEverSaved || record?.status === "IN_PROGRESS") && events.length > 0 && (
              <button
                onClick={() => void handleSave(true)}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                <Send size={15} />
                Gửi duyệt
              </button>
            )}
            {!readOnly && (
              <button
                onClick={() => void handleSave(false)}
                disabled={submitting}
                className="btn-secondary"
              >
                <Save size={15} />
                Lưu nháp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
