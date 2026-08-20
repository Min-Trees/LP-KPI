import type { KpiEvent } from "@/types";

export function describeRule(category: string): string {
  const map: Record<string, string> = {
    "Nội quy và kỷ luật": "Đi muộn, nghỉ không phép, vi phạm nội quy.",
    "Chuyên môn": "Chất lượng chuyên môn, quy trình nghiệp vụ.",
    "Chuyên môn, chất lượng giảng dạy": "Chất lượng giảng dạy và chuyên môn.",
    "Chất lượng dịch vụ": "Tư vấn, hỗ trợ phụ huynh, ứng xử.",
    "Chất lượng dịch vụ/Thái độ": "Thái độ phục vụ, tinh thần hợp tác.",
  };
  return map[category] ?? category;
}

export function buildEvent(
  ruleCode: string,
  ruleLabel: string,
  type: "ADD" | "SUBTRACT",
  points: number,
  date: number,
  createdBy: string,
  note?: string,
): KpiEvent {
  return {
    date,
    ruleCode,
    points: type === "SUBTRACT" ? -Math.abs(points) : Math.abs(points),
    note: note ?? ruleLabel,
    createdBy,
    createdAt: new Date().toISOString(),
  };
}