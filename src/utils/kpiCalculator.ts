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
  maxScorePerCriterion: number,
  baseScore = DEFAULT_BASE_SCORE,
): KpiCriterionRecord {
  const dailyScores: Record<number, number> = {};
  for (const ev of events) {
    dailyScores[ev.date] = (dailyScores[ev.date] ?? 0) + ev.points;
  }
  const sum = Object.values(dailyScores).reduce((a, b) => a + b, 0);
  const total = capScore(baseScore + sum, maxScorePerCriterion);

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
  const bands: RankingBand[] = [
    { min: 100.01, max: Infinity, label: "Xuất sắc (>100)", bonusPercent: 105, rank: "XUAT_SAC" },
    { min: 95, max: 100, label: "Tốt (95-100)", bonusPercent: 100, rank: "TOT" },
    { min: 90, max: 94.99, label: "Tốt (90-94)", bonusPercent: 90, rank: "TOT" },
    { min: 80, max: 89.99, label: "Đạt (80-89)", bonusPercent: 70, rank: "DAT" },
    { min: 70, max: 79.99, label: "Đạt (70-79)", bonusPercent: 50, rank: "DAT" },
    { min: 0, max: 69.99, label: "Cần cải thiện (<70)", bonusPercent: 0, rank: "CAN_CAI_THIEN" },
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