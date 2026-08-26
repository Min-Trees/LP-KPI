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

// ─────────────────────────────────────────────────────────────────────────────
// Account Management (Admin SDK required — can't do this from client)
// ─────────────────────────────────────────────────────────────────────────────

interface CreateAccountData {
  fullName: string;
  email: string;
  password: string;
  code: string;
  department: string;
  departmentType?: string;
  position?: string;
  program?: string;
  role: string;
  branch: string;
}

interface UpdateAccountData {
  uid: string;
  displayName?: string;
  email?: string;
  disabled?: boolean;
}

/** List all Firebase Auth users (paginated) */
export const listAuthAccounts = functions.https.onCall(async (_data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Yêu cầu đăng nhập.");

  // Verify admin from Firestore
  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (userDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Chỉ Admin được phép.");
  }

  const allUsers: Array<{
    uid: string;
    email: string | null;
    displayName: string | null;
    disabled: boolean;
    createdAt: string;
  }> = [];

  try {
    // listUsers returns up to 1000 users per page
    let page = await admin.auth().listUsers(1000);
    allUsers.push(...page.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? null,
      displayName: u.displayName ?? null,
      disabled: u.disabled,
      createdAt: new Date(u.metadata.creationTime).toISOString(),
    })));

    while (page.pageToken) {
      page = await admin.auth().listUsers(1000, page.pageToken);
      allUsers.push(...page.users.map((u) => ({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        disabled: u.disabled,
        createdAt: new Date(u.metadata.creationTime).toISOString(),
      })));
    }
  } catch (err) {
    throw new functions.https.HttpsError("internal", `Lỗi khi lấy danh sách users: ${err}`);
  }

  // Attach Firestore user + employee data
  const enriched = await Promise.all(allUsers.map(async (u) => {
    const [userSnap, empSnap] = await Promise.all([
      db.collection("users").doc(u.uid).get(),
      db.collection("employees").doc(u.uid).get(),
    ]);
    return {
      ...u,
      firestore: {
        user: userSnap.exists ? userSnap.data() : null,
        employee: empSnap.exists ? empSnap.data() : null,
      },
    };
  }));

  return { users: enriched, total: enriched.length };
});

/** Create a new auth account + users/{uid} + employees/{uid} docs */
export const createAuthAccount = functions.https.onCall(async (data: CreateAccountData, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Yêu cầu đăng nhập.");

  const userDoc = await db.collection("users").doc(context.auth.uid).get();
  if (userDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Chỉ Admin được phép.");
  }

  const { fullName, email, password, code, department, departmentType, position, program, role, branch } = data;

  if (!email || !password || !fullName || !code || !department || !role || !branch) {
    throw new functions.https.HttpsError("invalid-argument", "Thiếu thông tin bắt buộc.");
  }

  if (password.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Mật khẩu phải có ít nhất 6 ký tự.");
  }

  const VALID_ROLES = ["ADMIN", "BOARD", "OPERATION_MANAGER", "PROGRAM_MANAGER_HS", "PROGRAM_MANAGER_ST", "EMPLOYEE"];
  if (!VALID_ROLES.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Vai trò không hợp lệ.");
  }

  const VALID_BRANCHES = ["LAI_THIEU", "LAO_CAI"];
  if (!VALID_BRANCHES.includes(branch)) {
    throw new functions.https.HttpsError("invalid-argument", "Cơ sở không hợp lệ.");
  }

  const now = new Date().toISOString();

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
      disabled: false,
    });

    const batch = db.batch();

    // users/{uid}
    const userRef = db.collection("users").doc(userRecord.uid);
    batch.set(userRef, {
      uid: userRecord.uid,
      email,
      displayName: fullName,
      role,
      program: program ?? null,
      department,
      departmentType: departmentType ?? null,
      branch,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    // employees/{uid}
    const empRef = db.collection("employees").doc(userRecord.uid);
    batch.set(empRef, {
      id: userRecord.uid,
      code,
      fullName,
      email,
      department,
      departmentType: departmentType ?? null,
      position: position ?? null,
      program: program ?? null,
      role,
      branch,
      status: "ACTIVE",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();

    return {
      uid: userRecord.uid,
      email,
      displayName: fullName,
      password,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("email-already-exists")) {
      throw new functions.https.HttpsError("already-exists", "Email đã tồn tại.");
    }
    throw new functions.https.HttpsError("internal", `Lỗi tạo tài khoản: ${message}`);
  }
});

/** Update an auth account (displayName, email, disabled) */
export const updateAuthAccount = functions.https.onCall(async (data: UpdateAccountData, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Yêu cầu đăng nhập.");

  const adminDoc = await db.collection("users").doc(context.auth.uid).get();
  if (adminDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Chỉ Admin được phép.");
  }

  const { uid, displayName, email, disabled } = data;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "Thiếu uid.");

  try {
    const updateProps: admin.auth.UpdateRequest = {};
    if (displayName !== undefined) updateProps.displayName = displayName;
    if (email !== undefined) updateProps.email = email;
    if (disabled !== undefined) updateProps.disabled = disabled;

    await admin.auth().updateUser(uid, updateProps);
    return { success: true, uid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new functions.https.HttpsError("internal", `Lỗi cập nhật: ${message}`);
  }
});

/** Delete an auth account + Firestore docs */
export const deleteAuthAccount = functions.https.onCall(async (data: { uid: string }, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Yêu cầu đăng nhập.");

  const adminDoc = await db.collection("users").doc(context.auth.uid).get();
  if (adminDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Chỉ Admin được phép.");
  }

  const { uid } = data;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "Thiếu uid.");

  // Prevent deleting yourself
  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError("failed-precondition", "Không thể xóa tài khoản của chính bạn.");
  }

  try {
    const batch = db.batch();

    const userRef = db.collection("users").doc(uid);
    batch.delete(userRef);

    const empRef = db.collection("employees").doc(uid);
    batch.delete(empRef);

    await batch.commit();
    await admin.auth().deleteUser(uid);

    return { success: true, uid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new functions.https.HttpsError("internal", `Lỗi xóa tài khoản: ${message}`);
  }
});

/** Reset password — generates a new temporary password and returns it */
export const resetAccountPassword = functions.https.onCall(async (data: { uid: string; newPassword: string }, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Yêu cầu đăng nhập.");

  const adminDoc = await db.collection("users").doc(context.auth.uid).get();
  if (adminDoc.data()?.role !== "ADMIN") {
    throw new functions.https.HttpsError("permission-denied", "Chỉ Admin được phép.");
  }

  const { uid, newPassword } = data;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "Thiếu uid.");
  if (!newPassword || newPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "Mật khẩu phải có ít nhất 6 ký tự.");
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    return { success: true, password: newPassword };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new functions.https.HttpsError("internal", `Lỗi đặt lại mật khẩu: ${message}`);
  }
});