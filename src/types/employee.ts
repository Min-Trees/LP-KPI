import type { Role } from "@/constants/roles";
import type { Program } from "@/constants/programs";
import type { Branch } from "@/types/branch";
import type { Permission } from "@/constants/permissions";

export type EmployeeStatus = "ACTIVE" | "INACTIVE";

export interface Employee {
  id: string;
  uid?: string; // Firebase Auth UID — có uid = đã có tài khoản đăng nhập
  code: string;
  fullName: string;
  email: string;
  phone?: string;
  department: string;
  departmentType?: string;
  position?: string;
  program?: Program;
  managerId?: string;
  role: Role;
  branch: Branch;
  status: EmployeeStatus;
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppUser {
  uid: string;
  /** Firestore employee document ID của user này */
  employeeId?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  department?: string;
  program?: Program;
  branch: Branch;
  status: EmployeeStatus;
  /** Permissions riêng của user (override role defaults).
   *  - Nếu không có trường này → dùng role defaults.
   *  - Nếu có → dùng danh sách này (Admin luôn được full quyền). */
  permissions?: Permission[];
  /** Thời điểm cập nhật permissions lần cuối (audit). */
  permissionsUpdatedAt?: string;
  /** UID của admin đã gán permissions lần cuối. */
  permissionsUpdatedBy?: string;
}