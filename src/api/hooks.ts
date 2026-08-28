import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query as fsQuery,
  where,
  doc,
  setDoc,
  type QueryConstraint,
} from "firebase/firestore";
import {
  listCollection,
  getDocument,
  setDocument,
  updateDocument,
  deleteDocument,
} from "@/api/firestore";
import { getDb } from "@/config/firebaseInit";
import { useAuth } from "@/features/auth/AuthProvider";
import type {
  Employee,
  KpiTemplate,
  KpiRecord,
  KpiPeriod,
  KpiEvent,
  RankingRules,
  AuditLog,
  AppUser,
} from "@/types";
import type { Permission } from "@/constants/permissions";
import type { Branch } from "@/types/branch";
import type { Program } from "@/constants/programs";
import { ROLE, type Role } from "@/constants/roles";
import { generateId } from "@/utils";

export interface EmployeeFilters {
  branch?: Branch;
  program?: Program;
  role?: Role;
  managerId?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface KpiRecordFilters {
  branch?: Branch;
  program?: Program;
  status?: KpiRecord["status"];
  templateType?: KpiRecord["templateType"];
}

export const QUERY_KEYS = {
  employees: ["employees"] as const,
  employee: (id: string) => ["employees", id] as const,
  templates: ["kpi_templates"] as const,
  template: (id: string) => ["kpi_templates", id] as const,
  templateByType: (type: string) => ["kpi_templates", "type", type] as const,
  periods: ["kpi_periods"] as const,
  currentPeriod: ["kpi_periods", "current"] as const,
  records: ["kpi_records"] as const,
  recordsByPeriod: (periodId: string) => ["kpi_records", "period", periodId] as const,
  ranking: ["ranking_rules"] as const,
  auditLogs: ["audit_logs"] as const,
};

/**
 * Generic hook dùng Firestore onSnapshot() để lắng nghe thay đổi realtime.
 * Trả về { data, isLoading } tương tự useQuery nhưng luôn sync với server.
 */
function useRealtimeCollection<T extends { id?: string }>(
  collectionPath: string,
  constraints: QueryConstraint[] = [],
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const db = getDb();
    const q = fsQuery(collection(db, collectionPath), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: T[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as T));
        setData(list);
        setIsLoading(false);
      },
      (err) => {
        // Permission denied / index missing / network error...
        // Log rõ để dễ debug khi OP/PM không thấy data mà lẽ ra phải thấy.
        console.error(`[useRealtimeCollection] ${collectionPath} error:`, err.code, err.message);
        setError(err);
        setData([]);
        setIsLoading(false);
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath, ...deps]);

  return { data, isLoading, error };
}

export function useEmployees(filters?: EmployeeFilters) {
  // Build constraints cho onSnapshot (Firestore sẽ tự filter server-side)
  const constraints: QueryConstraint[] = [];
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  if (filters?.branch) constraints.push(where("branch", "==", filters.branch));
  if (filters?.program) constraints.push(where("program", "==", filters.program));
  if (filters?.role) constraints.push(where("role", "==", filters.role));
  if (filters?.managerId) constraints.push(where("managerId", "==", filters.managerId));

  const { data: raw, isLoading } = useRealtimeCollection<Employee>(
    "employees",
    constraints,
    [filters?.status, filters?.branch, filters?.program, filters?.role, filters?.managerId],
  );

  // Apply any remaining client-side filters
  const data = !filters
    ? raw
    : raw.filter((e) => {
        if (filters.branch && e.branch !== filters.branch) return false;
        if (filters.program && e.program !== filters.program) return false;
        if (filters.role && e.role !== filters.role) return false;
        if (filters.managerId && e.managerId !== filters.managerId) return false;
        if (filters.status && e.status !== filters.status) return false;
        return true;
      });

  return { data, isLoading } as const;
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.employee(id) : ["employees", "none"],
    queryFn: () => (id ? getDocument<Employee>("employees", id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

/** Đọc permissions đang gán cho 1 user. */
export function useUserPermissions(uid: string | undefined) {
  return useQuery({
    queryKey: uid ? ["users", uid, "permissions"] : ["users", "none", "permissions"],
    queryFn: async () => {
      if (!uid) return null;
      const user = await getDocument<AppUser>("users", uid);
      return user ?? null;
    },
    enabled: !!uid,
  });
}

/** Mutation: cập nhật permissions của 1 user. */
export function useUpdateUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      uid,
      permissions,
      updatedBy,
    }: {
      uid: string;
      permissions: Permission[];
      updatedBy: string;
    }) => {
      const now = new Date().toISOString();
      // Dùng setDoc merge thay vì updateDoc để:
      // - Không fail khi doc users/{uid} chưa tồn tại
      // - Chỉ merge các field permissions*, không đụng đến field khác
      await setDoc(
        doc(getDb(), "users", uid),
        {
          permissions,
          permissionsUpdatedAt: now,
          permissionsUpdatedBy: updatedBy,
          updatedAt: now,
        },
        { merge: true },
      );
      return { uid, permissions };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["users", vars.uid, "permissions"] });
      qc.invalidateQueries({ queryKey: ["users", vars.uid] });
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Employee, "id" | "createdAt" | "updatedAt">) => {
      const id = generateId("emp");
      const now = new Date().toISOString();
      await setDocument("employees", id, {
        ...input,
        id,
        createdAt: now,
        updatedAt: now,
      });
      return { id, ...input };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.employees }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Employee> }) => {
      await updateDocument("employees", id, { ...patch, updatedAt: new Date().toISOString() });
      return { id, patch };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.employees }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDocument("employees", id);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.employees }),
  });
}

export function useKpiTemplates() {
  const { data, isLoading } = useRealtimeCollection<KpiTemplate>("kpi_templates");
  return { data, isLoading } as const;
}

export function useKpiTemplateByType(type: string | undefined) {
  const { data, isLoading } = useRealtimeCollection<KpiTemplate>("kpi_templates");
  const active = type ? data.find((t) => t.type === type && t.status === "ACTIVE") ?? null : null;
  return { data: active, isLoading } as const;
}

export function useCreateKpiTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<KpiTemplate, "id" | "createdAt">) => {
      const id = generateId("tpl");
      const now = new Date().toISOString();
      await setDocument("kpi_templates", id, { ...input, id, createdAt: now });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.templates }),
  });
}

export function useUpdateKpiTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<KpiTemplate> }) => {
      await updateDocument("kpi_templates", id, patch);
      return { id, patch };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.templates }),
  });
}

export function useKpiPeriods() {
  const { data, isLoading } = useRealtimeCollection<KpiPeriod>("kpi_periods");
  return { data, isLoading } as const;
}

export function useCurrentPeriod() {
  const { data } = useKpiPeriods();
  const today = new Date();
  const current = data?.find(
    (p) =>
      p.status === "OPEN" &&
      new Date(p.startDate) <= today &&
      new Date(p.endDate) >= today,
  );
  return current ?? null;
}

export function useCreatePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<KpiPeriod, "id" | "createdAt">) => {
      const id = generateId("per");
      const now = new Date().toISOString();
      await setDocument("kpi_periods", id, { ...input, id, createdAt: now });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.periods }),
  });
}

export function useKpiRecords(periodId: string | undefined, filters?: KpiRecordFilters) {
  // Realtime subscription - sẽ tự động cập nhật khi admin hoặc user khác thay đổi dữ liệu
  const constraints: QueryConstraint[] = [];
  if (periodId) constraints.push(where("periodId", "==", periodId));
  if (filters?.branch) constraints.push(where("branch", "==", filters.branch));
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  if (filters?.templateType) constraints.push(where("templateType", "==", filters.templateType));

  const { data: raw, isLoading } = useRealtimeCollection<KpiRecord>(
    "kpi_records",
    constraints,
    [periodId, filters?.branch, filters?.status, filters?.templateType],
  );

  // Lọc client-side cho program (vì templateType startsWith cần custom logic)
  const data = filters?.program
    ? raw.filter((r) => r.templateType.startsWith(`teacher_${filters.program?.toLowerCase()}`))
    : raw;

  return {
    data,
    isLoading,
    refetch: () => {
      // Với realtime hook, refetch không cần thiết vì onSnapshot tự cập nhật
      // Nhưng giữ API để không phải sửa nơi khác
      return Promise.resolve({ data });
    },
  } as const;
}

export function useUpsertKpiRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: KpiRecord) => {
      await setDocument("kpi_records", record.id, record);
      return record;
    },
    onSuccess: (data) => {
      // Invalidate tất cả queries liên quan kpi_records để UI cập nhật ngay.
      // Dùng prefix ["kpi_records"] + refetchType:"all" để chắc chắn mọi query
      // (kể cả query có filter object) đều được refetch.
      qc.invalidateQueries({ queryKey: ["kpi_records"], refetchType: "all" });
    },
  });
}

export function useRankingRules() {
  return useQuery({
    queryKey: QUERY_KEYS.ranking,
    queryFn: async () => {
      const all = await listCollection<RankingRules>("ranking_rules");
      return all.find((r) => r.status === "ACTIVE") ?? null;
    },
  });
}

export function useSaveRankingRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rules: RankingRules) => {
      await setDocument("ranking_rules", rules.id, rules);
      return rules;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.ranking }),
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: QUERY_KEYS.auditLogs,
    queryFn: () => listCollection<AuditLog>("audit_logs"),
  });
}

export function useWriteAuditLog() {
  return useMutation({
    mutationFn: async (log: Omit<AuditLog, "id" | "timestamp">) => {
      const id = generateId("log");
      const timestamp = new Date().toISOString();
      await setDocument("audit_logs", id, { ...log, id, timestamp });
      return id;
    },
  });
}

// ─── KPI Record Actions ─────────────────────────────────────────────────────

export function useApproveKpiRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, approvedBy }: { recordId: string; approvedBy: string }) => {
      const doc = await getDocument<KpiRecord>("kpi_records", recordId);
      if (!doc) throw new Error("Record not found");
      const now = new Date().toISOString();
      const updated: KpiRecord = {
        ...doc,
        status: "APPROVED",
        approvedBy,
        approvedAt: now,
        updatedAt: now,
      };
      await setDocument("kpi_records", recordId, updated);
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.records });
    },
  });
}

export function useRejectKpiRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      rejectedBy,
      reason,
    }: {
      recordId: string;
      rejectedBy: string;
      reason: string;
    }) => {
      const doc = await getDocument<KpiRecord>("kpi_records", recordId);
      if (!doc) throw new Error("Record not found");
      const now = new Date().toISOString();
      const updated: KpiRecord = {
        ...doc,
        status: "REJECTED",
        note: `[Từ chối bởi ${rejectedBy}]: ${reason}`,
        updatedAt: now,
      };
      await setDocument("kpi_records", recordId, updated);
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.records });
    },
  });
}

export function useSubmitKpiRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, submittedBy }: { recordId: string; submittedBy: string }) => {
      const doc = await getDocument<KpiRecord>("kpi_records", recordId);
      if (!doc) throw new Error("Record not found");
      const now = new Date().toISOString();
      const updated: KpiRecord = {
        ...doc,
        status: "SUBMITTED",
        submittedBy,
        submittedAt: now,
        updatedAt: now,
      };
      await setDocument("kpi_records", recordId, updated);
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.records });
    },
  });
}

export function useReopenKpiRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId }: { recordId: string; reopenedBy: string }) => {
      const doc = await getDocument<KpiRecord>("kpi_records", recordId);
      if (!doc) throw new Error("Record not found");
      const now = new Date().toISOString();
      const updated: KpiRecord = {
        ...doc,
        status: "IN_PROGRESS",
        approvedBy: undefined,
        approvedAt: undefined,
        updatedAt: now,
      };
      await setDocument("kpi_records", recordId, updated);
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.records });
    },
  });
}

// ─── Employee KPIs ──────────────────────────────────────────────────────────

export function useEmployeeKpiRecords(employeeId: string | undefined) {
  const constraints: QueryConstraint[] = [];
  if (employeeId) constraints.push(where("employeeId", "==", employeeId));
  const { data: raw, isLoading } = useRealtimeCollection<KpiRecord>(
    "kpi_records",
    constraints,
    [employeeId],
  );
  const data = [...raw].sort((a, b) => a.periodId.localeCompare(b.periodId));
  return { data, isLoading } as const;
}

// ─── All KPI Records (for approval) ────────────────────────────────────────

export function useAllKpiRecords() {
  const { appUser } = useAuth();
  const { data: raw, isLoading, error } = useRealtimeCollection<KpiRecord>("kpi_records");

  // Client-side filter theo role/branch để đảm bảo:
  //  - OP chỉ thấy records thuộc branch của mình (phòng case Firestore rule không lọc)
  //  - PM chỉ thấy records thuộc program+branch của mình
  //  - Admin/Board thấy tất cả
  const data = (() => {
    if (!appUser) return raw;
    const role = appUser.role;
    if (role === ROLE.ADMIN || role === ROLE.BOARD) return raw;
    if (role === ROLE.OPERATION_MANAGER) {
      return raw.filter((r) => r.branch === appUser.branch);
    }
    if (role === ROLE.PROGRAM_MANAGER_HS || role === ROLE.PROGRAM_MANAGER_ST) {
      const tt = role === ROLE.PROGRAM_MANAGER_HS ? "teacher_hs" : "teacher_st";
      return raw.filter(
        (r) => r.branch === appUser.branch && r.templateType === tt,
      );
    }
    return raw.filter((r) => r.employeeId === appUser.uid);
  })();

  return { data, isLoading, error } as const;
}

// ─── Reports ────────────────────────────────────────────────────────────────

export interface ReportFilters {
  periodId?: string;
  branch?: Branch;
  program?: Program;
  templateType?: KpiRecord["templateType"];
  status?: KpiRecord["status"];
}

export async function exportKpiReportToExcel(filters: ReportFilters): Promise<void> {
  const records = await listCollection<KpiRecord>("kpi_records");
  const employees = await listCollection<Employee>("employees");
  const periods = await listCollection<KpiPeriod>("kpi_periods");

  let filtered = records;
  if (filters.periodId) filtered = filtered.filter((r) => r.periodId === filters.periodId);
  if (filters.branch) filtered = filtered.filter((r) => r.branch === filters.branch);
  if (filters.status) filtered = filtered.filter((r) => r.status === filters.status);
  if (filters.templateType) filtered = filtered.filter((r) => r.templateType === filters.templateType);
  if (filters.program) {
    const type = filters.program === "HS" ? "teacher_hs" : "teacher_st";
    filtered = filtered.filter((r) => r.templateType === type);
  }

  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const periodMap = new Map(periods.map((p) => [p.id, p]));

  const headers = [
    "STT", "Mã NV", "Họ tên", "Cơ sở", "Chương trình", "Vị trí",
    "Kỳ", "Template", "Điểm KPI", "Xếp loại", "% Bonus", "Trạng thái",
  ];

  const rows = filtered.map((r, idx) => {
    const emp = employeeMap.get(r.employeeId);
    const period = periodMap.get(r.periodId);
    return [
      idx + 1,
      emp?.code ?? r.employeeId,
      emp?.fullName ?? "N/A",
      r.branch,
      r.templateType.startsWith("teacher_") ? (r.templateType === "teacher_hs" ? "HS" : "ST") : "-",
      emp?.position ?? "-",
      period ? `T${period.month}/${period.year}` : r.periodId,
      r.templateType,
      r.kpiScore.toFixed(2),
      r.rank,
      `${r.bonusPercent}%`,
      r.status,
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const period = filters.periodId ? `_T${filters.periodId}` : "";
  const branch = filters.branch ? `_${filters.branch}` : "";
  link.download = `KPI_Report${period}${branch}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Xuất báo cáo KPI chi tiết: mỗi dòng là 1 sự kiện, kèm tiêu chí + điểm
 * Bao gồm cả nhân viên đã chấm (mọi trạng thái trừ DRAFT không tồn tại)
 */
export async function exportKpiReportDetailed(filters: ReportFilters): Promise<void> {
  const records = await listCollection<KpiRecord>("kpi_records");
  const employees = await listCollection<Employee>("employees");
  const periods = await listCollection<KpiPeriod>("kpi_periods");

  let filtered = records;
  if (filters.periodId) filtered = filtered.filter((r) => r.periodId === filters.periodId);
  if (filters.branch) filtered = filtered.filter((r) => r.branch === filters.branch);
  if (filters.status) filtered = filtered.filter((r) => r.status === filters.status);
  if (filters.templateType) filtered = filtered.filter((r) => r.templateType === filters.templateType);
  if (filters.program) {
    const type = filters.program === "HS" ? "teacher_hs" : "teacher_st";
    filtered = filtered.filter((r) => r.templateType === type);
  }

  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const periodMap = new Map(periods.map((p) => [p.id, p]));

  const headers = [
    "STT",
    "Mã NV",
    "Họ tên",
    "Cơ sở",
    "Chương trình",
    "Phòng ban",
    "Vị trí",
    "Kỳ",
    "Template",
    "Tiêu chí",
    "Trọng số (%)",
    "Điểm tiêu chí",
    "Ngày",
    "Mã rule",
    "Mô tả sự kiện",
    "Loại",
    "Điểm sự kiện",
    "Ghi chú",
    "Điểm KPI",
    "Xếp loại",
    "% Thưởng",
    "Trạng thái",
  ];

  const rows: string[][] = [];
  let stt = 1;

  filtered
    .slice()
    .sort((a, b) => {
      const ea = employeeMap.get(a.employeeId)?.code ?? a.employeeId;
      const eb = employeeMap.get(b.employeeId)?.code ?? b.employeeId;
      if (ea !== eb) return ea.localeCompare(eb);
      return a.periodId.localeCompare(b.periodId);
    })
    .forEach((rec) => {
      const emp = employeeMap.get(rec.employeeId);
      const period = periodMap.get(rec.periodId);
      const periodLabel = period ? `T${period.month}/${period.year}` : rec.periodId;
      const programLabel = rec.templateType === "teacher_hs" ? "HS"
        : rec.templateType === "teacher_st" ? "ST"
        : rec.templateType === "manager" ? "Ban Giám Hiệu"
        : rec.templateType === "office_support" ? "Văn phòng + Hỗ trợ"
        : "-";

      // Build events list
      const eventsByCrit: Array<{
        criterionName: string;
        weight: number;
        total: number;
        events: KpiEvent[];
      }> = rec.criteria.map((c) => ({
        criterionName: c.name,
        weight: c.weight,
        total: c.total,
        events: c.events,
      }));

      const totalEvents = eventsByCrit.reduce((a, c) => a + c.events.length, 0);

      if (totalEvents === 0) {
        rows.push([
          String(stt++),
          emp?.code ?? "",
          emp?.fullName ?? "",
          rec.branch,
          programLabel,
          emp?.department ?? "",
          emp?.position ?? "",
          periodLabel,
          rec.templateType,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          rec.kpiScore.toFixed(2),
          rec.rank,
          `${rec.bonusPercent}%`,
          rec.status,
        ]);
      } else {
        eventsByCrit.forEach((c) => {
          if (c.events.length === 0) {
            rows.push([
              String(stt++),
              emp?.code ?? "",
              emp?.fullName ?? "",
              rec.branch,
              programLabel,
              emp?.department ?? "",
              emp?.position ?? "",
              periodLabel,
              rec.templateType,
              c.criterionName,
              String(Math.round(c.weight * 100)),
              c.total.toFixed(0),
              "",
              "",
              "",
              "",
              "",
              "",
              rec.kpiScore.toFixed(2),
              rec.rank,
              `${rec.bonusPercent}%`,
              rec.status,
            ]);
            return;
          }
          c.events.forEach((ev) => {
            rows.push([
              String(stt++),
              emp?.code ?? "",
              emp?.fullName ?? "",
              rec.branch,
              programLabel,
              emp?.department ?? "",
              emp?.position ?? "",
              periodLabel,
              rec.templateType,
              c.criterionName,
              String(Math.round(c.weight * 100)),
              c.total.toFixed(0),
              String(ev.date),
              ev.ruleCode,
              ev.note ?? "",
              ev.points >= 0 ? "Thưởng" : "Phạt",
              String(ev.points),
              ev.note ?? "",
              rec.kpiScore.toFixed(2),
              rec.rank,
              `${rec.bonusPercent}%`,
              rec.status,
            ]);
          });
        });
      }

      // Dòng tổng kết record
      rows.push([
        "TỔNG",
        emp?.code ?? "",
        emp?.fullName ?? "",
        rec.branch,
        programLabel,
        emp?.department ?? "",
        emp?.position ?? "",
        periodLabel,
        rec.templateType,
        `${rec.criteria.length} tiêu chí`,
        "",
        "",
        `${totalEvents} sự kiện`,
        "",
        "",
        "",
        "",
        "",
        rec.kpiScore.toFixed(2),
        rec.rank,
        `${rec.bonusPercent}%`,
        rec.status,
      ]);
      rows.push([]); // blank line giữa các record
    });

  const csvContent = [headers.join(","), ...rows.map((row) => row.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(","))].join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const periodTag = filters.periodId ? `_T${filters.periodId}` : "";
  const branchTag = filters.branch ? `_${filters.branch}` : "";
  link.download = `KPI_ReportDetail${periodTag}${branchTag}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}