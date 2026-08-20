import { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Check,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import type { KpiTemplate, KpiRecord } from "@/types";
import { formatDateTime } from "@/utils";
import { STATUS_COLOR, STATUS_LABEL } from "@/utils/labels";
import { RANK_COLOR, RANK_LABEL } from "@/utils/labels";

interface Props {
  template: KpiTemplate;
  records: KpiRecord[];
  open: boolean;
  onClose: () => void;
}

interface DayGroup {
  day: number;
  month: number;
  year: number;
  events: KpiRecord["criteria"][0]["events"];
  criterionName?: string;
}

export function KpiHistoryModal({ template, records, open, onClose }: Props) {
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (!open) return null;

  const currentRecord = records[selectedRecordIndex];
  const hasMultipleRecords = records.length > 1;

  // Build all events grouped by day
  const allEvents = currentRecord
    ? currentRecord.criteria.flatMap((c) =>
        c.events.map((e) => ({ ...e, criterionName: c.name })),
      )
    : [];

  const eventsByDay = allEvents.reduce<Record<number, DayGroup>>((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = { day: event.date, month: 0, year: 0, events: [], criterionName: event.criterionName };
    }
    acc[event.date].events.push(event);
    return acc;
  }, {});

  const daysWithEvents = Object.values(eventsByDay).sort((a, b) => a.day - b.day);
  const selectedDayEvents = selectedDay != null ? eventsByDay[selectedDay]?.events ?? [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="flex h-[85vh] w-[96vw] max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <Calendar size={20} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Lịch sử chấm điểm</h2>
              <p className="text-xs text-slate-500">{template.name}</p>
            </div>
          </div>

          {/* Record selector */}
          {hasMultipleRecords && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedRecordIndex((i) => Math.max(0, i - 1));
                  setSelectedDay(null);
                }}
                disabled={selectedRecordIndex === 0}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-slate-600">
                Kỳ {selectedRecordIndex + 1} / {records.length}
              </span>
              <button
                onClick={() => {
                  setSelectedRecordIndex((i) => Math.min(records.length - 1, i + 1));
                  setSelectedDay(null);
                }}
                disabled={selectedRecordIndex === records.length - 1}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {currentRecord && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Điểm</p>
                  <p className="text-xl font-black text-brand-600">{currentRecord.kpiScore.toFixed(1)}</p>
                </div>
                <span className={`badge ${RANK_COLOR[currentRecord.rank]}`}>
                  {RANK_LABEL[currentRecord.rank]}
                </span>
                <span className={`badge ${STATUS_COLOR[currentRecord.status]}`}>
                  {STATUS_LABEL[currentRecord.status]}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: days list */}
          <div className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50">
            <div className="px-4 py-3 border-b border-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ngày có sự kiện ({daysWithEvents.length})
              </p>
            </div>
            {daysWithEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Calendar size={24} className="mb-2 opacity-30" />
                <p className="text-xs">Không có sự kiện</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {daysWithEvents.map(({ day, events }) => {
                  const total = events.reduce((a, e) => a + e.points, 0);
                  const isSelected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        isSelected
                          ? "bg-brand-50 ring-2 ring-brand-400 ring-inset"
                          : "hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-semibold ${isSelected ? "text-brand-700" : "text-slate-700"}`}>
                          Ngày {String(day).padStart(2, "0")}
                        </p>
                        <span className={`text-sm font-black ${
                          total > 0 ? "text-emerald-600" : total < 0 ? "text-rose-600" : "text-slate-400"
                        }`}>
                          {total > 0 ? `+${total}` : total}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {events.length} sự kiện
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: event detail */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedDay != null && selectedDayEvents.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800">
                    Ngày {String(selectedDay).padStart(2, "0")}
                  </h3>
                  <span className={`text-lg font-black ${
                    selectedDayEvents.reduce((a, e) => a + e.points, 0) > 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}>
                    {selectedDayEvents.reduce((a, e) => a + e.points, 0) > 0 ? "+" : ""}
                    {selectedDayEvents.reduce((a, e) => a + e.points, 0)} điểm
                  </span>
                </div>

                {/* Group by criterion */}
                {Array.from(new Set(selectedDayEvents.map((e) => e.criterionName))).map((criterionName) => {
                  const criterionEvents = selectedDayEvents.filter((e) => e.criterionName === criterionName);
                  return (
                    <div key={criterionName}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {criterionName}
                      </p>
                      <div className="space-y-2">
                        {criterionEvents.map((event, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                              event.points > 0
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-rose-200 bg-rose-50"
                            }`}
                          >
                            <div className={`shrink-0 rounded-full p-1.5 ${
                              event.points > 0 ? "bg-emerald-200" : "bg-rose-200"
                            }`}>
                              {event.points > 0
                                ? <Plus size={13} className="text-emerald-700" />
                                : <Minus size={13} className="text-rose-700" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-700">{event.note}</p>
                              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                                <Clock size={10} />
                                {formatDateTime(event.createdAt)}
                              </div>
                            </div>
                            <span className={`text-base font-black ${
                              event.points > 0 ? "text-emerald-700" : "text-rose-700"
                            }`}>
                              {event.points > 0 ? `+${event.points}` : event.points}đ
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : selectedDay != null ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Calendar size={32} className="mb-2 opacity-30" />
                <p className="text-sm">Ngày này không có sự kiện</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Calendar size={32} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">Chọn ngày để xem chi tiết</p>
                <p className="mt-1 text-xs text-slate-400">
                  Click vào ngày bên trái để xem sự kiện
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
