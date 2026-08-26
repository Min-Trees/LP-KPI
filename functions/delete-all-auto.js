/**
 * Script xoa tat ca du lieu, CHI GIU LAI KPI templates
 * Auto-confirm: tu dong xoa khong can xac nhan
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

async function deleteAllData() {
  console.log("\n===========================================");
  console.log("  XOA TOAN BO DU LIEU (GIU LAI KPI TEMPLATES)");
  console.log("===========================================\n");

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

  // Helper function to delete collection
  async function deleteCollection(collectionName) {
    console.log(`[X] Dang xoa '${collectionName}'...`);
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.size > 0) {
      const batches = [];
      let batch = null;
      let count = 0;

      snapshot.forEach((doc) => {
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
      console.log(`  Da xoa ${snapshot.size} document(s).\n`);
    } else {
      console.log(`  Collection '${collectionName}' da trong.\n`);
    }
  }

  // Delete all collections EXCEPT kpiTemplates
  const collectionsToDelete = [
    "employees",
    "users", 
    "kpiPeriods",
    "kpiRecords",
    "notifications",
    "auditLogs"
  ];

  for (const coll of collectionsToDelete) {
    await deleteCollection(coll);
  }

  console.log("===========================================");
  console.log("  XOA DU LIEU HOAN TAT");
  console.log("===========================================");
  console.log(`\nDa xoa: ${totalDeleted} tai khoan, cac collection KPI.\n`);
  console.log("KEP LAI: kpiTemplates (mau KPI)\n");
}

deleteAllData().catch((err) => {
  console.error("\nLoi:", err.message);
  process.exit(1);
});
