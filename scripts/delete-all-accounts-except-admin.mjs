/**
 * Script xoa cac tai khoan KHONG PHAI ADMIN
 * - Xoa: Firebase Auth users + Firestore users/ documents (tru admin)
 * - GIU NGUYEN: Firestore employees/ (bao toan thong tin nhan su)
 * - GIU LAI: Admin (uid = TcLMrjG2dUNwm2fsENvgH44kNVu1, email = admin@kpi.local)
 *
 * Usage:
 *   node scripts/delete-all-accounts-except-admin.mjs
 */

import { readFileSync } from "fs";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const { cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// UID admin duy nhat can giu lai
const ADMIN_UID = "TcLMrjG2dUNwm2fsENvgH44kNVu1";
const ADMIN_EMAIL = "admin@kpi.local";

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

async function deleteAllExceptAdmin() {
  console.log("\n===========================================");
  console.log("  XOA TAI KHOAN (GIU LAI ADMIN)");
  console.log("===========================================\n");
  console.log(`Admin se duoc giu: ${ADMIN_EMAIL} (uid=${ADMIN_UID})`);
  console.log("Se xoa TAT CA tai khoan khac (Auth + users/).");
  console.log("\nLuu y: employees/ se KHONG bi xoa (giu toan bo thong tin nhan su).\n");

  // 1. Lay danh sach Auth users
  console.log("[1/4] Lay danh sach Firebase Auth users...");
  const listAllUsers = [];
  let pageToken;
  do {
    const result = await auth.listUsers(100, pageToken);
    listAllUsers.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  const keepUser = listAllUsers.find((u) => u.uid === ADMIN_UID);
  const deleteUsers = listAllUsers.filter((u) => u.uid !== ADMIN_UID);

  console.log(`  Tong: ${listAllUsers.length} Auth users`);
  console.log(`  Giu lai: ${keepUser ? `1 (${ADMIN_EMAIL})` : "KHONG TIM THAY admin!"}`);
  console.log(`  Se xoa: ${deleteUsers.length} users:`);
  deleteUsers.forEach((u) => console.log(`    - ${u.email} (uid=${u.uid})`));
  console.log("");

  if (!keepUser) {
    console.error(`KHONG TIM THAY admin voi uid "${ADMIN_UID}". Huy thao tac.`);
    process.exit(1);
  }

  // 2. Xoa Auth users (tru admin)
  console.log("[2/4] Xoa Firebase Auth users...");
  let authDeleted = 0;
  for (let i = 0; i < deleteUsers.length; i += 100) {
    const batch = deleteUsers.slice(i, i + 100).map((u) => u.uid);
    if (batch.length > 0) {
      await auth.deleteUsers(batch);
      authDeleted += batch.length;
      console.log(`  Da xoa ${authDeleted}/${deleteUsers.length} Auth users...`);
    }
  }
  console.log(`  Hoan tat! Da xoa ${authDeleted} Auth users.\n`);

  // 3. Xoa Firestore users/ documents (tru admin)
  console.log("[3/4] Xoa Firestore users/ (tru admin)...");
  const usersSnapshot = await db.collection("users").get();
  let usersDeleted = 0;
  if (usersSnapshot.size > 0) {
    const batches = [];
    let batch = db.batch();
    let count = 0;

    usersSnapshot.forEach((docSnap) => {
      if (docSnap.id !== ADMIN_UID) {
        batch.delete(docSnap.ref);
        count++;
        usersDeleted++;
        if (count >= 400) {
          batches.push(batch.commit());
          batch = db.batch();
          count = 0;
        }
      }
    });
    if (count > 0) batches.push(batch.commit());
    await Promise.all(batches);
    console.log(`  Da xoa ${usersDeleted} document(s) trong 'users/'.\n`);
  } else {
    console.log("  Collection 'users/' da trong.\n");
  }

  // 4. Bao toan employees/
  console.log("[4/4] Kiem tra bao toan employees/...");
  const empSnapshot = await db.collection("employees").get();
  console.log(`  Giu nguyen ${empSnapshot.size} document(s) trong 'employees/' (bao toan thong tin nhan su).\n`);

  console.log("===========================================");
  console.log("  HOAN TAT");
  console.log("===========================================");
  console.log(`\nDa xoa: ${authDeleted} Auth users + ${usersDeleted} users/ documents`);
  console.log(`Bao toan: ${empSnapshot.size} employees/ documents + 1 admin account`);
  console.log(`Admin con lai: ${ADMIN_EMAIL} (uid: ${ADMIN_UID})\n`);
}

deleteAllExceptAdmin().catch((err) => {
  console.error("\nLoi:", err.message);
  process.exit(1);
});