import type { Role } from "@/constants/roles";
import type { Program } from "@/constants/programs";
import type { Branch } from "@/types/branch";

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
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  department?: string;
  program?: Program;
  branch: Branch;
  status: EmployeeStatus;
}