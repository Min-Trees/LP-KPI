/**
 * Seed script — Tạo Firebase Auth accounts + Firestore documents
 * cho TẤT CẢ 32 nhân viên từ "Bảng chấm KPI 1.xlsx"
 * (Tên đã decode chính xác từ Excel)
 *
 * Usage:
 *   npm install --save-dev firebase-admin
 *   firebase login
 *   node scripts/seedAccounts.mjs
 *
 * ⚠ Mật khẩu mặc định: "Kpi@2026" — bắt buộc đổi sau lần đầu login
 * ⚠ Confirm trước khi tạo (gõ YES để tiếp tục)
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const SERVICE_ACCOUNT_PATH = resolve("lp-kpi-edb40-firebase-adminsdk-fbsvc-f30de5a5a8.json");

// ──────────────────────────────────────────────────────────────
// Danh sách nhân viên — TÊN ĐÚNG đã decode từ Excel
// ──────────────────────────────────────────────────────────────

const employees = [
  // ══ ADMIN ════════════════════════════════════════════════════
  { code: "0000", name: "Admin",                   role: "ADMIN",  department: "Quản trị" },

  // ══ BOARD (Manager) ══════════════════════════════════════
  // ⚠ 1001 dùng VLOOKUP từ file Bảng lương LC (ngoài workbook).
  //    Điền tên thực tế hoặc giữ placeholder.
  { code: "1001", name: "Nguyễn Văn A",            role: "BOARD", department: "Ban Giám đốc" },
  { code: "1002", name: "Hồ Ngọc Mỹ Trinh",         role: "BOARD", department: "Ban Giám đốc" },
  { code: "1003", name: "Trần Thị Tuyết Linh",       role: "BOARD", department: "Ban Giám đốc" },

  // ══ OPERATION_MANAGER (Văn phòng + Hỗ trợ) ══════════
  { code: "1004", name: "Nguyễn Lý Phương Uyên",   role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1005", name: "Huỳnh Phát Lộc",            role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1023", name: "Lê Thị Trường An",         role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1024", name: "Hoàng Đình Chinh",           role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1025", name: "Võ Thị Quít",               role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1026", name: "Nguyễn Thị Kiều Trinh",    role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1029", name: "Nguyễn Thị Lệ Dung",       role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ", departmentType: "Y tế" },
  { code: "4001", name: "Huỳnh Thị Vân Trang",      role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "4002", name: "Ngô Thị Ánh Tuyết",        role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },

  // ══ PROGRAM_MANAGER — HS ═══════════════════════════════
  { code: "1006", name: "Lê Thị Thanh Mai",          role: "PROGRAM_MANAGER", department: "Giáo viên", program: "HS" },
  { code: "1007", name: "Nguyễn Thị Thắm",          role: "PROGRAM_MANAGER", department: "Giáo viên", program: "HS" },
  { code: "1008", name: "Nguyễn Thị Băng Tâm",     role: "PROGRAM_MANAGER", department: "Giáo viên", program: "HS" },
  { code: "1009", name: "Nguyễn Kim Ngân",          role: "PROGRAM_MANAGER", department: "Giáo viên", program: "HS" },
  { code: "1010", name: "Bế Thị Ngọc Diễm",         role: "PROGRAM_MANAGER", department: "Giáo viên", program: "HS" },
  { code: "1011", name: "Lê Thị Ngọc Tuyết",        role: "PROGRAM_MANAGER", department: "Giáo viên", program: "HS" },

  // ══ PROGRAM_MANAGER — ST ═══════════════════════════════
  { code: "1012", name: "Nguyễn Thị Mai Hương",     role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1013", name: "Lê Thị Kim Nguyên",         role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1014", name: "Trần Thái Thiên Thảo",      role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1015", name: "Nguyễn Thị Thu Huyền",     role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1016", name: "Vương Thanh Hà Trang",    role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1017", name: "Trần Thị Thanh Trúc",      role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1018", name: "Phạm Huỳnh Anh Thư",      role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1019", name: "Thạch Thảo",               role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1020", name: "Nguyễn Thị Hồng Thi",      role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1021", name: "Võ Lê Thị Huyền Trang",    role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  { code: "1022", name: "Danh Thị Thùy Trang",       role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST" },
  // Thử việc
  { code: "1027", name: "Nguyễn Thị Thuỳ Trang",   role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST", departmentType: "Thử việc" },
  { code: "1028", name: "Hà Thị Kim Ngân",           role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST", departmentType: "Thử việc" },
  { code: "1030", name: "Nguyễn Bùi Tường Vy",     role: "PROGRAM_MANAGER", department: "Giáo viên", program: "ST", departmentType: "Thử việc" },
];

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".");
}

function makeEmail(emp) {
  return `${slugify(emp.name)}.${emp.code}@kpi.local`.toLowerCase();
}

function makeDisplayName(emp) {
  return emp.name.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

function roleLabel(role, program) {
  if (role === "ADMIN")  return "🔑 ADMIN";
  if (role === "BOARD") return "👔 BOARD";
  if (role === "OPERATION_MANAGER") return "🏢 OP";
  return `📚 PM ${program ?? ""}`;
}

async function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => { rl.close(); resolve(ans); });
  });
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

async function main() {
  // Init Firebase Admin SDK — dùng service account key
  if (!existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`❌ Không tìm thấy service account key:\n   ${SERVICE_ACCOUNT_PATH}\n   Tải từ Firebase Console → Project Settings → Service accounts → Generate new private key`);
    process.exit(1);
  }
  try {
    initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
    console.log(`Firebase Admin initialized (service account: ${SERVICE_ACCOUNT_PATH})`);
  } catch (err) {
    console.error(`❌ Không thể init Firebase Admin: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const auth = getAuth();
  const db = getFirestore();
  const now = new Date().toISOString();

  // ── Summary ───────────────────────────────────────────
  const admin = employees.filter((e) => e.role === "ADMIN");
  const board = employees.filter((e) => e.role === "BOARD");
  const op = employees.filter((e) => e.role === "OPERATION_MANAGER");
  const gvHS = employees.filter((e) => e.program === "HS");
  const gvST = employees.filter((e) => e.program === "ST");
  const tvST = gvST.filter((e) => e.departmentType === "Thử việc");

  console.log(`
╔══════════════════════════════════════════════════════════╗
║       KPI System — Seed Firebase Accounts                  ║
╠══════════════════════════════════════════════════════════╣
║  🔑 Quản trị           : ${String(admin.length).padStart(2)} accounts
║  👔 Ban Giám đốc        : ${String(board.length).padStart(2)} accounts
║  🏢 VP + Hỗ trợ       : ${String(op.length).padStart(2)} accounts
║  📚 Giáo viên HS       : ${String(gvHS.length).padStart(2)} accounts
║  📚 Giáo viên ST       : ${String(gvST.length).padStart(2)} accounts (${String(tvST.length).padStart(2)} thử việc)
║  ────────────────────────────────────────────────────────║
║  TỔNG CỘNG           : ${String(employees.length).padStart(2)} accounts
║  ────────────────────────────────────────────────────────║
║  Mật khẩu mặc định : Kpi@2026
║  Email pattern       : ten.ho.lot.{maNV}@kpi.local
╚══════════════════════════════════════════════════════════╝
`);

  const confirm = await prompt(
    `\n⚠  Tạo ${employees.length} accounts + Firestore docs? (gõ YES để xác nhận): `,
  );
  if (confirm.trim() !== "YES") {
    console.log("❌ Đã hủy.");
    return;
  }

  // ── Check existing ───────────────────────────────────
  const existing = await auth.listUsers();
  const existingEmails = new Set(existing.users.map((u) => u.email ?? ""));

  const created = [];
  const skipped = [];
  const failed = [];

  for (const emp of employees) {
    const email = makeEmail(emp);
    const displayName = makeDisplayName(emp);

    if (existingEmails.has(email)) {
      skipped.push(`${email} (${emp.code})`);
      console.log(`  ⏭  ${email.padEnd(45)} — đã tồn tại`);
      continue;
    }

    try {
      // 1. Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password: "Kpi@2026",
        displayName,
        disabled: false,
      });

      // 2. Firestore: users/{uid}
      await db.doc(`users/${userRecord.uid}`).set({
        uid: userRecord.uid,
        email,
        displayName,
        role: emp.role,
        program: emp.program ?? null,
        department: emp.department,
        departmentType: emp.departmentType ?? null,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });

      // 3. Firestore: employees/{uid}
      await db.doc(`employees/${userRecord.uid}`).set({
        id: userRecord.uid,
        code: emp.code,
        fullName: displayName,
        email,
        department: emp.department,
        departmentType: emp.departmentType ?? null,
        program: emp.program ?? null,
        position: null,
        managerId: null,
        role: emp.role,
        status: "ACTIVE",
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const label = roleLabel(emp.role, emp.program);
      const type = emp.departmentType ? ` (${emp.departmentType})` : "";
      created.push(`${email} | ${emp.code} | ${label}${type}`);
      console.log(`  ✅ ${email.padEnd(45)} | ${emp.code} | ${label}${type}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push(`${email}: ${msg}`);
      console.log(`  ❌ ${email}: ${msg}`);
    }
  }

  // ── Kết quả ──────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                    Kết quả                             ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Tạo mới  : ${String(created.length).padStart(3)}                                             ║
║  ⏭  Bỏ qua   : ${String(skipped.length).padStart(3)}  (đã tồn tại)                         ║
║  ❌ Thất bại : ${String(failed.length).padStart(3)}                                             ║
╚══════════════════════════════════════════════════════════╝
`);

  if (created.length > 0) {
    console.log("📋 Tài khoản đã tạo:");
    for (const c of created) console.log("   " + c);
  }
  if (failed.length > 0) {
    console.log("\n⚠  Lỗi cần xử lý thủ công:");
    for (const f of failed) console.log("   " + f);
  }

  console.log("\n🔑 Mật khẩu tất cả: Kpi@2026");
  console.log("⚠  Yêu cầu user ĐỔI MẬT KHẨU sau lần đầu đăng nhập.\n✅ Hoàn tất.\n");
}

main().catch((err) => {
  console.error("❌ Lỗi nghiêm trọng:", err);
  process.exit(1);
});
