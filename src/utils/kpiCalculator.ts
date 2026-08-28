import type {
  KpiCriterion,
  KpiCriterionRecord,
  KpiEvent,
  RankingBand,
  RankingRules,
} from "@/types";

export const DEFAULT_BASE_SCORE = 100;

export function applyEvent(
  currentTotal: number,
  event: KpiEvent,
): number {
  return currentTotal + event.points;
}

export function capScore(value: number, max: number, min = 0): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function computeCriterionTotal(
  criterion: KpiCriterion,
  events: KpiEvent[],
  baseScore = DEFAULT_BASE_SCORE,
): number {
  const sum = events.reduce((acc, ev) => acc + (Number.isFinite(ev.points) ? ev.points : 0), 0);
  return capScore(baseScore + sum, criterion.rules.length > 0 ? 105 : 105);
}

export function computeCriterionRecord(
  criterion: KpiCriterion,
  events: KpiEvent[],
  _maxScorePerCriterion: number, // kept for API compatibility; cap removed to allow >110
  baseScore = DEFAULT_BASE_SCORE,
): KpiCriterionRecord {
  const dailyScores: Record<number, number> = {};
  for (const ev of events) {
    dailyScores[ev.date] = (dailyScores[ev.date] ?? 0) + ev.points;
  }
  const sum = Object.values(dailyScores).reduce((a, b) => a + b, 0);

  // Điều 5: "Có từ 02 biên bản xử lý kỷ luật trong quý → 0 điểm tiêu chí"
  // Khi rule two_disciplines_quarter được áp dụng, criterion score về đúng 0
  const hasZeroPenalty = events.some((e) => e.ruleCode === "two_disciplines_quarter");
  // Không cap tối đa — cho phép vượt 110 để đạt xuất sắc
  const total = hasZeroPenalty ? 0 : baseScore + sum;

  return {
    criterionId: criterion.id,
    code: criterion.code,
    name: criterion.name,
    weight: criterion.weight,
    baseScore,
    dailyScores,
    total,
    events,
  };
}

export function computeKpiScore(records: KpiCriterionRecord[]): number {
  return records.reduce((acc, r) => acc + r.total * r.weight, 0);
}

export function defaultRankingRules(): RankingRules {
  // Điều 8 - Phần A: Bảng quy đổi mức thưởng
  const bands: RankingBand[] = [
    { min: 110.01, max: Infinity, label: ">110 điểm", bonusPercent: 115, rank: "XUAT_SAC" },
    { min: 101, max: 110, label: "101–110 điểm", bonusPercent: 110, rank: "XUAT_SAC" },
    { min: 91, max: 100, label: "91–100 điểm", bonusPercent: 100, rank: "TOT" },
    { min: 81, max: 90.99, label: "81–90 điểm", bonusPercent: 90, rank: "DAT" },
    { min: 71, max: 80.99, label: "71–80 điểm", bonusPercent: 70, rank: "DAT" },
    { min: 61, max: 70.99, label: "61–70 điểm", bonusPercent: 50, rank: "CAN_CAI_THIEN" },
    { min: 0, max: 60.99, label: "<60 điểm", bonusPercent: 0, rank: "CAN_CAI_THIEN" },
  ];
  return {
    id: "default",
    name: "Quy tắc mặc định",
    bands,
    status: "ACTIVE",
    updatedAt: new Date().toISOString(),
  };
}

export function resolveRankAndBonus(
  score: number,
  rules: RankingRules,
): { rank: RankingBand["rank"]; bonusPercent: number; label: string } {
  for (const band of rules.bands) {
    if (score >= band.min && score <= band.max) {
      return { rank: band.rank, bonusPercent: band.bonusPercent, label: band.label };
    }
  }
  return { rank: "CAN_CAI_THIEN", bonusPercent: 0, label: "Chưa xếp loại" };
}