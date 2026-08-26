/**
 * Seed script - Tạo Firebase Auth accounts + Firestore documents
 * cho TẤT CẢ nhân viên theo mã và chức vụ chính xác
 *
 * Usage:
 *   npm install --save-dev firebase-admin
 *   firebase login
 *   npm run seed:accounts
 *
 * ⚠ Mật khẩu mặc định: "Kpi@2026" - bắt buộc đổi sau lần đầu login
 */

const admin = require("firebase-admin");
const readline = require("readline");

const employees = [
  // ══ MANAGER (Ban Giám đốc) ════════════════════════════
  { code: "1001", name: "Châu Nguyễn Kim Yến",   role: "BOARD", department: "Ban Giám đốc" },
  { code: "1002", name: "Hồ Ngọc Mỹ Trinh",        role: "BOARD", department: "Ban Giám đốc" },
  { code: "1003", name: "Trần Thị Tuyết Linh",      role: "BOARD", department: "Ban Giám đốc" },

  // ══ Văn phòng + Hỗ trợ ═══════════════════════════════
  { code: "1004", name: "Nguyễn Lý Phương Uyên",  role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1005", name: "Huỳnh Phát Lộc",           role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1023", name: "Lê Thị Trường An",         role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1024", name: "Hoàng Đình Chinh",          role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1025", name: "Võ Thị Quít",              role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1026", name: "Nguyễn Thị Kiều Trinh",   role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "1029", name: "Nguyễn Thị Lệ Dung",      role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ", departmentType: "Y tế" },
  { code: "4001", name: "Huỳnh Thị Vân Trang",     role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },
  { code: "4002", name: "Ngô Thị Ánh Tuyết",       role: "OPERATION_MANAGER", department: "Văn phòng + Hỗ trợ" },

  // ══ Giáo viên HS (PROGRAM_MANAGER_HS) ═════════════════
  { code: "1006", name: "Lê Thị Thanh Mai",         role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },
  { code: "1007", name: "Nguyễn Thị Thắm",         role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },
  { code: "1008", name: "Nguyễn Thị Băng Tâm",    role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },
  { code: "1009", name: "Nguyễn Kim Ngân",         role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },
  { code: "1010", name: "Bế Thị Ngọc Diễm",        role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },
  { code: "1011", name: "Lê Thị Ngọc Tuyết",       role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },

  // ══ Giáo viên ST (PROGRAM_MANAGER_ST) ═════════════════
  { code: "1012", name: "Nguyễn Thị Mai Hương",    role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1013", name: "Lê Thị Kim Nguyên",        role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1014", name: "Trần Thái Thiên Thảo",     role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1015", name: "Nguyễn Thị Thu Huyền",    role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1016", name: "Vương Thanh Hà Trang",   role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1017", name: "Trần Thị Thanh Trúc",     role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1018", name: "Phạm Huỳnh Anh Thư",     role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1019", name: "Thạch Thảo",              role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1020", name: "Nguyễn Thị Hồng Thi",     role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1021", name: "Võ Lê Thị Huyền Trang",   role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1022", name: "Danh Thị Thùy Trang",      role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  // Thử việc
  { code: "1027", name: "Nguyễn Thị Thuỳ Trang",  role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST", departmentType: "Thử việc" },
  { code: "1028", name: "Hà Thị Kim Ngân",          role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST", departmentType: "Thử việc" },
  { code: "1030", name: "Nguyễn Bùi Tường Vy",    role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST", departmentType: "Thử việc" },
];

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

async function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => { rl.close(); resolve(ans); });
  });
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: "lp-kpi-edb40" });
  }

  const auth = admin.auth();
  const db = admin.firestore();
  const now = new Date().toISOString();

  const board = employees.filter((e) => e.role === "BOARD");
  const op = employees.filter((e) => e.role === "OPERATION_MANAGER");
  const gvHS = employees.filter((e) => e.program === "HS");
  const gvST = employees.filter((e) => e.program === "ST");
  const tvST = gvST.filter((e) => e.departmentType === "Thử việc");

  console.log(`
╔══════════════════════════════════════════════════════════╗
║       KPI System - Seed Firebase Accounts               ║
╠══════════════════════════════════════════════════════════╣
║  Ban Giám đốc          : ${String(board.length).padStart(2)} accounts
║  VP + Hỗ trợ          : ${String(op.length).padStart(2)} accounts
║  Giáo viên HS          : ${String(gvHS.length).padStart(2)} accounts
║  Giáo viên ST          : ${String(gvST.length).padStart(2)} accounts (${String(tvST.length).padStart(2)} thử việc)
║  ──────────────────────────────────────────────────────║
║  TỔNG CỘNG            : ${String(employees.length).padStart(2)} accounts
║  ──────────────────────────────────────────────────────║
║  Mật khẩu mặc định    : Kpi@2026
║  Email pattern        : ten.ho.lot.{maNV}@kpi.local
╚══════════════════════════════════════════════════════════╝
`);

  const confirm = await prompt(
    "Tao " + employees.length + " accounts? (go YES de xac nhan): ",
  );
  if (confirm.trim() !== "YES") {
    console.log("Da huy.");
    return;
  }

  const existing = await auth.listUsers();
  const existingEmails = new Set(existing.users.map((u) => u.email ?? ""));

  const created = [];
  const skipped = [];
  const failed = [];

  for (const emp of employees) {
    const email = makeEmail(emp);
    const displayName = emp.name;

    if (existingEmails.has(email)) {
      skipped.push(`${email} (${emp.code})`);
      console.log(`  ⏭  ${email.padEnd(48)} - da ton tai`);
      continue;
    }

    try {
      const userRecord = await auth.createUser({
        email,
        password: "Kpi@2026",
        displayName,
        disabled: false,
      });

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

      const emoji = emp.role === "BOARD" ? "👔" : emp.role === "OPERATION_MANAGER" ? "🏢" : "📚";
      const type = emp.departmentType ? ` (${emp.departmentType})` : "";
      created.push(`${email} | ${emp.code} | ${emoji}${type}`);
      console.log(`  ✅ ${email.padEnd(48)} | ${emp.code} | ${emoji}${type}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failed.push(`${email}: ${msg}`);
      console.log(`  ❌ ${email}: ${msg}`);
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════════╗
║                    Kết quả                              ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Tao moi  : ${String(created.length).padStart(3)}                                               ║
║  ⏭  Bo qua   : ${String(skipped.length).padStart(3)}  (da ton tai)                               ║
║  ❌ That bai : ${String(failed.length).padStart(3)}                                               ║
╚══════════════════════════════════════════════════════════╝
`);

  if (failed.length > 0) {
    console.log("⚠  Lỗi:");
    for (const f of failed) console.log("   " + f);
  }

  console.log("\n🔑 Mat khau tat ca: Kpi@2026\n✅ Hoan tat.\n");
}

main().catch((err) => {
  console.error("❌ Loi:", err);
  process.exit(1);
});
