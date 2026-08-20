export type Branch = "LAO_CAI" | "LAI_THIEU";

export const BRANCHES: { value: Branch; label: string; shortLabel: string }[] = [
  { value: "LAO_CAI", label: "Cơ sở Lào Cai", shortLabel: "Lào Cai" },
  { value: "LAI_THIEU", label: "Cơ sở Lái Thiêu", shortLabel: "Lái Thiêu" },
];

export function getBranchLabel(branch: Branch): string {
  return BRANCHES.find((b) => b.value === branch)?.label ?? branch;
}

export function getBranchShortLabel(branch: Branch): string {
  return BRANCHES.find((b) => b.value === branch)?.shortLabel ?? branch;
}
