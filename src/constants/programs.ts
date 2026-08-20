export const PROGRAM = {
  HS: "HS",
  ST: "ST",
} as const;

export type Program = (typeof PROGRAM)[keyof typeof PROGRAM];

export const ALL_PROGRAMS: { value: Program; label: string }[] = (Object.entries(PROGRAM) as [Program, Program][]).map(
  ([value, _]) => ({
    value,
    label: PROGRAM_LABEL[value],
  })
);

export const PROGRAM_LABEL: Record<Program, string> = {
  HS: "Hệ Song ngữ",
  ST: "Song ngữ Tăng cường",
};

export const PROGRAM_MANAGER_ROLE = "PROGRAM_MANAGER" as const;