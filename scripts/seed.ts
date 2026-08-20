/**
 * Seed script — Khởi tạo dữ liệu mặc định cho hệ thống KPI.
 *
 * Usage:
 *   cp .env.example .env       (điền Firebase config)
 *   npm run seed               (chạy seed)
 *
 * Seed tạo:
 *   - 4 KPI templates (manager, office_support, teacher_hs, teacher_st) từ file Excel
 *   - Ranking rules mặc định
 *   - Admin user placeholder (cần tạo qua Firebase Auth console trước, rồi thêm doc vào users/)
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { firebaseConfig } from "../src/config/firebase";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface KpiRule {
  code: string;
  label: string;
  category: string;
  type: "ADD" | "SUBTRACT";
  points: number;
}

interface KpiCriterion {
  id: string;
  code: string;
  name: string;
  weight: number;
  order: number;
  description?: string;
  rules: KpiRule[];
}

const DISCIPLINE_RULES: KpiRule[] = [
  { code: "late_30", label: "Đi muộn <30ph", category: "Nội quy và kỷ luật", type: "SUBTRACT", points: -2 },
  { code: "late_30_90", label: "Đi muộn/về sớm 30-90ph", category: "Nội quy và kỷ luật", type: "SUBTRACT", points: -7 },
  { code: "absent_unexcused", label: "Nghỉ KPH không lý do", category: "Nội quy và kỷ luật", type: "SUBTRACT", points: -10 },
  { code: "absent_excused", label: "Nghỉ KPH có lý do", category: "Nội quy và kỷ luật", type: "SUBTRACT", points: -5 },
  { code: "violate_policy", label: "Vi phạm quy trình/nội quy", category: "Nội quy và kỷ luật", type: "SUBTRACT", points: -5 },
  { code: "verbal_warning", label: "Khiển trách miệng/email", category: "Nội quy và kỷ luật", type: "SUBTRACT", points: -20 },
  { code: "written_warning", label: "Khiển trách bằng văn bản", category: "Nội quy và kỷ luật", type: "SUBTRACT", points: -30 },
];

const WORK_RULES: KpiRule[] = [
  { code: "miss_deadline", label: "Không HT CV đúng hạn", category: "Chất lượng công việc", type: "SUBTRACT", points: -5 },
  { code: "doc_error", label: "Hồ sơ/sổ sách sai sót", category: "Chất lượng công việc", type: "SUBTRACT", points: -7 },
  { code: "skip_process", label: "Không đúng quy trình CM", category: "Chất lượng công việc", type: "SUBTRACT", points: -5 },
  { code: "reminded_repeat", label: "Nhắc nhở nhiều lần", category: "Chất lượng công việc", type: "SUBTRACT", points: -5 },
  { code: "quality_impact", label: "Sai sót ảnh hưởng CL", category: "Chất lượng công việc", type: "SUBTRACT", points: -15 },
];

const SERVICE_RULES: KpiRule[] = [
  { code: "parent_complaint", label: "KN PH xác minh đúng", category: "Chất lượng dịch vụ", type: "SUBTRACT", points: -10 },
  { code: "serious_complaint", label: "KN nghiêm trọng", category: "Chất lượng dịch vụ", type: "SUBTRACT", points: -30 },
  { code: "bad_communication", label: "Giao tiếp/ứng xử", category: "Chất lượng dịch vụ", type: "SUBTRACT", points: -10 },
  { code: "reminded_writing", label: "Nhắc nhở văn bản", category: "Chất lượng dịch vụ", type: "SUBTRACT", points: -5 },
  { code: "perfect_attendance", label: "Tuân thủ 100%, chuẩn bị chu đáo", category: "Chất lượng dịch vụ", type: "ADD", points: 10 },
  { code: "innovative", label: "Có sáng kiến/hỗ trợ ĐN", category: "Chất lượng dịch vụ", type: "ADD", points: 10 },
  { code: "parent_praise", label: "Được PH khen", category: "Chất lượng dịch vụ", type: "ADD", points: 10 },
];

const COMMON_CRITERIA: KpiCriterion[] = [
  { id: "discipline", code: "discipline", name: "Nội quy và kỷ luật", weight: 0.4, order: 1, rules: DISCIPLINE_RULES },
  { id: "expertise", code: "expertise", name: "Chuyên môn", weight: 0.3, order: 2, rules: WORK_RULES },
  { id: "service", code: "service", name: "Chất lượng dịch vụ", weight: 0.3, order: 3, rules: SERVICE_RULES },
];

const OFFICE_CRITERIA: KpiCriterion[] = [
  { id: "discipline", code: "discipline", name: "Nội quy và kỷ luật", weight: 0.4, order: 1, rules: DISCIPLINE_RULES },
  { id: "expertise", code: "expertise", name: "Chuyên môn", weight: 0.3, order: 2, rules: WORK_RULES },
  { id: "service", code: "service", name: "Chất lượng dịch vụ/Thái độ", weight: 0.3, order: 3, rules: SERVICE_RULES },
];

async function seedTemplates() {
  const now = new Date().toISOString();
  const adminId = "system";

  const types = [
    { type: "manager", name: "Manager", criteria: COMMON_CRITERIA },
    { type: "office_support", name: "Văn phòng + Hỗ trợ", criteria: OFFICE_CRITERIA },
    { type: "teacher_hs", name: "Giáo viên HS", criteria: COMMON_CRITERIA },
    { type: "teacher_st", name: "Giáo viên ST", criteria: COMMON_CRITERIA },
  ];

  for (const t of types) {
    const existing = await getDocs(
      query(collection(db, "kpi_templates"), where("type", "==", t.type)),
    );
    if (existing.size > 0) {
      console.log(`✓ Template '${t.type}' đã tồn tại, bỏ qua.`);
      continue;
    }
    const id = `tpl_${t.type}_v1`;
    await setDoc(doc(db, "kpi_templates", id), {
      id,
      type: t.type,
      name: t.name,
      version: 1,
      status: "ACTIVE",
      maxScorePerCriterion: 105,
      totalFormula: "WEIGHTED_AVG",
      criteria: t.criteria,
      createdBy: adminId,
      createdAt: now,
    });
    console.log(`✓ Đã tạo template '${t.type}'`);
  }
}

async function seedRankingRules() {
  const id = "default";
  const existing = await getDocs(
    query(collection(db, "ranking_rules"), where("id", "==", id)),
  );
  if (existing.size > 0) {
    console.log("✓ Ranking rules đã tồn tại, bỏ qua.");
    return;
  }
  await setDoc(doc(db, "ranking_rules", id), {
    id,
    name: "Quy tắc mặc định",
    status: "ACTIVE",
    bands: [
      { min: 100.01, max: 999, label: "Xuất sắc (>100)", bonusPercent: 105, rank: "XUAT_SAC" },
      { min: 95, max: 100, label: "Tốt (95-100)", bonusPercent: 100, rank: "TOT" },
      { min: 90, max: 94.99, label: "Tốt (90-94)", bonusPercent: 90, rank: "TOT" },
      { min: 80, max: 89.99, label: "Đạt (80-89)", bonusPercent: 70, rank: "DAT" },
      { min: 70, max: 79.99, label: "Đạt (70-79)", bonusPercent: 50, rank: "DAT" },
      { min: 0, max: 69.99, label: "Cần cải thiện (<70)", bonusPercent: 0, rank: "CAN_CAI_THIEN" },
    ],
    updatedAt: new Date().toISOString(),
  });
  console.log("✓ Đã tạo ranking rules mặc định.");
}

async function seedSystemSettings() {
  const id = "period";
  const existing = await getDocs(collection(db, "system_settings"));
  if (existing.size > 0) {
    console.log("✓ System settings đã tồn tại, bỏ qua.");
    return;
  }
  await setDoc(doc(db, "system_settings", id), {
    defaultCap: 105,
    scoringDayOfMonth: 5,
    approvalDayOfMonth: 10,
    updatedAt: new Date().toISOString(),
  });
  console.log("✓ Đã tạo system_settings mặc định.");
}

async function main() {
  console.log("Seeding...");
  await seedTemplates();
  await seedRankingRules();
  await seedSystemSettings();
  console.log("\n✅ Seed hoàn tất.");
  console.log("\nBước tiếp theo:");
  console.log("  1. Vào Firebase Console → Authentication → tạo user admin");
  console.log("  2. Copy UID của admin, tạo doc trong collection 'users':");
  console.log("     uid: <UID>, email, displayName, role: 'ADMIN', status: 'ACTIVE'");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});