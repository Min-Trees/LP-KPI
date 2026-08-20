import type { Program } from "@/constants/programs";

export type KpiTemplateType =
  | "manager"
  | "office_support"
  | "teacher_hs"
  | "teacher_st";

export type RuleType = "ADD" | "SUBTRACT";

export interface KpiRule {
  code: string;
  label: string;
  category: string;
  type: RuleType;
  points: number;
  minPoints?: number;
  maxPoints?: number;
  note?: string;
}

export interface KpiCriterion {
  id: string;
  code: string;
  name: string;
  weight: number;
  description?: string;
  order: number;
  rules: KpiRule[];
}

export interface KpiTemplate {
  id: string;
  type: KpiTemplateType | string;
  program?: Program;
  name: string;
  version: number;
  status: "ACTIVE" | "INACTIVE";
  maxScorePerCriterion: number;
  totalFormula: "WEIGHTED_AVG" | "SUM" | "AVG";
  criteria: KpiCriterion[];
  createdBy: string;
  createdAt: string;
}

export interface KpiVersion {
  id: string;
  templateId: string;
  version: number;
  snapshot: Omit<KpiTemplate, "id" | "createdAt">;
  changes: string[];
  createdBy: string;
  createdAt: string;
  effectiveFrom: string;
}