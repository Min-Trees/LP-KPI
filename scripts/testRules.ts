/**
 * Security Rules smoke test (yêu cầu Firebase Emulator đang chạy).
 *
 * Usage:
 *   npm install --save-dev @firebase/rules-unit-testing
 *   npm run emulators   (terminal khác)
 *   npm run test:rules
 */

// @ts-nocheck
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";

async function main() {
  const rules = readFileSync("./firestore.rules", "utf8");
  const env = await initializeTestEnvironment({
    projectId: "demo-kpi-test",
    firestore: { rules },
  });

  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users", "admin-uid"), {
      email: "admin@test.com",
      displayName: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    });
    await setDoc(doc(ctx.firestore(), "users", "board-uid"), {
      email: "board@test.com",
      role: "BOARD",
      status: "ACTIVE",
    });
    await setDoc(doc(ctx.firestore(), "users", "op-uid"), {
      email: "op@test.com",
      role: "OPERATION_MANAGER",
      status: "ACTIVE",
    });
    await setDoc(doc(ctx.firestore(), "users", "employee-uid"), {
      email: "emp@test.com",
      role: "EMPLOYEE",
      status: "ACTIVE",
    });
  });

  const unauthed = env.unauthenticatedContext();
  const adminCtx = env.authenticatedContext("admin-uid");
  const boardCtx = env.authenticatedContext("board-uid");
  const opCtx = env.authenticatedContext("op-uid");
  const empCtx = env.authenticatedContext("employee-uid");

  const adminDb = adminCtx.firestore();
  const boardDb = boardCtx.firestore();
  const opDb = opCtx.firestore();
  const empDb = empCtx.firestore();
  const unauthDb = unauthed.firestore();

  console.log("\n=== Test 1: Unauth read /users ===");
  await assertFails(getDoc(doc(unauthDb, "users", "admin-uid")));

  console.log("=== Test 2: Employee read own /users ===");
  await assertSucceeds(getDoc(doc(empDb, "users", "employee-uid")));

  console.log("=== Test 3: Admin create /employees ===");
  await assertSucceeds(setDoc(doc(adminDb, "employees", "new-emp"), {
    code: "TEST", fullName: "Test", email: "t@x.com",
    department: "Test", role: "EMPLOYEE", status: "ACTIVE",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }));

  console.log("=== Test 4: Non-admin create /employees ===");
  await assertFails(setDoc(doc(empDb, "employees", "x"), { code: "X", fullName: "X", email: "x@x.com", department: "x", role: "EMPLOYEE", status: "ACTIVE", createdAt: "", updatedAt: "" }));

  console.log("=== Test 5: Employee create kpi_records ===");
  await assertFails(setDoc(doc(empDb, "kpi_records", "rec-1"), {
    employeeId: "employee-uid", periodId: "p1", templateId: "t1",
    templateVersion: 1, status: "IN_PROGRESS", createdBy: "employee-uid",
    createdAt: "", updatedAt: "", criteria: [], kpiScore: 0,
    bonusPercent: 0, rank: "DAT", templateType: "manager",
  }));

  console.log("=== Test 6: Board create kpi_records (manager) ===");
  await assertSucceeds(setDoc(doc(boardDb, "kpi_records", "rec-2"), {
    employeeId: "somebody", periodId: "p1", templateId: "t1",
    templateVersion: 1, status: "IN_PROGRESS", createdBy: "board-uid",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    criteria: [], kpiScore: 0, bonusPercent: 0, rank: "DAT",
    templateType: "manager",
  }));

  console.log("=== Test 7: Operation manager create kpi_records (office_support) ===");
  await assertSucceeds(setDoc(doc(opDb, "kpi_records", "rec-3"), {
    employeeId: "somebody", periodId: "p1", templateId: "t1",
    templateVersion: 1, status: "IN_PROGRESS", createdBy: "op-uid",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    criteria: [], kpiScore: 0, bonusPercent: 0, rank: "DAT",
    templateType: "office_support",
  }));

  console.log("=== Test 8: Operation manager cannot create manager_kpi ===");
  await assertFails(setDoc(doc(opDb, "kpi_records", "rec-4"), {
    employeeId: "somebody", periodId: "p1", templateId: "t1",
    templateVersion: 1, status: "IN_PROGRESS", createdBy: "op-uid",
    createdAt: "", updatedAt: "", criteria: [], kpiScore: 0,
    bonusPercent: 0, rank: "DAT", templateType: "manager",
  }));

  console.log("\n✅ Tất cả security rules tests PASS");
  await env.cleanup();
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});