/**
 * Create admin account
 * Usage: npm run create-admin
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";

async function main() {
  // Load service account credentials
  const serviceAccountPath = path.join(process.cwd(), "lp-kpi-edb40-firebase-adminsdk-fbsvc-f30de5a5a8.json");
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Service account key not found:", serviceAccountPath);
    console.log("   Download from: Firebase Console > Project Settings > Service Accounts > Generate new key");
    process.exit(1);
  }
  
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  
  initializeApp({
    credential: cert(serviceAccount),
  });

  const auth = getAuth();
  const db = getFirestore();
  const now = new Date().toISOString();

  const email = "admin@littlepeople.edu.vn";
  const password = "littlepeople";
  const displayName = "Administrator";

  try {
    // Check if user exists
    try {
      const existing = await auth.getUserByEmail(email);
      console.log(`✅ User ${email} already exists (uid: ${existing.uid})`);
      
      // Update Firestore
      await db.doc(`users/${existing.uid}`).set({
        uid: existing.uid,
        email,
        displayName,
        role: "ADMIN",
        program: null,
        department: "Ban Giám đốc",
        departmentType: null,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
      
      console.log("Updated Firestore document");
      return;
    } catch (e: any) {
      if (e.code !== "auth/user-not-found") throw e;
    }

    // Create new user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      disabled: false,
    });

    console.log(`Created user: ${userRecord.uid}`);

    // Create Firestore documents
    await db.doc(`users/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email,
      displayName,
      role: "ADMIN",
      program: null,
      department: "Ban Giám đốc",
      departmentType: null,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    await db.doc(`employees/${userRecord.uid}`).set({
      id: userRecord.uid,
      code: "ADMIN",
      fullName: displayName,
      email,
      department: "Ban Giám đốc",
      departmentType: null,
      program: null,
      position: "Administrator",
      managerId: null,
      role: "ADMIN",
      status: "ACTIVE",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`
╔══════════════════════════════════════════════════════════╗
║              Admin account created!                        ║
╠══════════════════════════════════════════════════════════╣
║  Email    : ${email.padEnd(46)}║
║  Password : littlepeople                             ║
╚══════════════════════════════════════════════════════════╝
`);
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
