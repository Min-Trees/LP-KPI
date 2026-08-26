/**
 * Auto seed - Tao accounts voi service account
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
  { code: "1008", name: "Nguyễn Thị Băng Tâm",     role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },
  { code: "1009", name: "Nguyễn Kim Ngân",           role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },
  { code: "1010", name: "Bế Thị Ngọc Diễm",          role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },
  { code: "1011", name: "Lê Thị Ngọc Tuyết",         role: "PROGRAM_MANAGER_HS", department: "Giáo viên HS", program: "HS" },

  // ══ Giáo viên ST (PROGRAM_MANAGER_ST) ═════════════════
  { code: "1012", name: "Nguyễn Thị Mai Hương",     role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1013", name: "Lê Thị Kim Nguyên",         role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1014", name: "Trần Thái Thiên Thảo",      role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1015", name: "Nguyễn Thị Thu Huyền",     role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1016", name: "Vương Thanh Hà Trang",    role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1017", name: "Trần Thị Thanh Trúc",      role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1018", name: "Phạm Huỳnh Anh Thư",      role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1019", name: "Thạch Thảo",               role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1020", name: "Nguyễn Thị Hồng Thi",      role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1021", name: "Võ Lê Thị Huyền Trang",    role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  { code: "1022", name: "Danh Thị Thùy Trang",       role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST" },
  // Thử việc
  { code: "1027", name: "Nguyễn Thị Thuỳ Trang",   role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST", departmentType: "Thử việc" },
  { code: "1028", name: "Hà Thị Kim Ngân",           role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST", departmentType: "Thử việc" },
  { code: "1030", name: "Nguyễn Bùi Tường Vy",     role: "PROGRAM_MANAGER_ST", department: "Giáo viên ST", program: "ST", departmentType: "Thử việc" },
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

async function main() {
  const auth = admin.auth();
  const db = admin.firestore();
  const now = new Date().toISOString();

  console.log(`\nTao ${employees.length} tai khoan...\n`);

  const existing = await auth.listUsers();
  const existingEmails = new Set(existing.users.map((u) => u.email ?? ""));

  let created = 0, skipped = 0, failed = 0;

  for (const emp of employees) {
    const email = makeEmail(emp);

    if (existingEmails.has(email)) {
      skipped++;
      console.log(`⏭ ${email} - da ton tai`);
      continue;
    }

    try {
      const userRecord = await auth.createUser({
        email,
        password: "Kpi@2026",
        displayName: emp.name,
        disabled: false,
      });

      await db.doc(`users/${userRecord.uid}`).set({
        uid: userRecord.uid,
        email,
        displayName: emp.name,
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
        fullName: emp.name,
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

      created++;
      console.log(`✅ ${email} (${emp.code})`);
    } catch (err) {
      failed++;
      console.log(`❌ ${email}: ${err.message}`);
    }
  }

  console.log(`\n=== KET QUA ===`);
  console.log(`Tao moi: ${created}`);
  console.log(`Bo qua: ${skipped}`);
  console.log(`That bai: ${failed}`);
  console.log(`\nMat khau: Kpi@2026\n`);
}

main().catch(console.error);
