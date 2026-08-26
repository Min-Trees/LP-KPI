/**
 * Script xoa toan bo du lieu nhan su
 * Xoa: Firestore (employees/, users/), Firebase Auth accounts
 *
 * CANH BAC: Day la thao tac XOA VUNG KHONG HOAN TAC!
 * Run from functions folder: node delete-all-employees.mjs
 */

import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

async function ask(question) {
  const readline = await import("readline");
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

async function deleteAllEmployees() {
  console.log("\n===========================================");
  console.log("  XOA TOAN BO DU LIEU NHAN SU");
  console.log("===========================================\n");
  console.log("Script nay se xoa:");
  console.log("  - Tat ca tai khoan Firebase Auth");
  console.log("  - Tat ca documents trong collection 'employees'");
  console.log("  - Tat ca documents trong collection 'users'");
  console.log("\nCANH BAC: Thao tac nay KHONG THE HOAN TAC!\n");

  const confirm = await ask("Nhap 'YES' de xac nhan xoa: ");

  if (confirm.trim() !== "YES") {
    console.log("Da huy bo thao tac xoa.");
    process.exit(0);
  }

  console.log("\nBat dau xoa...\n");

  // 1. Delete all Firebase Auth users
  console.log("[1/3] Dang xoa Firebase Auth users...");
  let totalDeleted = 0;
  let pageToken;

  do {
    const listUsersResult = await auth.listUsers(100, pageToken);
    const uids = listUsersResult.users.map((u) => u.uid);

    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      totalDeleted += uids.length;
      console.log(`  Da xoa ${uids.length} user(s)...`);
    }

    pageToken = listUsersResult.pageToken;
  } while (pageToken);

  console.log(`  Hoan tat! Da xoa ${totalDeleted} Firebase Auth user(s).\n`);

  // 2. Delete all employees collection
  console.log("[2/3] Dang xoa Firestore 'employees'...");
  const empSnapshot = await db.collection("employees").get();
  if (empSnapshot.size > 0) {
    const batches = [];
    let batch = null;
    let count = 0;

    empSnapshot.forEach((doc) => {
      if (!batch) batch = db.batch();
      batch.delete(doc.ref);
      count++;
      if (count >= 500) {
        batches.push(batch.commit());
        batch = null;
        count = 0;
      }
    });
    if (batch) batches.push(batch.commit());
    await Promise.all(batches);

    console.log(`  Da xoa ${empSnapshot.size} document(s) trong 'employees'.\n`);
  } else {
    console.log("  Collection 'employees' da trong.\n");
  }

  // 3. Delete all users collection
  console.log("[3/3] Dang xoa Firestore 'users'...");
  const usersSnapshot = await db.collection("users").get();
  if (usersSnapshot.size > 0) {
    const batches = [];
    let batch = null;
    let count = 0;

    usersSnapshot.forEach((doc) => {
      if (!batch) batch = db.batch();
      batch.delete(doc.ref);
      count++;
      if (count >= 500) {
        batches.push(batch.commit());
        batch = null;
        count = 0;
      }
    });
    if (batch) batches.push(batch.commit());
    await Promise.all(batches);

    console.log(`  Da xoa ${usersSnapshot.size} document(s) trong 'users'.\n`);
  } else {
    console.log("  Collection 'users' da trong.\n");
  }

  console.log("===========================================");
  console.log("  XOA DU LIEU HOAN TAT");
  console.log("===========================================");
  console.log(`\nDa xoa tong cong: ${totalDeleted} tai khoan.\n`);
}

deleteAllEmployees().catch((err) => {
  console.error("\nLoi:", err.message);
  process.exit(1);
});
