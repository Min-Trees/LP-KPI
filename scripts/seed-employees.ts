/**
 * Employee Seed Script - Lao Cai Branch
 * Structure: Ban Giám đốc > Cơ sở Lào Cai > Văn phòng + Hỗ trợ / Giáo viên
 * Usage: npm run seed:employees
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
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

interface Employee {
  email: string;
  password: string;
  displayName: string;
  role: "ADMIN" | "BOARD" | "OPERATION_MANAGER" | "PROGRAM_MANAGER" | "EMPLOYEE";
  department: string;
  departmentType: string | null;
  program: string | null;
  kpiType: string;
  position: string;
  status: "ACTIVE" | "PROBATION";
  branch: "LAI_THIEU" | "LAO_CAI";
  managerEmail: string | null;
}

const employees: Employee[] = [
  // === BAN GIÁM ĐỐC (LAI_THIEU - Cơ sở chính) ===
  {
    email: "nguyenhuynhthuminh@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Huỳnh Thu Minh",
    role: "BOARD",
    department: "Ban Giám đốc",
    departmentType: null,
    program: null,
    kpiType: "manager",
    position: "Giám đốc",
    status: "ACTIVE",
    branch: "LAI_THIEU",
    managerEmail: null,
  },
  {
    email: "nguyenhuynhduy@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Huỳnh Duy",
    role: "BOARD",
    department: "Ban Giám đốc",
    departmentType: null,
    program: null,
    kpiType: "manager",
    position: "Phó Giám đốc",
    status: "ACTIVE",
    branch: "LAI_THIEU",
    managerEmail: null,
  },

  // === CƠ SỞ LÀO CAI - Quản lý (LAO_CAI) ===
  {
    email: "hongocmytrinh@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Hồ Ngọc Mỹ Trinh",
    role: "OPERATION_MANAGER",
    department: "Cơ sở Lào Cai",
    departmentType: "CO_SO",
    program: null,
    kpiType: "manager",
    position: "Quản lý Cơ sở",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "nguyenhuynhthuminh@littlepeople.edu.vn",
  },
  {
    email: "tranthituyetlinh@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Trần Thị Tuyết Linh",
    role: "PROGRAM_MANAGER",
    department: "Cơ sở Lào Cai",
    departmentType: "CO_SO",
    program: "HS",
    kpiType: "manager",
    position: "Quản lý Chương trình",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "nguyenhuynhthuminh@littlepeople.edu.vn",
  },

  // === VĂN PHÒNG + HỖ TRỢ (LAO_CAI) ===
  {
    email: "nguyenlyphuonguyen@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Lý Phương Uyên",
    role: "EMPLOYEE",
    department: "Văn Phòng",
    departmentType: "VAN_PHONG",
    program: null,
    kpiType: "office_support",
    position: "Nhân viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "hongocmytrinh@littlepeople.edu.vn",
  },
  {
    email: "huynhphatloc@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Huỳnh Phát Lộc",
    role: "EMPLOYEE",
    department: "Văn Phòng",
    departmentType: "VAN_PHONG",
    program: null,
    kpiType: "office_support",
    position: "Nhân viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "hongocmytrinh@littlepeople.edu.vn",
  },
  {
    email: "lethitruongan@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Lê Thị Trường An",
    role: "EMPLOYEE",
    department: "Văn Phòng",
    departmentType: "VAN_PHONG",
    program: null,
    kpiType: "office_support",
    position: "Nhân viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "hongocmytrinh@littlepeople.edu.vn",
  },
  {
    email: "hoangdinhchinh@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Hoàng Đình Chinh",
    role: "EMPLOYEE",
    department: "Văn Phòng",
    departmentType: "VAN_PHONG",
    program: null,
    kpiType: "office_support",
    position: "Nhân viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "hongocmytrinh@littlepeople.edu.vn",
  },
  {
    email: "vothiquit@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Võ Thị Quít",
    role: "EMPLOYEE",
    department: "Văn Phòng",
    departmentType: "VAN_PHONG",
    program: null,
    kpiType: "office_support",
    position: "Nhân viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "hongocmytrinh@littlepeople.edu.vn",
  },
  {
    email: "nguyenthikieutrinh@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Thị Kiều Trinh",
    role: "EMPLOYEE",
    department: "Văn Phòng",
    departmentType: "VAN_PHONG",
    program: null,
    kpiType: "office_support",
    position: "Nhân viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "hongocmytrinh@littlepeople.edu.vn",
  },
  {
    email: "nguyenthiledung@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Thị Lệ Dung",
    role: "EMPLOYEE",
    department: "Văn Phòng",
    departmentType: "VAN_PHONG",
    program: null,
    kpiType: "office_support",
    position: "Y tế",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "hongocmytrinh@littlepeople.edu.vn",
  },
  {
    email: "huynhthivantrang@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Huỳnh Thị Vân Trang",
    role: "EMPLOYEE",
    department: "Văn Phòng",
    departmentType: "VAN_PHONG",
    program: null,
    kpiType: "office_support",
    position: "Nhân viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "hongocmytrinh@littlepeople.edu.vn",
  },
  {
    email: "ngothianhtuyet@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Ngô Thị Ánh Tuyết",
    role: "EMPLOYEE",
    department: "Văn Phòng",
    departmentType: "VAN_PHONG",
    program: null,
    kpiType: "office_support",
    position: "Nhân viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "hongocmytrinh@littlepeople.edu.vn",
  },

  // === GIÁO VIÊN HS (LAO_CAI) ===
  {
    email: "lethithanhmai@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Lê Thị Thanh Mai",
    role: "EMPLOYEE",
    department: "Giáo viên HS",
    departmentType: "GIAO_VIEN",
    program: "HS",
    kpiType: "teacher_hs",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "nguyenthitham@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Thị Thắm",
    role: "EMPLOYEE",
    department: "Giáo viên HS",
    departmentType: "GIAO_VIEN",
    program: "HS",
    kpiType: "teacher_hs",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "nguyenthbangtam@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Thị Băng Tâm",
    role: "EMPLOYEE",
    department: "Giáo viên HS",
    departmentType: "GIAO_VIEN",
    program: "HS",
    kpiType: "teacher_hs",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "nguyenkimngan@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Kim Ngân",
    role: "EMPLOYEE",
    department: "Giáo viên HS",
    departmentType: "GIAO_VIEN",
    program: "HS",
    kpiType: "teacher_hs",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "bethingocdiem@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Bế Thị Ngọc Diễm",
    role: "EMPLOYEE",
    department: "Giáo viên HS",
    departmentType: "GIAO_VIEN",
    program: "HS",
    kpiType: "teacher_hs",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "lethingoctuyet@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Lê Thị Ngọc Tuyết",
    role: "EMPLOYEE",
    department: "Giáo viên HS",
    departmentType: "GIAO_VIEN",
    program: "HS",
    kpiType: "teacher_hs",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },

  // === GIÁO VIÊN ST (LAO_CAI) ===
  {
    email: "nguyenthimaihuong@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Thị Mai Hương",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "lethikimnguyen@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Lê Thị Kim Nguyên",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "tranthaithienthao@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Trần Thái Thiên Thảo",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "nguyenthithuhuyen@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Thị Thu Huyền",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "vuongthanhtrang@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Vương Thanh Hà Trang",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "tranthithanhtruc@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Trần Thị Thanh Trúc",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "phamhuynhanhthu@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Phạm Huỳnh Anh Thư",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "thachthao@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Thạch Thảo",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "nguyenthihong@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Thị Hồng",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "thivo@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Thi Võ",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "lethihuyentrang@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Lê Thị Huyền Trang",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "danhthithuytrang@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Danh Thị Thùy Trang",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "ACTIVE",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "nguyenthithuytrang@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Thị Thuỳ Trang",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "PROBATION",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "hathikimngan@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Hà Thị Kim Ngân",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "PROBATION",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
  {
    email: "nguyenbuituongvy@littlepeople.edu.vn",
    password: "littlepeople",
    displayName: "Nguyễn Bùi Tường Vy",
    role: "EMPLOYEE",
    department: "Giáo viên ST",
    departmentType: "GIAO_VIEN",
    program: "ST",
    kpiType: "teacher_st",
    position: "Giáo viên",
    status: "PROBATION",
    branch: "LAO_CAI",
    managerEmail: "tranthituyetlinh@littlepeople.edu.vn",
  },
];

async function seedEmployees() {
  console.log("Starting Employee seed...\n");
  console.log("Structure:");
  console.log("  Ban Giám đốc (LAI_THIEU) [BOARD]");
  console.log("  ├── Cơ sở Lào Cai (LAO_CAI) [OPERATION_MANAGER]");
  console.log("  └── Quản lý Chương trình (LAO_CAI) [PROGRAM_MANAGER]");
  console.log("      ├── Văn Phòng [EMPLOYEE]");
  console.log("      ├── Giáo viên HS [EMPLOYEE]");
  console.log("      └── Giáo viên ST [EMPLOYEE]");
  console.log("");

  const now = new Date().toISOString();
  const managerMap = new Map<string, string>();
  let employeeIndex = 1;

  // First pass: create all users
  console.log("=== Creating Users ===");
  for (const emp of employees) {
    try {
      const existing = await auth.getUserByEmail(emp.email);
      managerMap.set(emp.email, existing.uid);
      console.log(`  ○ Exists: ${emp.displayName}`);
    } catch {
      try {
        const userRecord = await auth.createUser({
          email: emp.email,
          password: emp.password,
          displayName: emp.displayName,
          disabled: false,
        });
        managerMap.set(emp.email, userRecord.uid);
        console.log(`  ✓ Created: ${emp.displayName}`);
      } catch (e: any) {
        console.error(`  ✗ Failed: ${emp.email} - ${e.message}`);
      }
    }
  }

  // Second pass: create Firestore documents
  console.log("\n=== Creating Firestore Documents ===");
  let docCreated = 0;

  for (const emp of employees) {
    const uid = managerMap.get(emp.email);
    if (!uid) continue;

    const managerUid = emp.managerEmail ? managerMap.get(emp.managerEmail) : null;

    const employeeData = {
      id: uid,
      code: `LC-${String(employeeIndex).padStart(3, "0")}`,
      fullName: emp.displayName,
      email: emp.email,
      department: emp.department,
      departmentType: emp.departmentType,
      program: emp.program,
      kpiType: emp.kpiType,
      position: emp.position,
      managerId: managerUid || null,
      role: emp.role,
      status: emp.status,
      branch: emp.branch,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const userData = {
      uid,
      email: emp.email,
      displayName: emp.displayName,
      role: emp.role,
      program: emp.program,
      kpiType: emp.kpiType,
      department: emp.department,
      departmentType: emp.departmentType,
      status: emp.status,
      branch: emp.branch,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.doc(`employees/${uid}`).set(employeeData, { merge: true });
      await db.doc(`users/${uid}`).set(userData, { merge: true });
      
      const branchLabel = emp.branch === "LAI_THIEU" ? "LT" : "LC";
      const program = emp.program ? ` (${emp.program})` : "";
      console.log(`  ✓ LC-${String(employeeIndex).padStart(3, "0")} | ${emp.displayName} | ${branchLabel}${program}`);
      docCreated++;
      employeeIndex++;
    } catch (e: any) {
      console.error(`  ✗ Failed: ${emp.email} - ${e.message}`);
    }
  }

  // Summary
    const byRole = { ADMIN: 0, BOARD: 0, OPERATION_MANAGER: 0, PROGRAM_MANAGER: 0, EMPLOYEE: 0 };
  const byKpi = { manager: 0, office_support: 0, teacher_hs: 0, teacher_st: 0 };
  const byBranch = { LAI_THIEU: 0, LAO_CAI: 0 };
  for (const emp of employees) {
    byRole[emp.role]++;
    if (emp.kpiType in byKpi) {
      byKpi[emp.kpiType as keyof typeof byKpi]++;
    }
    byBranch[emp.branch]++;
  }

  console.log(`
╔══════════════════════════════════════════════════════════╗
║              Employee Seed Complete!                       ║
╠══════════════════════════════════════════════════════════╣
║  By Role:                                                ║
║    - ADMIN            : ${String(byRole.ADMIN).padEnd(38)}║
║    - BOARD           : ${String(byRole.BOARD).padEnd(38)}║
║    - OPERATION_MANAGER: ${String(byRole.OPERATION_MANAGER).padEnd(36)}║
║    - PROGRAM_MANAGER  : ${String(byRole.PROGRAM_MANAGER).padEnd(36)}║
║    - EMPLOYEE         : ${String(byRole.EMPLOYEE).padEnd(38)}║
╠══════════════════════════════════════════════════════════╣
║  By Branch:                                               ║
║    - LAI_THIEU: ${String(byBranch.LAI_THIEU).padEnd(41)}║
║    - LAO_CAI  : ${String(byBranch.LAO_CAI).padEnd(41)}║
╠══════════════════════════════════════════════════════════╣
║  By KPI Type:                                             ║
║    - Manager         : ${String(byKpi.manager).padEnd(42)}║
║    - Văn phòng       : ${String(byKpi.office_support).padEnd(42)}║
║    - Giáo viên HS    : ${String(byKpi.teacher_hs).padEnd(42)}║
║    - Giáo viên ST    : ${String(byKpi.teacher_st).padEnd(42)}║
╠══════════════════════════════════════════════════════════╣
║  Total: ${String(employees.length).padEnd(51)}║
╚══════════════════════════════════════════════════════════╝
`);
}

seedEmployees().catch(console.error);
