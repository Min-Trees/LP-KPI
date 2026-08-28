import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useEmployees,
  useKpiRecords,
  useKpiTemplateByType,
  useUpsertKpiRecord,
  useSubmitKpiRecord,
  useApproveKpiRecord,
  useRejectKpiRecord,
  useKpiPeriods,
  useWriteAuditLog,
} from "@/api/hooks";
import { KpiEmployeeTable } from "./KpiEmployeeTable";
import { KpiScoringModal } from "./KpiScoringModal";
import { KpiApprovalModal } from "./KpiApprovalModal";
import { createNotification } from "@/api/notifications";
import type { Employee, KpiEvent, KpiRecord, KpiRecordStatus, KpiTemplateType } from "@/types";
import { generateId } from "@/utils";
import { ROLE, MANAGER_ROLES } from "@/constants/roles";
import { isAdmin } from "@/features/auth/AuthProvider";
import { useToast } from "@/hooks/useToast";
import { BranchSelector } from "@/components/common/BranchSelector";
import { Search } from "lucide-react";
import type { Branch } from "@/types/branch";

interface Props {
  templateType: KpiTemplateType;
  title: string;
  programFilter?: "HS" | "ST";
}

export function KpiSheetPage({ templateType, title, programFilter: _programFilter }: Props) {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const userIsAdmin = isAdmin(appUser?.role);

  // Role-based access guard
  const roleAccess: Record<string, KpiTemplateType[]> = {
    [ROLE.ADMIN]: ["manager", "office_support", "teacher_hs", "teacher_st"],
    [ROLE.BOARD]: ["manager"],
    [ROLE.OPERATION_MANAGER]: ["office_support"],
    [ROLE.PROGRAM_MANAGER_HS]: ["teacher_hs"],
    [ROLE.PROGRAM_MANAGER_ST]: ["teacher_st"],
    [ROLE.EMPLOYEE]: [],
  };
  const allowedTemplates = roleAccess[appUser?.role ?? ""] ?? [];
  const hasAccess = allowedTemplates.includes(templateType);

  const toast = useToast();
  const { data: template, isLoading: loadingTpl } = useKpiTemplateByType(templateType);
  const { data: employees = [], isLoading: loadingEmp } = useEmployees();
  const { data: periods = [] } = useKpiPeriods();
  const upsert = useUpsertKpiRecord();
  const submitRecord = useSubmitKpiRecord();
  const approveRecord = useApproveKpiRecord();
  const rejectRecord = useRejectKpiRecord();
  const writeAuditLog = useWriteAuditLog();

  // Redirect if role doesn't have access to this template type
  if (!hasAccess) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [approvalEmployee, setApprovalEmployee] = useState<Employee | null>(null);
  const [approvalRecord, setApprovalRecord] = useState<KpiRecord | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  // Admin filter states
  const [filterBranch, setFilterBranch] = useState<Branch | "">("");
  const [filterSearch, setFilterSearch] = useState("");

  const canApprove = appUser?.role === ROLE.ADMIN || appUser?.role === ROLE.BOARD;

  const openPeriod = useMemo(
    () => periods.find((p) => p.status === "OPEN") ?? periods[0],
    [periods],
  );

  // Ổn định filter object để query key không bị thay đổi mỗi render
  const recordsFilter = useMemo(
    () => ({
      branch: (!userIsAdmin && appUser?.role !== ROLE.BOARD) ? appUser?.branch : undefined,
    }),
    [userIsAdmin, appUser?.role, appUser?.branch],
  );

  const { data: records = [] } = useKpiRecords(openPeriod?.id, recordsFilter);

  const filteredEmployees = useMemo(() => {
    let list = employees.filter((e) => e.status === "ACTIVE");

    // 1. QUAN TRỌNG: Nếu là quản lý (không phải Admin/Board), chỉ thấy nhân sự thuộc cơ sở của mình
    if (userIsAdmin || appUser?.role === "BOARD") {
      // Admin/Board thấy tất cả → không lọc thêm ở bước này
      // Nhưng áp dụng bộ lọc của Admin
      if (filterBranch) {
        list = list.filter((e) => e.branch === filterBranch);
      }
      if (filterSearch) {
        const s = filterSearch.toLowerCase();
        list = list.filter(
          (e) =>
            e.fullName.toLowerCase().includes(s) ||
            e.code.toLowerCase().includes(s) ||
            (e.email?.toLowerCase().includes(s) ?? false)
        );
      }
    } else if (appUser?.branch) {
      // Quản lý cơ sở (OPERATION_MANAGER): thấy TẤT CẢ nhân viên trong cơ sở của mình
      // (đã lọc theo templateType ở bước tiếp theo)
      if (appUser.role === ROLE.OPERATION_MANAGER) {
        list = list.filter((e) => e.branch === appUser.branch);
      } else if (appUser?.employeeId) {
        // Quản lý chương trình: chỉ thấy nhân sự có managerId === appUser.employeeId
        list = list.filter(
          (e) => e.managerId === appUser.employeeId && e.branch === appUser.branch
        );
      }
    }

    // 2. Filter by kpiType / department based on templateType
    if (templateType === "manager") {
      list = list.filter((e) => MANAGER_ROLES.includes(e.role));
    } else if (templateType === "office_support") {
      list = list.filter((e) => e.department === "Văn phòng + Hỗ trợ");
    } else if (templateType === "teacher_hs") {
      list = list.filter((e) => e.department === "Giáo viên HS");
    } else if (templateType === "teacher_st") {
      list = list.filter((e) => e.department === "Giáo viên ST");
    }

    // 3. Loại trừ tài khoản đang đăng nhập (tránh tự chấm)
    list = list.filter((e) => e.uid !== appUser?.uid);

    return list;
  }, [employees, templateType, appUser, userIsAdmin, appUser?.uid, appUser?.employeeId, appUser?.branch, filterBranch, filterSearch]);

  const currentRecord = selectedEmployee
    ? records.find(
        (r) => r.employeeId === selectedEmployee.id && r.periodId === openPeriod?.id,
      ) ?? null
    : null;

  if (loadingTpl || loadingEmp) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Đang tải...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-800">
            Chưa có template KPI cho <b>{title}</b>. Admin vào{" "}
            <b>Mẫu KPI</b> để tạo template trước.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-semibold mb-2">Debug info (chỉ dev):</p>
          <p>templateType: <b>{templateType}</b></p>
          <p>Tổng nhân viên ACTIVE: <b>{employees.filter((e) => e.status === "ACTIVE").length}</b></p>
          <p>Sau filter {templateType}: <b>{
            employees.filter((e) => {
              if (e.status !== "ACTIVE") return false;
              if (templateType === "manager") return MANAGER_ROLES.includes(e.role);
              return false;
            }).length
          }</b></p>
          <p>User role: <b>{appUser?.role}</b> | branch: <b>{appUser?.branch}</b></p>
        </div>
      </div>
    );
  }

  const periodDays = openPeriod
    ? new Date(openPeriod.year, openPeriod.month, 0).getDate()
    : 31;

  function handleScore(emp: Employee) {
    setSelectedEmployee(emp);
    setModalOpen(true);
  }

  function handleView(emp: Employee) {
    setSelectedEmployee(emp);
    setModalOpen(true);
  }

  function handleApproveClick(emp: Employee, rec: KpiRecord) {
    setApprovalEmployee(emp);
    setApprovalRecord(rec);
    setApprovalModalOpen(true);
  }

  function handleClose() {
    setModalOpen(false);
    setSelectedEmployee(null);
  }

  async function handleSave(data: {
    events: KpiEvent[];
    kpiScore: number;
    bonusPercent: number;
    rank: "XUAT_SAC" | "TOT" | "DAT" | "CAN_CAI_THIEN";
  }) {
    if (!selectedEmployee || !openPeriod || !template || !appUser) return;

    const criteria = template.criteria.map((criterion) => {
      const ruleEvents = data.events.filter((e) =>
        criterion.rules.find((r) => r.code === e.ruleCode),
      );
      const dailyScores: Record<number, number> = {};
      for (const ev of ruleEvents) {
        dailyScores[ev.date] = (dailyScores[ev.date] ?? 0) + ev.points;
      }
      const sum = Object.values(dailyScores).reduce((a, b) => a + b, 0);
      // Không cap tối đa — cho phép vượt 110 để đạt xuất sắc
      const total = Math.max(0, 100 + sum);
      return {
        criterionId: criterion.id,
        code: criterion.code,
        name: criterion.name,
        weight: criterion.weight,
        baseScore: 100,
        dailyScores,
        total,
        events: ruleEvents,
      };
    });

    const recordId = currentRecord?.id ?? generateId("rec");
    const status: KpiRecordStatus = "IN_PROGRESS";
    const now = new Date().toISOString();

    // Build record, omitting undefined fields (Firestore doesn't allow undefined)
    const rec: any = {
      id: recordId,
      employeeId: selectedEmployee.id,
      periodId: openPeriod.id,
      templateId: template.id,
      templateVersion: template.version,
      templateType,
      branch: selectedEmployee.branch,
      status,
      createdBy: appUser.uid,
      createdAt: currentRecord?.createdAt ?? now,
      updatedAt: now,
      criteria,
      kpiScore: data.kpiScore,
      bonusPercent: data.bonusPercent,
      rank: data.rank,
    };

    // Only include optional fields if they have values
    if (currentRecord?.submittedBy) rec.submittedBy = currentRecord.submittedBy;
    if (currentRecord?.submittedAt) rec.submittedAt = currentRecord.submittedAt;
    if (currentRecord?.approvedBy) rec.approvedBy = currentRecord.approvedBy;
    if (currentRecord?.approvedAt) rec.approvedAt = currentRecord.approvedAt;
    if (currentRecord?.note) rec.note = currentRecord.note;

    await upsert.mutateAsync(rec);
    // Realtime subscription (onSnapshot) sẽ tự động cập nhật UI khi dữ liệu thay đổi,
    // bao gồm cả khi admin hoặc user khác đang mở cùng trang này.

    // Audit log
    writeAuditLog.mutate({
      userId: appUser.uid,
      userName: appUser.displayName ?? undefined,
      action: "Chấm điểm KPI",
      module: "kpi_record",
      entityId: rec.id,
      newData: { kpiScore: data.kpiScore, rank: data.rank, eventsCount: data.events.length },
    });

    toast.success(
      currentRecord
        ? `Đã cập nhật KPI cho ${selectedEmployee.fullName} · ${data.kpiScore.toFixed(1)} điểm`
        : `Đã lưu KPI cho ${selectedEmployee.fullName} · ${data.kpiScore.toFixed(1)} điểm`,
    );
  }

  async function handleSubmit(recordId: string) {
    if (!appUser) return;
    await submitRecord.mutateAsync({ recordId, submittedBy: appUser.uid });

    const rec = records.find((r) => r.id === recordId);
    toast.success(`Đã gửi duyệt KPI · ${rec?.kpiScore.toFixed(1) ?? ""} điểm`);

    // Find employee for notification
    if (rec) {
      const emp = employees.find((e) => e.id === rec.employeeId);
      // Notify ADMIN and BOARD
      const adminUsers = employees.filter(
        (e) => e.role === ROLE.ADMIN || e.role === ROLE.BOARD,
      );
      await Promise.all(
        adminUsers.map((admin) =>
          createNotification({
            userId: admin.id,
            type: "INFO",
            title: "KPI chờ duyệt",
            body: `${emp?.fullName ?? "Nhân viên"} đã gửi KPI kỳ ${openPeriod?.name}. Điểm: ${rec.kpiScore.toFixed(1)}`,
            link: `/kpi/${templateType}`,
          }),
        ),
      );
    }

    writeAuditLog.mutate({
      userId: appUser.uid,
      userName: appUser.displayName ?? undefined,
      action: "Gửi duyệt KPI",
      module: "kpi_record",
      entityId: recordId,
    });
  }

  async function handleApprove(recordId: string) {
    if (!appUser) return;
    const rec = records.find((r) => r.id === recordId);
    await approveRecord.mutateAsync({ recordId, approvedBy: appUser.uid });
    toast.success(`Đã duyệt KPI · ${rec?.kpiScore.toFixed(1) ?? ""} điểm`);

    if (rec) {
      // Notify employee
      await createNotification({
        userId: rec.employeeId,
        type: "SUCCESS",
        title: "KPI đã được duyệt",
        body: `KPI kỳ ${openPeriod?.name} của bạn đã được duyệt. Điểm: ${rec.kpiScore.toFixed(1)} · ${rec.rank.replace("_", " ")}`,
      });
    }

    writeAuditLog.mutate({
      userId: appUser.uid,
      userName: appUser.displayName ?? undefined,
      action: "Duyệt KPI",
      module: "kpi_record",
      entityId: recordId,
    });
  }

  async function handleReject(recordId: string, reason: string) {
    if (!appUser) return;
    const rec = records.find((r) => r.id === recordId);
    await rejectRecord.mutateAsync({ recordId, rejectedBy: appUser.uid, reason });
    toast.info(`Đã trả lại KPI · Lý do: ${reason}`);

    if (rec) {
      await createNotification({
        userId: rec.employeeId,
        type: "WARNING",
        title: "KPI bị từ chối",
        body: `KPI kỳ ${openPeriod?.name} bị từ chối. Lý do: ${reason}`,
      });
    }

    writeAuditLog.mutate({
      userId: appUser.uid,
      userName: appUser.displayName ?? undefined,
      action: "Từ chối KPI",
      module: "kpi_record",
      entityId: recordId,
      newData: { reason },
    });
  }

  const isPeriodLocked = openPeriod?.status === "LOCKED" || openPeriod?.status === "CLOSED";

  // Admin filter bar
  const showAdminFilters = userIsAdmin || appUser?.role === "BOARD";

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">
            {openPeriod
              ? `Kỳ ${openPeriod.name} · Template v${template.version} · ${filteredEmployees.length} nhân viên`
              : `Chưa có kỳ KPI · ${filteredEmployees.length} nhân viên`}
          </p>
        </div>
        {!openPeriod && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Chưa có kỳ KPI đang mở. Vào <b>Cấu hình hệ thống</b> để tạo kỳ.
          </div>
        )}
      </div>

      {/* Admin Filters */}
      {showAdminFilters && (
        <div className="card">
          <div className="flex flex-wrap items-center gap-3">
            <Search size={16} className="text-slate-400" />
            <input
              className="input max-w-sm"
              placeholder="Tìm theo tên, mã NV, email..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
            <BranchSelector
              value={filterBranch}
              onChange={setFilterBranch}
              placeholder="Tất cả cơ sở"
              className="w-40"
            />
          </div>
        </div>
      )}

      {/* Period Status */}
      {openPeriod && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
            openPeriod.status === "OPEN"
              ? "border-emerald-200 bg-emerald-50"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <span className="text-sm font-semibold text-slate-800">
            {openPeriod.name}
            <span className="ml-2 font-normal text-slate-500">
              ({openPeriod.status === "OPEN" ? "đang mở" : "đã đóng"})
            </span>
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              openPeriod.status === "OPEN"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {openPeriod.status === "OPEN" ? "Đang mở" : "Đã đóng"}
          </span>
        </div>
      )}

      {/* Employee Table */}
      <KpiEmployeeTable
        employees={filteredEmployees}
        records={records}
        period={openPeriod ?? null}
        onScore={handleScore}
        onView={handleView}
        onApprove={canApprove ? handleApproveClick : undefined}
        readOnly={isPeriodLocked}
      />

      {/* Scoring Modal */}
      <KpiScoringModal
        template={template}
        employee={selectedEmployee}
        record={currentRecord}
        periodId={openPeriod?.id ?? ""}
        periodDays={periodDays}
        open={modalOpen}
        readOnly={isPeriodLocked}
        onClose={handleClose}
        onSave={handleSave}
        onSubmit={currentRecord?.status === "IN_PROGRESS" ? handleSubmit : undefined}
      />

      {/* Approval Modal */}
      {approvalModalOpen && approvalRecord && approvalEmployee && (
        <KpiApprovalModal
          record={approvalRecord}
          employeeName={approvalEmployee.fullName}
          periodLabel={openPeriod?.name ?? ""}
          onClose={() => {
            setApprovalModalOpen(false);
            setApprovalEmployee(null);
            setApprovalRecord(null);
          }}
          onApprove={async () => {
            if (!approvalRecord) return;
            await handleApprove(approvalRecord.id);
          }}
          onReject={async (reason: string) => {
            if (!approvalRecord) return;
            await handleReject(approvalRecord.id, reason);
          }}
        />
      )}
    </div>
  );
}
