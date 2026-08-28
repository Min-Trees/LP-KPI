import {
  createUserWithEmailAndPassword,
  updateProfile,
  fetchSignInMethodsForEmail,
  deleteUser as fbAuthDeleteUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { getFirebaseAuth, getDb } from "@/config/firebaseInit";
import type { Role } from "@/constants/roles";
import { MANAGER_ROLES } from "@/constants/roles";
import type { Branch } from "@/types/branch";
import type { Program } from "@/constants/programs";
import type { Employee } from "@/types";

/**
 * Check if a role requires an account (manager level and above)
 */
export function roleRequiresAccount(role: Role): boolean {
  return MANAGER_ROLES.includes(role);
}

/**
 * Form for creating an account linked to an existing employee
 */
export interface CreateAccountForm {
  employeeId: string; // Firestore document ID of existing employee
  email: string;
  password: string;
}

/**
 * Create an account for an existing employee.
 * - Creates Firebase Auth user
 * - Creates Firestore users/{uid}
 * - Updates employee's uid field
 * - Throws if employee doesn't exist or already has uid
 */
export async function createAccountForEmployee(input: CreateAccountForm) {
  const db = getDb();
  const auth = getFirebaseAuth();

  // 1. Verify employee exists and doesn't already have an account
  const empRef = doc(db, "employees", input.employeeId);
  const empSnap = await getDoc(empRef);
  if (!empSnap.exists()) {
    throw new Error("Không tìm thấy nhân viên");
  }
  const empData = empSnap.data() as Employee;
  if (empData.uid) {
    throw new Error("Nhân viên này đã có tài khoản");
  }
  if (!roleRequiresAccount(empData.role)) {
    throw new Error("Chỉ cấp quản lý mới được tạo tài khoản");
  }

  // 2. Check email đã được đăng ký chưa (fail-fast trước khi signUp).
  // Nếu email đã có trong Auth → fail với message rõ ràng,
  // tránh tạo Auth user mồ côi (không có doc users/{uid}).
  const existingMethods = await fetchSignInMethodsForEmail(auth, input.email);
  if (existingMethods && existingMethods.length > 0) {
    throw new Error(
      `Email "${input.email}" đã được đăng ký trong hệ thống. ` +
      `Vui lòng vào Firebase Console → Authentication → Users → xóa user này, ` +
      `rồi quay lại đây tạo lại. Hoặc dùng email khác.`,
    );
  }

  // 3. Create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
  await updateProfile(cred.user, { displayName: empData.fullName });

  // 4. Create Firestore users/{uid} + link employee.
  // Nếu setDoc fail (network, rule, ...) → rollback Auth user để tránh
  // tạo "Auth user mồ côi" (user có tài khoản nhưng không có profile).
  const now = new Date().toISOString();
  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email: input.email,
      displayName: empData.fullName,
      role: empData.role,
      program: empData.program || null,
      department: empData.department,
      departmentType: empData.departmentType || null,
      branch: empData.branch,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    await updateDoc(empRef, {
      uid: cred.user.uid,
      email: input.email,
      updatedAt: now,
    });
  } catch (writeErr) {
    // Rollback: xóa Auth user để tránh tạo user mồ côi
    try {
      await fbAuthDeleteUser(auth, cred.user.uid);
    } catch (cleanupErr) {
      console.error("[createAccountForEmployee] Rollback Auth user failed:", cleanupErr);
    }
    throw writeErr;
  }

  return { uid: cred.user.uid, email: input.email };
}

/**
 * Delete account only (does NOT delete employee).
 * - Deletes Firestore users/{uid}
 * - Clears uid field in employee document
 * - Auth account deletion requires Firebase Admin SDK (manual or Cloud Function)
 */
export async function deleteAccountOnly(uid: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  // 1. Delete employee document (document ID = uid)
  const empDoc = doc(db, "employees", uid);
  await deleteDoc(empDoc);

  // 2. Delete Firestore users/{uid}
  await deleteDoc(doc(db, "users", uid));
}

/**
 * Create both employee AND account in one transaction-like flow.
 * Used when creating a new manager who needs immediate account access.
 */
export interface CreateEmployeeWithAccountForm {
  code: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  department: string;
  departmentType?: string;
  position?: string;
  program?: Program;
  branch: Branch;
  role: Role;
}

export async function createEmployeeWithAccount(input: CreateEmployeeWithAccountForm) {
  if (!roleRequiresAccount(input.role)) {
    throw new Error("Chỉ cấp quản lý mới được tạo tài khoản. Nhân viên sẽ không có tài khoản.");
  }

  const db = getDb();
  const auth = getFirebaseAuth();
  const now = new Date().toISOString();

  // 1. Check email đã được đăng ký chưa (fail-fast trước khi signUp).
  const existingMethods = await fetchSignInMethodsForEmail(auth, input.email);
  if (existingMethods && existingMethods.length > 0) {
    throw new Error(
      `Email "${input.email}" đã được đăng ký trong hệ thống. ` +
      `Vui lòng vào Firebase Console → Authentication → Users → xóa user này, ` +
      `rồi quay lại đây tạo lại. Hoặc dùng email khác.`,
    );
  }

  // 2. Create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);
  await updateProfile(cred.user, { displayName: input.fullName });

  // 2. Create Firestore users/{uid} + employees/{uid}.
  // Nếu setDoc fail → rollback Auth user để tránh tạo user mồ côi.
  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      email: input.email,
      displayName: input.fullName,
      role: input.role,
      program: input.program || null,
      department: input.department,
      departmentType: input.departmentType || null,
      branch: input.branch,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, "employees", cred.user.uid), {
      id: cred.user.uid,
      uid: cred.user.uid,
      code: input.code,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone || null,
      department: input.department,
      departmentType: input.departmentType || null,
      position: input.position || null,
      program: input.program || null,
      role: input.role,
      branch: input.branch,
      status: "ACTIVE",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  } catch (writeErr) {
    // Rollback Auth user
    try {
      await fbAuthDeleteUser(auth, cred.user.uid);
    } catch (cleanupErr) {
      console.error("[createEmployeeWithAccount] Rollback Auth user failed:", cleanupErr);
    }
    throw writeErr;
  }

  return { uid: cred.user.uid, email: input.email, password: input.password };
}