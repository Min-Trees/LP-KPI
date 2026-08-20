export const ROLE = {
  ADMIN: "ADMIN",
  BOARD: "BOARD",
  OPERATION_MANAGER: "OPERATION_MANAGER",
  PROGRAM_MANAGER: "PROGRAM_MANAGER",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ALL_ROLES: Role[] = Object.values(ROLE);

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Quản trị hệ thống",
  BOARD: "Ban Giám đốc",
  OPERATION_MANAGER: "Quản lý Cơ sở",
  PROGRAM_MANAGER: "Quản lý Chương trình",
  EMPLOYEE: "Nhân viên",
};