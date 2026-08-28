/**
 * Create Admin Account Script
 * Usage: npx tsx scripts/create-admin.ts <email> <password> [displayName]
 * Example: npx tsx scripts/create-admin.ts admin@school.com Kpi@2026 "Admin System"
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "..", "lp-kpi-edb40-firebase-adminsdk-fbsvc-f30de5a5a8.json"), "utf-8"),
);

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const auth = getAuth();

async function createAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║            Create Admin Account                           ║
╠══════════════════════════════════════════════════════════╣
║  Usage: npx tsx scripts/create-admin.ts <email> <pass>   ║
║  Example:                                                 ║
║    npx tsx scripts/create-admin.ts admin@school.com     ║
║             Kpi@2026 "Admin System"                     ║
╚══════════════════════════════════════════════════════════╝
`);
    return;
  }

  const email = args[0];
  const password = args[1];
  const displayName = args[2] || "Admin";
  const now = new Date().toISOString();

  console.log(`\n🔧 Firebase Project: ${serviceAccount.project_id}`);
  console.log(`📧 Email: ${email}`);
  console.log(`👤 Display Name: ${displayName}\n`);

  try {
    // 1. Check if user exists
    try {
      const existing = await auth.getUserByEmail(email);
      console.log(`⚠️  User already exists: ${existing.email}`);
      console.log(`    UID: ${existing.uid}`);
      console.log(`\n❌ Cannot create. User already exists.`);
      return;
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "auth/user-not-found") {
        throw e;
      }
    }

    // 2. Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      disabled: false,
    });
    console.log(`✅ Created Auth user: ${userRecord.uid}`);

    // 3. Create Firestore users/{uid}
    await db.doc(`users/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email,
      displayName,
      role: "ADMIN",
      program: null,
      department: "Quản trị",
      departmentType: null,
      branch: "LAI_CHAU", // Required field
      status: "ACTIVE",
      permissions: ["*"], // Full permissions
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✅ Created Firestore user document`);

    // 4. Create Firestore employees/{uid}
    await db.doc(`employees/${userRecord.uid}`).set({
      id: userRecord.uid,
      code: `ADMIN_${Date.now()}`,
      fullName: displayName,
      email,
      phone: null,
      department: "Quản trị",
      departmentType: null,
      position: "Quản trị hệ thống",
      program: null,
      managerId: null,
      role: "ADMIN",
      branch: "LAI_CHAU",
      status: "ACTIVE",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✅ Created Firestore employee document`);

    console.log(`
╔══════════════════════════════════════════════════════════╗
║              ✅ Admin Account Created!                    ║
╠══════════════════════════════════════════════════════════╣
║  Email     : ${email.padEnd(46)} ║
║  Password  : ${password.padEnd(46)} ║
║  UID       : ${userRecord.uid.padEnd(46)} ║
║  Role      : ADMIN                                        ║
╚══════════════════════════════════════════════════════════╝
`);
  } catch (err) {
    console.error(`\n❌ Error:`, err);
    process.exit(1);
  }
}

createAdmin();
