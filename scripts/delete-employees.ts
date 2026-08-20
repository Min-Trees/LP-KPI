/**
 * Delete all employees and users
 * Usage: npm run delete:employees
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
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

const emails = [
  "nguyenhuynhthuminh@littlepeople.edu.vn",
  "nguyenhuynhduy@littlepeople.edu.vn",
  "hongocmytrinh@littlepeople.edu.vn",
  "tranthituyetlinh@littlepeople.edu.vn",
  "nguyenlyphuonguyen@littlepeople.edu.vn",
  "huynhphatloc@littlepeople.edu.vn",
  "lethitruongan@littlepeople.edu.vn",
  "hoangdinhchinh@littlepeople.edu.vn",
  "vothiquit@littlepeople.edu.vn",
  "nguyenthikieutrinh@littlepeople.edu.vn",
  "nguyenthiledung@littlepeople.edu.vn",
  "huynhthivantrang@littlepeople.edu.vn",
  "ngothianhtuyet@littlepeople.edu.vn",
  "lethithanhmai@littlepeople.edu.vn",
  "nguyenthitham@littlepeople.edu.vn",
  "nguyenthbangtam@littlepeople.edu.vn",
  "nguyenkimngan@littlepeople.edu.vn",
  "bethingocdiem@littlepeople.edu.vn",
  "lethingoctuyet@littlepeople.edu.vn",
  "nguyenthimaihuong@littlepeople.edu.vn",
  "lethikimnguyen@littlepeople.edu.vn",
  "tranthaithienthao@littlepeople.edu.vn",
  "nguyenthithuhuyen@littlepeople.edu.vn",
  "vuongthanhtrang@littlepeople.edu.vn",
  "tranthithanhtruc@littlepeople.edu.vn",
  "phamhuynhanhthu@littlepeople.edu.vn",
  "thachthao@littlepeople.edu.vn",
  "nguyenthihong@littlepeople.edu.vn",
  "thivo@littlepeople.edu.vn",
  "lethihuyentrang@littlepeople.edu.vn",
  "danhthithuytrang@littlepeople.edu.vn",
  "nguyenthithuytrang@littlepeople.edu.vn",
  "hathikimngan@littlepeople.edu.vn",
  "nguyenbuituongvy@littlepeople.edu.vn",
];

async function deleteAll() {
  console.log("Deleting all employees...\n");

  for (const email of emails) {
    try {
      const user = await auth.getUserByEmail(email);
      
      // Delete Firestore docs
      await db.doc(`employees/${user.uid}`).delete();
      await db.doc(`users/${user.uid}`).delete();
      
      // Delete Auth user
      await auth.deleteUser(user.uid);
      
      console.log(`✓ Deleted: ${email}`);
    } catch (e: any) {
      console.log(`○ Not found or already deleted: ${email}`);
    }
  }

  console.log("\n=== Delete Complete ===");
}

deleteAll().catch(console.error);
