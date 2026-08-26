import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "@/config/firebaseInit";
import type { Role } from "@/constants/roles";
import type { Branch } from "@/types/branch";
import type { Program } from "@/constants/programs";

export interface CreateAccountForm {
  fullName: string;
  email: string;
  password: string;
  code: string;
  department: string;
  departmentType?: string;
  position?: string;
  program?: Program;
  role: Role;
  branch: Branch;
}

export async function createFirestoreAccount(input: CreateAccountForm) {
  const db = getDb();
  const auth = getFirebaseAuth();
  const now = new Date().toISOString();

  // 1. Create Firebase Auth user
  const cred = await createUserWithEmailAndPassword(auth, input.email, input.password);

  // 2. Set displayName
  await updateProfile(cred.user, { displayName: input.fullName });

  // 3. Create Firestore users/{uid}
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

  // 4. Create Firestore employees/{uid}
  await setDoc(doc(db, "employees", cred.user.uid), {
    id: cred.user.uid,
    uid: cred.user.uid,
    code: input.code,
    fullName: input.fullName,
    email: input.email,
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

  return { uid: cred.user.uid, email: input.email, password: input.password };
}
