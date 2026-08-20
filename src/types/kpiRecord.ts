import type { Branch } from "./branch";

export type KpiPeriodStatus = "UPCOMING" | "OPEN" | "LOCKED" | "CLOSED";

export interface KpiPeriod {
  id: string;
  name: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  deadline: string;
  scoringDeadline: string;
  approvalDeadline: string;
  status: KpiPeriodStatus;
  createdAt: string;
}

export type KpiRecordStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "LOCKED"
  | "REJECTED";

export type Rank = "XUAT_SAC" | "TOT" | "DAT" | "CAN_CAI_THIEN";

export interface KpiEvent {
  date: number;
  ruleCode: string;
  points: number;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface KpiCriterionRecord {
  criterionId: string;
  code: string;
  name: string;
  weight: number;
  baseScore: number;
  dailyScores: Record<number, number>;
  total: number;
  events: KpiEvent[];
}

export interface KpiRecord {
  id: string;
  employeeId: string;
  periodId: string;
  templateId: string;
  templateVersion: number;
  templateType: "teacher_hs" | "teacher_st" | "office_support" | "manager";
  branch: Branch;
  status: KpiRecordStatus;
  createdBy: string;
  submittedBy?: string;
  approvedBy?: string;
  submittedAt?: string;
  approvedAt?: string;
  criteria: KpiCriterionRecord[];
  kpiScore: number;
  bonusPercent: number;
  rank: Rank;
  note?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RankingBand {
  min: number;
  max: number;
  label: string;
  bonusPercent: number;
  rank: Rank;
}

export interface RankingRules {
  id: string;
  name: string;
  bands: RankingBand[];
  status: "ACTIVE" | "INACTIVE";
  updatedAt: string;
}