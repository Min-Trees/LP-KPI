/**
 * KPI Seed Script - Chạy 1 lần để seed KPI templates & ranking rules lên Firestore
 * Run: npx tsx scripts/seed-kpi.ts
 */
import { initializeApp, getApps, cert } from "firebase-admin/app";
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

console.log("Firebase Project (Admin):", serviceAccount.project_id);

interface KpiRule {
  code: string;
  label: string;
  category: string;
  type: "ADD" | "SUBTRACT";
  points: number;
  minPoints?: number;
  maxPoints?: number;
  note?: string;
}

interface KpiCriterion {
  id: string;
  code: string;
  name: string;
  weight: number;
  description?: string;
  order: number;
  rules: KpiRule[];
}

interface KpiTemplate {
  id: string;
  type: string;
  name: string;
  version: number;
  status: "ACTIVE" | "INACTIVE";
  maxScorePerCriterion: number;
  totalFormula: "WEIGHTED_AVG" | "SUM" | "AVG";
  criteria: KpiCriterion[];
  createdBy: string;
  createdAt: string;
}

interface RankingRule {
  id: string;
  periodType: "MONTHLY" | "QUARTERLY" | "YEARLY";
  scoreMin: number;
  scoreMax: number;
  rank: string;
  bonusPercentage: number;
  order: number;
}

interface BonusScale {
  scoreMin: number;
  scoreMax: number;
  multiplier: number;
  label: string;
}

const CRITERIA_BASE_RULES: Record<string, KpiRule[] | undefined> = {
  noi_quy: [
    {
      code: "NQ_01",
      label: "Đi làm trễ hoặc về sớm <30ph không có lý do chính đáng",
      category: "Nội quy và kỷ luật",
      type: "SUBTRACT",
      points: -2,
      note: "-2đ/lần",
    },
    {
      code: "NQ_02",
      label: "Đi làm trễ hoặc về sớm >30ph và < 90ph không có lý do chính đáng",
      category: "Nội quy và kỷ luật",
      type: "SUBTRACT",
      points: -5,
      note: "-5đ-10đ/lần",
    },
    {
      code: "NQ_03",
      label: "Nghỉ không thông báo mà không có lý do chính đáng",
      category: "Nội quy và kỷ luật",
      type: "SUBTRACT",
      points: -10,
      note: "-10đ/lần",
    },
    {
      code: "NQ_04",
      label: "Nghỉ không thông báo nhưng có lý do chính đáng",
      category: "Nội quy và kỷ luật",
      type: "SUBTRACT",
      points: -5,
      note: "-5đ/lần",
    },
    {
      code: "NQ_05",
      label: "Không tuân thủ quy trình, nội quy của nhà trường",
      category: "Nội quy và kỷ luật",
      type: "SUBTRACT",
      points: -5,
      note: "-5đ/lần",
    },
    {
      code: "NQ_06",
      label: "Bị xử lý kỷ luật bằng hình thức khiển trách lỗi nội, email, zalo nhắc nhở",
      category: "Nội quy và kỷ luật",
      type: "SUBTRACT",
      points: -20,
      note: "-20đ/lần",
    },
    {
      code: "NQ_07",
      label: "Bị xử lý kỷ luật bằng hình thức khiển trách bằng văn bản",
      category: "Nội quy và kỷ luật",
      type: "SUBTRACT",
      points: -30,
      note: "-30đ/lần",
    },
    {
      code: "NQ_08",
      label: "Nếu có 2 biên bản trong 01 quý",
      category: "Nội quy và kỷ luật",
      type: "SUBTRACT",
      points: 0,
      note: "0đ (2 biên bản/quý)",
    },
    {
      code: "NQ_BONUS_01",
      label: "Tuân thủ 100% nghiêm túc, đến sớm đủ chuẩn bị công việc chỉnh chu",
      category: "Khoản điểm thưởng",
      type: "ADD",
      points: 10,
      minPoints: 0,
      maxPoints: 10,
      note: "+ tối đa 10đ",
    },
    {
      code: "NQ_BONUS_02",
      label: "Chỉ đạo nhắc nhở đồng nghiệp thực hiện tốt",
      category: "Khoản điểm thưởng",
      type: "ADD",
      points: 5,
      minPoints: 0,
      maxPoints: 5,
      note: "+ tối đa 5đ",
    },
  ],
  chuyen_mon: [
    {
      code: "CM_01",
      label: "Không hoàn thành công việc được giao đúng thời hạn mà không có lý do chính đáng",
      category: "Chất lượng công việc",
      type: "SUBTRACT",
      points: -5,
      note: "-5đ/lần",
    },
    {
      code: "CM_02",
      label: "Hồ sơ, sổ sách, báo cáo hoặc biểu mẫu sai sót, phải chỉnh sửa",
      category: "Chất lượng công việc",
      type: "SUBTRACT",
      points: -5,
      minPoints: -10,
      note: "-5đ-10đ/lần",
    },
    {
      code: "CM_03",
      label: "Không thực hiện hoặc thực hiện không đầy đủ quy trình chuyên môn theo quy định của Nhà trường",
      category: "Chất lượng công việc",
      type: "SUBTRACT",
      points: -5,
      note: "-5đ/lần",
    },
    {
      code: "CM_04",
      label: "Công việc bị nhắc nhở nhiều lần do thiếu trách nhiệm hoặc thiếu chủ động",
      category: "Chất lượng công việc",
      type: "SUBTRACT",
      points: -5,
      note: "-5đ/lần",
    },
    {
      code: "CM_05",
      label: "Đã xảy ra sai sót ảnh hưởng đến chất lượng chăm sóc, giáo dục hoặc hoạt động của Nhà trường",
      category: "Chất lượng công việc",
      type: "SUBTRACT",
      points: -10,
      minPoints: -20,
      note: "-10đ-20đ/lần",
    },
    {
      code: "CM_BONUS_01",
      label: "Chất lượng công việc: có sáng kiến, hỗ trợ đồng nghiệp hoàn thành",
      category: "Khoản điểm thưởng",
      type: "ADD",
      points: 10,
      minPoints: 0,
      maxPoints: 10,
      note: "+ tối đa 10đ",
    },
    {
      code: "CM_BONUS_02",
      label: "BGH, BGD khen",
      category: "Khoản điểm thưởng",
      type: "ADD",
      points: 5,
      minPoints: 0,
      maxPoints: 10,
      note: "+ tối đa 10đ",
    },
  ],
  chat_luong: [
    {
      code: "CL_01",
      label: "Có khiếu nại của phụ huynh được xác minh là đúng",
      category: "Chất lượng dịch vụ",
      type: "SUBTRACT",
      points: -10,
      note: "-10đ/lần",
    },
    {
      code: "CL_02",
      label: "Khiếu nại nghiêm trọng ảnh hưởng đến uy tín của Nhà trường",
      category: "Chất lượng dịch vụ",
      type: "SUBTRACT",
      points: -20,
      minPoints: -40,
      note: "-20đ-40đ/lần",
    },
    {
      code: "CL_03",
      label: "Giao tiếp, ứng xử với phụ huynh, học sinh hoặc đồng nghiệp không phù hợp",
      category: "Chất lượng dịch vụ",
      type: "SUBTRACT",
      points: -10,
      note: "-10đ/lần",
    },
    {
      code: "CL_04",
      label: "Bị nhắc nhở bằng văn bản về thái độ, tác phong phục vụ",
      category: "Chất lượng dịch vụ",
      type: "SUBTRACT",
      points: -5,
      note: "-5đ/lần",
    },
    {
      code: "CL_BONUS_01",
      label: "Được phụ huynh khen (email, tin nhắn...)",
      category: "Khoản điểm thưởng",
      type: "ADD",
      points: 10,
      minPoints: 0,
      maxPoints: 10,
      note: "+ tối đa 10đ",
    },
    {
      code: "CL_BONUS_02",
      label: "Tích cực tham gia phong trào, BGH BGD khen về CLDV",
      category: "Khoản điểm thưởng",
      type: "ADD",
      points: 5,
      minPoints: 0,
      maxPoints: 10,
      note: "+ tối đa 10đ",
    },
  ],
};

function buildTemplate(
  id: string,
  type: string,
  name: string,
  criteria: Array<{ id: string; code: string; name: string; weight: number; rules: KpiRule[] }>,
): KpiTemplate {
  return {
    id,
    type,
    name,
    version: 1,
    status: "ACTIVE",
    maxScorePerCriterion: 105,
    totalFormula: "WEIGHTED_AVG",
    criteria: criteria.map((c, i) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      weight: c.weight,
      description: `Tiêu chí đánh giá ${c.name} với trọng số ${c.weight * 100}%`,
      order: i + 1,
      rules: c.rules,
    })),
    createdBy: "system",
    createdAt: new Date().toISOString(),
  };
}

const templates: KpiTemplate[] = [
  buildTemplate("template_manager", "manager", "KPI Ban Giám Hiệu (Manager)", [
    { id: "c1", code: "NOI_QUY", name: "Nội quy và kỷ luật", weight: 0.4, rules: CRITERIA_BASE_RULES.noi_quy! },
    { id: "c2", code: "CHUYEN_MON", name: "Chuyên môn, chất lượng giảng dạy", weight: 0.3, rules: CRITERIA_BASE_RULES.chuyen_mon! },
    { id: "c3", code: "CHAT_LUONG", name: "Chất lượng dịch vụ", weight: 0.3, rules: CRITERIA_BASE_RULES.chat_luong! },
  ]),
  buildTemplate("template_office_support", "office_support", "KPI Văn phòng + Hỗ trợ", [
    { id: "c1", code: "NOI_QUY", name: "Nội quy và kỷ luật", weight: 0.4, rules: CRITERIA_BASE_RULES.noi_quy! },
    { id: "c2", code: "CHUYEN_MON", name: "Chuyên môn", weight: 0.3, rules: CRITERIA_BASE_RULES.chuyen_mon! },
    { id: "c3", code: "CHAT_LUONG", name: "Chất lượng dịch vụ/Thái độ", weight: 0.3, rules: CRITERIA_BASE_RULES.chat_luong! },
  ]),
  buildTemplate("template_teacher_hs", "teacher_hs", "KPI Giáo viên Hành chính Sự nghiệp", [
    { id: "c1", code: "NOI_QUY", name: "Nội quy và kỷ luật", weight: 0.4, rules: CRITERIA_BASE_RULES.noi_quy! },
    { id: "c2", code: "CHUYEN_MON", name: "Chuyên môn, chất lượng giảng dạy", weight: 0.3, rules: CRITERIA_BASE_RULES.chuyen_mon! },
    { id: "c3", code: "CHAT_LUONG", name: "Chất lượng dịch vụ", weight: 0.3, rules: CRITERIA_BASE_RULES.chat_luong! },
  ]),
  buildTemplate("template_teacher_st", "teacher_st", "KPI Giáo viên Sự tình nguyện", [
    { id: "c1", code: "NOI_QUY", name: "Nội quy và kỷ luật", weight: 0.4, rules: CRITERIA_BASE_RULES.noi_quy! },
    { id: "c2", code: "CHUYEN_MON", name: "Chuyên môn, chất lượng giảng dạy", weight: 0.3, rules: CRITERIA_BASE_RULES.chuyen_mon! },
    { id: "c3", code: "CHAT_LUONG", name: "Chất lượng dịch vụ", weight: 0.3, rules: CRITERIA_BASE_RULES.chat_luong! },
  ]),
];

const rankingRules: RankingRule[] = [
  { id: "rank_1", periodType: "MONTHLY", scoreMin: 101, scoreMax: 105, rank: "Xuất sắc", bonusPercentage: 105, order: 1 },
  { id: "rank_2", periodType: "MONTHLY", scoreMin: 95, scoreMax: 100, rank: "Tốt", bonusPercentage: 100, order: 2 },
  { id: "rank_3", periodType: "MONTHLY", scoreMin: 90, scoreMax: 94, rank: "Đạt", bonusPercentage: 90, order: 3 },
  { id: "rank_4", periodType: "MONTHLY", scoreMin: 80, scoreMax: 89, rank: "Cần cố gắng", bonusPercentage: 70, order: 4 },
  { id: "rank_5", periodType: "MONTHLY", scoreMin: 70, scoreMax: 79, rank: "Yếu", bonusPercentage: 50, order: 5 },
  { id: "rank_6", periodType: "MONTHLY", scoreMin: 0, scoreMax: 69, rank: "Kém", bonusPercentage: 0, order: 6 },
];

const bonusScale: BonusScale[] = [
  { scoreMin: 101, scoreMax: 105, multiplier: 1.05, label: ">100 điểm" },
  { scoreMin: 95, scoreMax: 100, multiplier: 1.0, label: "95–100 điểm" },
  { scoreMin: 90, scoreMax: 94, multiplier: 0.9, label: "90–94 điểm" },
  { scoreMin: 80, scoreMax: 89, multiplier: 0.7, label: "80–89 điểm" },
  { scoreMin: 70, scoreMax: 79, multiplier: 0.5, label: "70–79 điểm" },
  { scoreMin: 0, scoreMax: 69, multiplier: 0, label: "<70 điểm" },
];

async function seed() {
  console.log("Starting KPI seed...\n");
  console.log("Firebase Project (Admin):", serviceAccount.project_id);

  // Seed KPI Templates
  console.log("\n=== Seeding KPI Templates ===");
  for (const template of templates) {
    try {
      await db.collection("kpi_templates").doc(template.id).set(template);
      console.log(`  ✓ Created template: ${template.name} (${template.id})`);
    } catch (e) {
      console.error(`  ✗ Failed to create template ${template.id}:`, e);
    }
  }

  // Seed Ranking Rules
  console.log("\n=== Seeding Ranking Rules ===");
  for (const rule of rankingRules) {
    try {
      await db.collection("ranking_rules").doc(rule.id).set(rule);
      console.log(`  ✓ Created ranking rule: ${rule.rank} (${rule.scoreMin}-${rule.scoreMax})`);
    } catch (e) {
      console.error(`  ✗ Failed to create ranking rule ${rule.id}:`, e);
    }
  }

  // Seed Bonus Scale
  console.log("\n=== Seeding Bonus Scale ===");
  for (let i = 0; i < bonusScale.length; i++) {
    const scale = bonusScale[i];
    try {
      await db.collection("bonus_scale").doc(`scale_${i + 1}`).set(scale);
      console.log(`  ✓ Created bonus scale: ${scale.label} (${scale.multiplier})`);
    } catch (e) {
      console.error(`  ✗ Failed to create bonus scale:`, e);
    }
  }

  // Create initial KPI period (current month)
  const now = new Date();
  const periodId = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`;
  const period = {
    id: periodId,
    name: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    status: "OPEN",
    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
    deadline: new Date(now.getFullYear(), now.getMonth() + 1, 5).toISOString(),
    createdBy: "system",
    createdAt: new Date().toISOString(),
  };

  console.log("\n=== Seeding KPI Period ===");
  try {
    await db.collection("kpi_periods").doc(periodId).set(period);
    console.log(`  ✓ Created KPI period: ${period.name} (${periodId})`);
  } catch (e) {
    console.error(`  ✗ Failed to create KPI period:`, e);
  }

  console.log("\n=== Seed Complete! ===");
  console.log("Templates created: 4");
  console.log("Ranking rules created: 6");
  console.log("Bonus scale created: 6");
  console.log("KPI periods created: 1");
  console.log("\nNext steps:");
  console.log("1. Refresh the app in browser");
  console.log("2. Go to Admin > KPI Templates to verify");
  console.log("3. Add employees and assign KPI types");
}

seed().catch(console.error);
