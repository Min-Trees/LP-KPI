/**
 * Script tao tai khoan Firebase Auth truc tiep tu local
 * Dung service account key de bypass khong can Cloud Functions
 *
 * Usage:
 *   node scripts/create-user.mjs
 */

import * as admin from "firebase-admin";
import { readFileSync } from "fs";
import * as path from "path";
import * as readline from "readline";

// Initialize Firebase Admin voi service account
const serviceAccount = JSON.parse(
  readFileSync(path.join(process.cwd(), "lp-kpi-edb40-firebase-adminsdk-fbsvc-f30de5a5a8.json"), "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();
const db = admin.firestore();

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .substring(0, 30);
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function createUser() {
  console.log("\n=== TAO TAI KHOAN MOI ===\n");

  const fullName = await ask("Ho ten: ");
  const code = await ask("Ma nhan vien: ");
  const defaultEmail = `${slugify(fullName)}.${code}@kpi.local`;
  const emailInput = await ask(`Email [${defaultEmail}]: `);
  const email = emailInput || defaultEmail;
  const password = (await ask("Mat khau (mac dinh: Kpi@2026): ")) || "Kpi@2026";
  const department = await ask("Phong ban: ");
  const departmentType = (await ask("Loai phong ban (Y te, Thu viec...): ")) || null;
  const position = (await ask("Chuc vu: ")) || null;
  const program = (await ask("Chuong trinh (HS/ST, de trong neu khong co): ")) || null;
  const role = (await ask("Vai tro (ADMIN/BOARD/OPERATION_MANAGER/PROGRAM_MANAGER/EMPLOYEE): ")) || "EMPLOYEE";
  const branch = (await ask("Co so (LAI_THIEU/LAO_CAI): ")) || "LAI_THIEU";

  if (!fullName || !code || !email || !department || !role || !branch) {
    console.error("Thieu thong tin bat buoc!");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("Mat khau phai co it nhat 6 ky tu!");
    process.exit(1);
  }

  const VALID_ROLES = ["ADMIN", "BOARD", "OPERATION_MANAGER", "PROGRAM_MANAGER", "EMPLOYEE"];
  if (!VALID_ROLES.includes(role)) {
    console.error("Vai tro khong hop le!");
    process.exit(1);
  }

  const VALID_BRANCHES = ["LAI_THIEU", "LAO_CAI"];
  if (!VALID_BRANCHES.includes(branch)) {
    console.error("Co so khong hop le!");
    process.exit(1);
  }

  const now = new Date().toISOString();

  try {
    console.log("\nDang tao tai khoan...");

    // 1. Tao Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
      disabled: false,
    });

    console.log("Da tao Auth user");

    // 2. Tao Firestore users/{uid}
    await db.doc(`users/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email,
      displayName: fullName,
      role,
      program: program || null,
      department,
      departmentType: departmentType || null,
      branch,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    console.log("Da tao Firestore users/...");

    // 3. Tao Firestore employees/{uid}
    await db.doc(`employees/${userRecord.uid}`).set({
      id: userRecord.uid,
      code,
      fullName,
      email,
      department,
      departmentType: departmentType || null,
      position: position || null,
      program: program || null,
      role,
      branch,
      status: "ACTIVE",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    console.log("Da tao Firestore employees/...");

    console.log(`
===========================================
TAO TAI KHOAN THANH CONG
===========================================
UID:        ${userRecord.uid}
Ho ten:     ${fullName}
Email:      ${email}
Mat khau:   ${password}
Vai tro:    ${role}
Co so:      ${branch}
===========================================

GUI THONG TIN CHO NGUOI DUNG:
Email: ${email}
Mat khau: ${password}

LUU Y: Yeu cau nguoi dung doi mat khau sau khi dang nhap lan dau.
`);
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      console.error("Email da ton tai trong he thong!");
    } else {
      console.error("Loi:", err.message);
    }
    process.exit(1);
  }
}

createUser();
