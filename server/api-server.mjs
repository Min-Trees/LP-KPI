/**
 * Public KPI Lookup API Server
 * 
 * API endpoints (không cần đăng nhập):
 * GET  /api/kpi/lookup?code=LC-001        - Tìm nhân viên theo mã
 * GET  /api/kpi/lookup?name=Tên          - Tìm nhân viên theo tên
 * GET  /api/kpi/:employeeId              - KPI nhân viên
 * GET  /api/kpi/:employeeId/detail/:periodId - Chi tiết KPI
 * 
 * Usage: npm run api
 */

import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import adminPkg from "firebase-admin";
import * as adminFs from "firebase-admin/firestore";

// firebase-admin exports as CJS - both default and named
const admin = adminPkg.default ?? adminPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Firebase service account
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "..", "lp-kpi-edb40-firebase-adminsdk-fbsvc-f30de5a5a8.json"), "utf-8")
);

// Initialize Firebase Admin
const firebaseApp = admin.initializeApp({
  credential: admin.cert(serviceAccount),
});

const db = adminFs.getFirestore(firebaseApp);

const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());

// Helper: map branch code to label
const BRANCH_LABELS = {
  LAO_CAI: "Cơ sở Lào Cai",
  LAI_THIEU: "Cơ sở Lái Thiêu",
};

const RANK_LABELS = {
  XUAT_SAC: "Xuất sắc",
  TOT: "Tốt",
  DAT: "Đạt",
  CAN_CAI_THIEN: "Cần cải thiện",
};

const STATUS_LABELS = {
  DRAFT: "Nháp",
  IN_PROGRESS: "Đang chấm",
  SUBMITTED: "Đã gửi",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  LOCKED: "Đã khóa",
  CLOSED: "Đã đóng",
};

const TEMPLATE_TYPE_LABELS = {
  manager: "Ban Giám hiệu",
  office_support: "Văn phòng + Hỗ trợ",
  teacher_hs: "Giáo viên HS",
  teacher_st: "Giáo viên ST",
};

// Rate limiter (simple in-memory)
const rateLimit = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;

  const record = rateLimit.get(ip) || { count: 0, resetAt: now + windowMs };
  
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  
  record.count++;
  rateLimit.set(ip, record);
  
  return record.count <= maxRequests;
}

// Apply rate limiter
expressApp.use("/api/", (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, error: "Quá nhiều yêu cầu, vui lòng thử lại sau" });
  }
  next();
});

// GET /api/health - Health check
expressApp.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/kpi/lookup - Tìm nhân viên theo mã hoặc tên
expressApp.get("/api/kpi/lookup", async (req, res) => {
  try {
    const { code, name, branch } = req.query;

    if (!code && !name) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập mã NV hoặc tên" });
    }

    const employeesSnapshot = await db.collection("employees").get();
    let employees = [];
    employeesSnapshot.forEach((doc) => {
      employees.push({ id: doc.id, ...doc.data() });
    });

    employees = employees.filter((e) => e.status === "ACTIVE" || e.status === "PROBATION");

    if (code && typeof code === "string") {
      const searchCode = code.toUpperCase().trim();
      employees = employees.filter((e) => 
        e.code?.toUpperCase() === searchCode ||
        e.code?.toUpperCase().includes(searchCode)
      );
    }

    if (name && typeof name === "string") {
      const searchName = name.toLowerCase().trim();
      employees = employees.filter((e) => 
        e.fullName?.toLowerCase().includes(searchName)
      );
    }

    if (branch && typeof branch === "string") {
      employees = employees.filter((e) => e.branch === branch);
    }

    const response = employees.slice(0, 20).map((e) => ({
      id: e.id,
      code: e.code,
      fullName: e.fullName,
      department: e.department,
      position: e.position,
      branch: BRANCH_LABELS[e.branch] || e.branch,
      program: e.program || null,
      status: e.status,
    }));

    res.json({
      success: true,
      count: response.length,
      data: response,
    });
  } catch (error) {
    console.error("Lookup error:", error);
    res.status(500).json({ success: false, error: "Lỗi khi tìm kiếm" });
  }
});

// GET /api/kpi/:employeeId - Lấy thông tin và KPI của nhân viên
expressApp.get("/api/kpi/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employeeDoc = await db.collection("employees").doc(employeeId).get();
    if (!employeeDoc.exists) {
      return res.status(404).json({ success: false, error: "Không tìm thấy nhân viên" });
    }

    const employee = { id: employeeDoc.id, ...employeeDoc.data() };

    const recordsSnapshot = await db.collection("kpi_records")
      .where("employeeId", "==", employeeId)
      .get();

    const records = [];
    recordsSnapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });

    const periodsSnapshot = await db.collection("kpi_periods").get();
    const periods = [];
    periodsSnapshot.forEach((doc) => {
      periods.push({ id: doc.id, ...doc.data() });
    });

    const periodMap = new Map(periods.map((p) => [p.id, p]));
    
    const kpiHistory = records
      .filter((r) => r.status === "APPROVED" || r.status === "LOCKED")
      .map((r) => {
        const period = periodMap.get(r.periodId);
        return {
          id: r.id,
          period: period ? `T${period.month}/${period.year}` : r.periodId,
          periodName: period?.name || r.periodId,
          kpiScore: r.kpiScore,
          rank: RANK_LABELS[r.rank] || r.rank,
          rankKey: r.rank,
          bonusPercent: r.bonusPercent,
          status: STATUS_LABELS[r.status] || r.status,
          templateType: TEMPLATE_TYPE_LABELS[r.templateType] || r.templateType,
          approvedAt: r.approvedAt,
        };
      })
      .sort((a, b) => (b.approvedAt || "").localeCompare(a.approvedAt || ""));

    const latestKpi = kpiHistory[0] || null;

    res.json({
      success: true,
      data: {
        id: employee.id,
        code: employee.code,
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        branch: BRANCH_LABELS[employee.branch] || employee.branch,
        program: employee.program || null,
        status: employee.status,
        joinedAt: employee.joinedAt,
        latestKpi,
        kpiHistory,
        totalPeriods: kpiHistory.length,
        avgScore: kpiHistory.length > 0 
          ? Math.round((kpiHistory.reduce((a, b) => a + b.kpiScore, 0) / kpiHistory.length) * 10) / 10
          : null,
      },
    });
  } catch (error) {
    console.error("Get employee KPI error:", error);
    res.status(500).json({ success: false, error: "Lỗi khi lấy dữ liệu KPI" });
  }
});

// GET /api/kpi/:employeeId/detail/:periodId - Chi tiết KPI của 1 kỳ
expressApp.get("/api/kpi/:employeeId/detail/:periodId", async (req, res) => {
  try {
    const { employeeId, periodId } = req.params;

    const employeeDoc = await db.collection("employees").doc(employeeId).get();
    if (!employeeDoc.exists) {
      return res.status(404).json({ success: false, error: "Không tìm thấy nhân viên" });
    }
    const employee = { id: employeeDoc.id, ...employeeDoc.data() };

    const recordsSnapshot = await db.collection("kpi_records")
      .where("employeeId", "==", employeeId)
      .where("periodId", "==", periodId)
      .limit(1)
      .get();

    if (recordsSnapshot.empty) {
      return res.status(404).json({ success: false, error: "Không tìm thấy KPI cho kỳ này" });
    }

    const record = { id: recordsSnapshot.docs[0].id, ...recordsSnapshot.docs[0].data() };

    const periodDoc = await db.collection("kpi_periods").doc(periodId).get();
    const period = periodDoc.exists ? { id: periodDoc.id, ...periodDoc.data() } : null;

    const templateDoc = await db.collection("kpi_templates").doc(record.templateId).get();
    const template = templateDoc.exists ? { id: templateDoc.id, ...templateDoc.data() } : null;

    res.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          code: employee.code,
          fullName: employee.fullName,
          department: employee.department,
          position: employee.position,
          branch: BRANCH_LABELS[employee.branch] || employee.branch,
        },
        period: period ? {
          name: period.name,
          month: period.month,
          year: period.year,
        } : null,
        record: {
          id: record.id,
          kpiScore: record.kpiScore,
          rank: RANK_LABELS[record.rank] || record.rank,
          rankKey: record.rank,
          bonusPercent: record.bonusPercent,
          status: STATUS_LABELS[record.status] || record.status,
          statusKey: record.status,
          approvedAt: record.approvedAt,
          submittedAt: record.submittedAt,
        },
        criteria: record.criteria?.map((c) => ({
          name: c.name,
          weight: c.weight,
          baseScore: c.baseScore,
          total: c.total,
          score: c.total,
        })) || [],
        template: template ? {
          name: template.name,
          maxScore: template.maxScore,
          criteriaCount: template.criteria?.length || 0,
        } : null,
      },
    });
  } catch (error) {
    console.error("Get KPI detail error:", error);
    res.status(500).json({ success: false, error: "Lỗi khi lấy chi tiết KPI" });
  }
});

// 404 handler
expressApp.use((req, res) => {
  res.status(404).json({ success: false, error: "Endpoint không tồn tại" });
});

const PORT = process.env.PORT || 3001;
expressApp.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║         Public KPI Lookup API Server                    ║
╠══════════════════════════════════════════════════════════╣
║  Status: Running                                        ║
║  Port: ${PORT}                                              ║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                             ║
║  GET  /api/health               - Health check         ║
║  GET  /api/kpi/lookup?code=    - Tìm theo mã NV      ║
║  GET  /api/kpi/lookup?name=    - Tìm theo tên        ║
║  GET  /api/kpi/:id             - KPI nhân viên        ║
║  GET  /api/kpi/:id/detail/:p   - Chi tiết KPI         ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default expressApp;
