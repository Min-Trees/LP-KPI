export const ROLE = {
  ADMIN: "ADMIN",
  BOARD: "BOARD",
  OPERATION_MANAGER: "OPERATION_MANAGER",
  PROGRAM_MANAGER_HS: "PROGRAM_MANAGER_HS",
  PROGRAM_MANAGER_ST: "PROGRAM_MANAGER_ST",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ALL_ROLES: Role[] = Object.values(ROLE);

export const MANAGER_ROLES: Role[] = [
  ROLE.BOARD,
  ROLE.OPERATION_MANAGER,
  ROLE.PROGRAM_MANAGER_HS,
  ROLE.PROGRAM_MANAGER_ST,
];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Quản trị hệ thống",
  BOARD: "Ban Giám đốc",
  OPERATION_MANAGER: "Quản lý Cơ sở",
  PROGRAM_MANAGER_HS: "Quản lý HighScope",
  PROGRAM_MANAGER_ST: "Quản lý STEM",
  EMPLOYEE: "Nhân viên",
};