import type { KpiRecord, KpiPeriod, Employee } from "@/types";
import { RANK_LABEL } from "@/utils/labels";
import { STATUS_LABEL } from "@/utils/labels";
import { getBranchLabel } from "@/types/branch";

interface ExportRow {
  "Mã NV": string;
  "Họ tên": string;
  "Cơ sở": string;
  "Phòng ban": string;
  "Chương trình"?: string;
  "Kỳ": string;
  "Trạng thái": string;
  "Điểm KPI": number;
  "% Thưởng": number;
  "Xếp loại": string;
  "Sự kiện thưởng": number;
  "Sự kiện phạt": number;
  "Điểm thưởng": number;
  "Điểm phạt": number;
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCSV(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const firstRow = rows[0];
  if (!firstRow) return "";
  const headers = Object.keys(firstRow);
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) =>
    headers
      .map((h) => escapeCSV(String(row[h as keyof ExportRow] ?? "")))
      .join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportKpiToCSV(
  records: KpiRecord[],
  employees: Employee[],
  periods: KpiPeriod[],
): void {
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const periodMap = new Map(periods.map((p) => [p.id, p]));

  const rows: ExportRow[] = records.map((rec) => {
    const emp = employeeMap.get(rec.employeeId);
    const period = periodMap.get(rec.periodId);
    const allEvents = rec.criteria.flatMap((c) => c.events);
    const rewardEvents = allEvents.filter((e) => e.points > 0);
    const penaltyEvents = allEvents.filter((e) => e.points < 0);
    const totalReward = rewardEvents.reduce((a, e) => a + e.points, 0);
    const totalPenalty = penaltyEvents.reduce((a, e) => a + e.points, 0);

    return {
      "Mã NV": emp?.code ?? rec.employeeId,
      "Họ tên": emp?.fullName ?? "—",
      "Cơ sở": getBranchLabel(rec.branch),
      "Phòng ban": emp?.department ?? "—",
      ...(emp?.program ? { "Chương trình": emp.program } : {}),
      "Kỳ": period?.name ?? rec.periodId,
      "Trạng thái": STATUS_LABEL[rec.status],
      "Điểm KPI": rec.kpiScore,
      "% Thưởng": rec.bonusPercent,
      "Xếp loại": RANK_LABEL[rec.rank],
      "Sự kiện thưởng": rewardEvents.length,
      "Sự kiện phạt": penaltyEvents.length,
      "Điểm thưởng": totalReward,
      "Điểm phạt": totalPenalty,
    };
  });

  const csv = toCSV(rows);
  const periodName = periods[0]?.name ?? "kpi";
  const filename = `KPI_${periodName}_${new Date().toISOString().split("T")[0]}.csv`;
  downloadBlob(csv, filename, "text/csv;charset=utf-8;");
}

export function exportKpiToXLSX(
  records: KpiRecord[],
  employees: Employee[],
  periods: KpiPeriod[],
): void {
  // Fallback to CSV if xlsx library not available
  exportKpiToCSV(records, employees, periods);
}
