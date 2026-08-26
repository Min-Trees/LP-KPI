/**
 * Script xoa tat ca du lieu, CHI GIU LAI KPI templates
 * 
 * Run: node scripts/delete-all-except-templates.mjs
 *
 * CANH BAC: Day la thao tac XOA VUNG KHONG HOAN TAC!
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccount = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "lp-kpi-edb40-firebase-adminsdk-fbsvc-f30de5a5a8.json"),
    "utf8"
  )
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function ask(question) {
  const readline = require("readline");
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

async function deleteAllExceptTemplates() {
  console.log("\n===========================================");
  console.log("  XOA TOAN BO DU LIEU (GIU LAI KPI TEMPLATES)");
  console.log("===========================================\n");
  console.log("Script nay se xoa:");
  console.log("  - Tat ca tai khoan Firebase Auth");
  console.log("  - Tat ca documents trong 'employees'");
  console.log("  - Tat ca documents trong 'users'");
  console.log("  - Tat ca documents trong 'kpiPeriods'");
  console.log("  - Tat ca documents trong 'kpiRecords'");
  console.log("  - Tat ca documents trong 'notifications'");
  console.log("\nSE GIU LAI:");
  console.log("  - 'kpiTemplates' (mau KPI)");
  console.log("\nCANH BAC: Thao tac nay KHONG THE HOAN TAC!\n");

  const confirm = await ask("Nhap 'YES' de xac nhan xoa: ");

  if (confirm.trim() !== "YES") {
    console.log("Da huy bo thao tac xoa.");
    process.exit(0);
  }

  console.log("\nBat dau xoa...\n");

  // 1. Delete all Firebase Auth users
  console.log("[1/6] Dang xoa Firebase Auth users...");
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

  // 2. Delete employees collection
  console.log("[2/6] Dang xoa 'employees'...");
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
    console.log(`  Da xoa ${empSnapshot.size} document(s).\n`);
  } else {
    console.log("  Collection 'employees' da trong.\n");
  }

  // 3. Delete users collection
  console.log("[3/6] Dang xoa 'users'...");
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
    console.log(`  Da xoa ${usersSnapshot.size} document(s).\n`);
  } else {
    console.log("  Collection 'users' da trong.\n");
  }

  // 4. Delete kpiPeriods collection
  console.log("[4/6] Dang xoa 'kpiPeriods'...");
  const kpiPeriodsSnapshot = await db.collection("kpiPeriods").get();
  if (kpiPeriodsSnapshot.size > 0) {
    const batches = [];
    let batch = null;
    let count = 0;

    kpiPeriodsSnapshot.forEach((doc) => {
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
    console.log(`  Da xoa ${kpiPeriodsSnapshot.size} document(s).\n`);
  } else {
    console.log("  Collection 'kpiPeriods' da trong.\n");
  }

  // 5. Delete kpiRecords collection
  console.log("[5/6] Dang xoa 'kpiRecords'...");
  const kpiRecordsSnapshot = await db.collection("kpiRecords").get();
  if (kpiRecordsSnapshot.size > 0) {
    const batches = [];
    let batch = null;
    let count = 0;

    kpiRecordsSnapshot.forEach((doc) => {
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
    console.log(`  Da xoa ${kpiRecordsSnapshot.size} document(s).\n`);
  } else {
    console.log("  Collection 'kpiRecords' da trong.\n");
  }

  // 6. Delete notifications collection
  console.log("[6/6] Dang xoa 'notifications'...");
  const notifSnapshot = await db.collection("notifications").get();
  if (notifSnapshot.size > 0) {
    const batches = [];
    let batch = null;
    let count = 0;

    notifSnapshot.forEach((doc) => {
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
    console.log(`  Da xoa ${notifSnapshot.size} document(s).\n`);
  } else {
    console.log("  Collection 'notifications' da trong.\n");
  }

  console.log("===========================================");
  console.log("  XOA DU LIEU HOAN TAT");
  console.log("===========================================");
  console.log(`\nDa xoa: ${totalDeleted} tai khoan, cac collection KPI.\n`);
  console.log("KEP LAI: kpiTemplates (mau KPI)\n");
}

deleteAllExceptTemplates().catch((err) => {
  console.error("\nLoi:", err.message);
  process.exit(1);
});
