import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const DEFAULT_TZ = "Asia/Ho_Chi_Minh";

/**
 * Tự động tạo kỳ KPI mới cho tháng sau vào 00:00 ngày 25 hàng tháng (timezone VN).
 * Đồng thời khóa các kỳ đã hết hạn.
 */
export const scheduledKpiPeriods = functions.pubsub
  .schedule("0 0 25 * *")
  .timeZone(DEFAULT_TZ)
  .onRun(async () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const month = next.getMonth() + 1;
    const year = next.getFullYear();
    const startDate = next.toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);
    const scoringDeadline = new Date(year, month, 5).toISOString().slice(0, 10);
    const approvalDeadline = new Date(year, month, 10).toISOString().slice(0, 10);

    const id = `per_${year}_${String(month).padStart(2, "0")}`;
    await db.collection("kpi_periods").doc(id).set(
      {
        id,
        month,
        year,
        startDate,
        endDate,
        scoringDeadline,
        approvalDeadline,
        status: "UPCOMING",
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );

    // Khóa các kỳ đã quá hạn duyệt
    const overdue = await db
      .collection("kpi_periods")
      .where("status", "==", "OPEN")
      .where("approvalDeadline", "<", startDate)
      .get();
    const batch = db.batch();
    overdue.forEach((doc) => batch.update(doc.ref, { status: "LOCKED" }));
    await batch.commit();

    console.log(`Tạo kỳ ${month}/${year}, đóng ${overdue.size} kỳ quá hạn.`);
  });

/**
 * Helper callable: tạo kỳ KPI thủ công (cho admin panel).
 */
export const createKpiPeriod = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Yêu cầu đăng nhập.");
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (userDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Chỉ Admin.");
  }
  const { month, year, startDate, endDate, scoringDeadline, approvalDeadline, status: pStatus } = data;
  if (!month || !year || !startDate || !endDate) {
    throw new functions.https.HttpsError("invalid-argument", "Thiếu tham số.");
  }
  const id = `per_${year}_${String(month).padStart(2, "0")}`;
  await db.collection("kpi_periods").doc(id).set({
    id, month, year, startDate, endDate, scoringDeadline, approvalDeadline,
    status: pStatus ?? "UPCOMING",
    createdAt: new Date().toISOString(),
  }, { merge: true });
  return { id };
});

/**
 * Gửi notification khi có KPI cần chấm/chờ duyệt/được duyệt.
 */
export const onKpiRecordWrite = functions.firestore
  .document("kpi_records/{recordId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return;

    const recipients = await db.collection("users")
      .where("role", "in", ["ADMIN", "BOARD"])
      .get();
    const type = after.status === "SUBMITTED" ? "WARNING"
               : after.status === "APPROVED" ? "SUCCESS"
               : "INFO";
    const title = after.status === "SUBMITTED" ? "KPI chờ duyệt"
                : after.status === "APPROVED" ? "KPI đã được duyệt"
                : `KPI cập nhật: ${after.status}`;

    const batch = db.batch();
    recipients.forEach((u) => {
      const ref = db.collection("notifications").doc();
      batch.set(ref, {
        userId: u.id,
        type,
        title,
        body: `Record ${context.params.recordId} → ${after.status}`,
        link: `/reports`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  });