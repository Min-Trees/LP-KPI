/**
 * Script tao tai khoan admin
 * Run: node create-admin.js
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

const now = new Date().toISOString();

async function createAdmin() {
  const email = "admin@littlepeople.edu.vn";
  const password = "Admin@2026";
  const fullName = "Quản trị viên";
  const code = "ADMIN001";
  const branch = "LAI_THIEU";

  console.log("\n===========================================");
  console.log("  TAO TAI KHOAN ADMIN");
  console.log("===========================================\n");

  try {
    // 1. Check if user exists
    try {
      const existing = await auth.getUserByEmail(email);
      console.log(`User ${email} da ton tai (UID: ${existing.uid})`);
      console.log("\nXoa user cu truoc...");
      await auth.deleteUser(existing.uid);
    } catch (e) {
      // User doesn't exist, that's fine
    }

    // 2. Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
    });

    console.log(`\n[1/3] Da tao Firebase Auth user: ${userRecord.uid}`);

    // 3. Create users/{uid} document
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName: fullName,
      role: "ADMIN",
      program: null,
      department: "Quan tri",
      departmentType: null,
      branch,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    console.log("[2/3] Da tao document users/...");

    // 4. Create employees/{uid} document
    await db.collection("employees").doc(userRecord.uid).set({
      id: userRecord.uid,
      uid: userRecord.uid,
      code,
      fullName,
      email,
      department: "Quan tri",
      departmentType: null,
      position: "Quan tri he thong",
      program: null,
      role: "ADMIN",
      branch,
      status: "ACTIVE",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    console.log("[3/3] Da tao document employees/...");

    console.log("\n===========================================");
    console.log("  TAO TAI KHOAN ADMIN THANH CONG!");
    console.log("===========================================\n");
    console.log("Thong tin dang nhap:");
    console.log(`  Email:    ${email}`);
    console.log(`  Mat khau: ${password}`);
    console.log(`  UID:      ${userRecord.uid}`);
    console.log("\n");
  } catch (err) {
    console.error("\nLoi:", err.message);
    process.exit(1);
  }
}

createAdmin();
