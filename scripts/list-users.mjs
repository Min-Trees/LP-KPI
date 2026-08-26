import { readFileSync } from "fs";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin");
const { cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

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

async function listAll() {
  console.log("=== AUTH USERS ===");
  let pageToken;
  let total = 0;
  do {
    const result = await auth.listUsers(100, pageToken);
    for (const u of result.users) {
      console.log(`uid=${u.uid} email=${u.email} name=${u.displayName || "(no name)"}`);
      total++;
    }
    pageToken = result.pageToken;
  } while (pageToken);
  console.log(`Total: ${total}\n`);

  console.log("=== FIRESTORE users/ ===");
  const usersSnap = await db.collection("users").get();
  usersSnap.forEach((doc) => {
    const d = doc.data();
    console.log(`id=${doc.id} email=${d.email} role=${d.role} name=${d.displayName}`);
  });
  console.log(`Total: ${usersSnap.size}\n`);

  console.log("=== FIRESTORE employees/ ===");
  const empSnap = await db.collection("employees").get();
  empSnap.forEach((doc) => {
    const d = doc.data();
    console.log(`id=${doc.id} email=${d.email} role=${d.role} name=${d.fullName} branch=${d.branch}`);
  });
  console.log(`Total: ${empSnap.size}`);
}

listAll().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });