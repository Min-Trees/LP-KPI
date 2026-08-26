export const PROGRAM = {
  HS: "HS",
  ST: "ST",
} as const;

export type Program = (typeof PROGRAM)[keyof typeof PROGRAM];

export const PROGRAM_LABEL: Record<Program, string> = {
  HS: "HighScope",
  ST: "STEM",
};

export const ALL_PROGRAMS: { value: Program; label: string }[] = (Object.entries(PROGRAM) as [Program, Program][]).map(
  ([value, _]) => ({
    value,
    label: PROGRAM_LABEL[value],
  })
);