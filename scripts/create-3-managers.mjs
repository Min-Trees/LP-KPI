/**
 * Script tao 3 tai khoan quan ly moi cho co so LAO_CAI
 * 1. trinh.ho@littlepeople.edu.vn - Quản lý Cơ sở (OPERATION_MANAGER)
 * 2. yen.chau@littlepeople.edu.vn - Quản lý chương trình STEM (PROGRAM_MANAGER_ST)
 * 3. 299linhtran@gmail.com - Quản lý chương trình HS (PROGRAM_MANAGER_HS)
 *
 * Luu y:
 *   - Mat khau mac dinh: Littlepeople@2026
 *   - Lay fullName tu employees/ (EMP_1001, EMP_1002, EMP_1003)
 *   - Tao ca users/ va employees/ voi cung uid (ghi de ban ghi cu neu can)
 *
 * Usage:
 *   node scripts/create-3-managers.mjs
 */

import { readFileSync } from "fs";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const { cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const DEFAULT_PASSWORD = "Littlepeople@2026";
const BRANCH = "LAO_CAI";

// Mapping email -> employee_id de lay fullName tu employees/
const TARGETS = [
  {
    email: "trinh.ho@littlepeople.edu.vn",
    employeeId: "EMP_1002",
    role: "OPERATION_MANAGER",
    department: "Văn phòng + Hỗ trợ",
    position: "Quản lý Cơ sở",
    program: null,
  },
  {
    email: "yen.chau@littlepeople.edu.vn",
    employeeId: "EMP_1001",
    role: "PROGRAM_MANAGER_ST",
    department: "Giáo viên ST",
    position: "Quản lý chương trình STEM",
    program: "ST",
  },
  {
    email: "299linhtran@gmail.com",
    employeeId: "EMP_1003",
    role: "PROGRAM_MANAGER_HS",
    department: "Giáo viên HS",
    position: "Quản lý chương trình HighScope",
    program: "HS",
  },
];

const serviceAccount = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "lp-kpi-edb40-firebase-adminsdk-fbsvc-f30de5a5a8.json"),
    "utf8"
  )
);

const app = admin.initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);
const auth = getAuth(app);

function log(msg) { console.log(msg); }

async function createManagerAccount(target, employeeData) {
  const now = new Date().toISOString();
  const fullName = employeeData?.fullName || target.email.split("@")[0];

  log(`\n--- ${target.email} ---`);
  log(`  Full name (from employees/${target.employeeId}): ${fullName}`);

  let userRecord;

  // 1. Kiem tra/tai su dung Auth user
  try {
    userRecord = await auth.getUserByEmail(target.email);
    log(`  Auth user da ton tai (uid=${userRecord.uid}), se cap nhat profile.`);
    await auth.updateUser(userRecord.uid, {
      displayName: fullName,
      password: DEFAULT_PASSWORD,
      disabled: false,
    });
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      log("  Chua co Auth user, dang tao moi...");
      userRecord = await auth.createUser({
        email: target.email,
        password: DEFAULT_PASSWORD,
        displayName: fullName,
        disabled: false,
      });
      log(`  Da tao Auth user moi (uid=${userRecord.uid}).`);
    } else {
      throw e;
    }
  }

  const uid = userRecord.uid;

  // 2. Ghi users/{uid}
  await db.collection("users").doc(uid).set({
    uid,
    email: target.email,
    displayName: fullName,
    role: target.role,
    program: target.program || null,
    department: target.department,
    departmentType: null,
    branch: BRANCH,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  }, { merge: true });
  log(`  Da ghi users/${uid}`);

  // 3. Ghi employees/{uid} (ghi de email + role + dept)
  const employeePayload = {
    id: uid,
    uid,
    email: target.email,
    fullName,
    role: target.role,
    department: target.department,
    position: target.position,
    program: target.program || null,
    branch: BRANCH,
    status: "ACTIVE",
    updatedAt: now,
  };

  // Giu nguyen code tu employees/EMP_xxxx neu co
  if (employeeData?.code) {
    employeePayload.code = employeeData.code;
  }

  await db.collection("employees").doc(uid).set(employeePayload, { merge: true });
  log(`  Da cap nhat employees/${uid}`);

  // 4. Cap nhat employees/EMP_xxxx (de quan ly "UID-based" va "Code-based")
  if (employeeData) {
    await db.collection("employees").doc(target.employeeId).set({
      email: target.email,
      fullName,
      role: target.role,
      department: target.department,
      position: target.position,
      program: target.program || null,
      branch: BRANCH,
      status: "ACTIVE",
      uid, // them uid de lien ket
      updatedAt: now,
    }, { merge: true });
    log(`  Da cap nhat employees/${target.employeeId} (them uid lien ket)`);
  }

  return { uid, email: target.email, fullName };
}

async function main() {
  console.log("\n===========================================");
  console.log("  TAO 3 TAI KHOAN QUAN LY LAO CAI");
  console.log("===========================================\n");
  console.log("Mat khau mac dinh:", DEFAULT_PASSWORD);
  console.log("Chi nhanh:", BRANCH);

  const results = [];

  for (const target of TARGETS) {
    // Lay thong tin tu employees/EMP_xxxx
    const empDoc = await db.collection("employees").doc(target.employeeId).get();
    const empData = empDoc.exists ? empDoc.data() : null;

    if (!empData) {
      console.warn(`\nCANH BAO: Khong tim thay employees/${target.employeeId}, se su dung email lam fullName.`);
    }

    const result = await createManagerAccount(target, empData);
    results.push(result);
  }

  console.log("\n===========================================");
  console.log("  TAI KHOAN DA TAO THANH CONG");
  console.log("===========================================\n");

  results.forEach((r, i) => {
    const t = TARGETS[i];
    console.log(`  ${i + 1}. ${r.fullName}`);
    console.log(`     Email:    ${r.email}`);
    console.log(`     Mat khau: ${DEFAULT_PASSWORD}`);
    console.log(`     Role:     ${t.role}`);
    console.log(`     Phong ban: ${t.department}`);
    console.log(`     Co so:     ${BRANCH}`);
    console.log(`     UID:       ${r.uid}`);
    console.log("");
  });

  console.log("\nLUU Y: Yeu cau user doi mat khau sau khi dang nhap lan dau.\n");
}

main().catch((err) => {
  console.error("\nLoi:", err.message);
  process.exit(1);
});