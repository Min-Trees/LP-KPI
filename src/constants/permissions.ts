// Permission constants - các quyền chức năng trên hệ thống
// Mỗi permission đại diện cho 1 chức năng/ route, cho phép admin
// gán quyền chi tiết cho từng tài khoản (override theo role).

export const PERMISSIONS = {
  // Dashboard & báo cáo
  DASHBOARD_VIEW: "dashboard.view",
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  // KPI - chấm điểm cho các nhóm
  KPI_SCORING_MANAGER: "kpi.scoring.manager",
  KPI_SCORING_OFFICE_SUPPORT: "kpi.scoring.office_support",
  KPI_SCORING_TEACHER_HS: "kpi.scoring.teacher_hs",
  KPI_SCORING_TEACHER_ST: "kpi.scoring.teacher_st",

  // KPI - cá nhân
  KPI_PERSONAL_VIEW: "kpi.personal.view",
  KPI_APPROVE: "kpi.approve",

  // Quản trị
  ADMIN_ACCOUNTS: "admin.accounts",
  ADMIN_EMPLOYEES: "admin.employees",
  ADMIN_KPI_TEMPLATES: "admin.kpi_templates",
  ADMIN_RANKING_RULES: "admin.ranking_rules",
  ADMIN_SYSTEM_SETTINGS: "admin.system_settings",
  ADMIN_AUDIT_LOGS: "admin.audit_logs",
  ADMIN_PERMISSIONS: "admin.permissions",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_LABEL: Record<Permission, string> = {
  [PERMISSIONS.DASHBOARD_VIEW]: "Xem Dashboard tổng quan",
  [PERMISSIONS.REPORTS_VIEW]: "Xem báo cáo KPI",
  [PERMISSIONS.REPORTS_EXPORT]: "Xuất báo cáo (Excel/CSV)",

  [PERMISSIONS.KPI_SCORING_MANAGER]: "Chấm KPI Ban Giám Hiệu",
  [PERMISSIONS.KPI_SCORING_OFFICE_SUPPORT]: "Chấm KPI Văn phòng + Hỗ trợ",
  [PERMISSIONS.KPI_SCORING_TEACHER_HS]: "Chấm KPI Giáo viên HS",
  [PERMISSIONS.KPI_SCORING_TEACHER_ST]: "Chấm KPI Giáo viên ST",

  [PERMISSIONS.KPI_PERSONAL_VIEW]: "Xem KPI cá nhân",
  [PERMISSIONS.KPI_APPROVE]: "Duyệt KPI (Board/Admin)",

  [PERMISSIONS.ADMIN_ACCOUNTS]: "Quản lý Tài khoản",
  [PERMISSIONS.ADMIN_EMPLOYEES]: "Quản lý Nhân sự",
  [PERMISSIONS.ADMIN_KPI_TEMPLATES]: "Quản lý Mẫu KPI",
  [PERMISSIONS.ADMIN_RANKING_RULES]: "Quản lý Xếp loại & Thưởng",
  [PERMISSIONS.ADMIN_SYSTEM_SETTINGS]: "Cấu hình hệ thống",
  [PERMISSIONS.ADMIN_AUDIT_LOGS]: "Xem Nhật ký hoạt động",
  [PERMISSIONS.ADMIN_PERMISSIONS]: "Phân quyền tài khoản",
};

export const PERMISSION_GROUPS: Array<{
  id: string;
  label: string;
  permissions: Permission[];
}> = [
  {
    id: "dashboard",
    label: "Tổng quan & Báo cáo",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
    ],
  },
  {
    id: "kpi_scoring",
    label: "KPI Chấm điểm",
    permissions: [
      PERMISSIONS.KPI_SCORING_MANAGER,
      PERMISSIONS.KPI_SCORING_OFFICE_SUPPORT,
      PERMISSIONS.KPI_SCORING_TEACHER_HS,
      PERMISSIONS.KPI_SCORING_TEACHER_ST,
    ],
  },
  {
    id: "personal",
    label: "KPI Cá nhân",
    permissions: [PERMISSIONS.KPI_PERSONAL_VIEW, PERMISSIONS.KPI_APPROVE],
  },
  {
    id: "admin",
    label: "Quản trị hệ thống",
    permissions: [
      PERMISSIONS.ADMIN_ACCOUNTS,
      PERMISSIONS.ADMIN_EMPLOYEES,
      PERMISSIONS.ADMIN_KPI_TEMPLATES,
      PERMISSIONS.ADMIN_RANKING_RULES,
      PERMISSIONS.ADMIN_SYSTEM_SETTINGS,
      PERMISSIONS.ADMIN_AUDIT_LOGS,
      PERMISSIONS.ADMIN_PERMISSIONS,
    ],
  },
];

/**
 * Default permissions theo role — dùng để gợi ý khi phân quyền cho user mới.
 * Admin luôn có tất cả quyền và không thể bị hạn chế.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  BOARD: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.KPI_PERSONAL_VIEW,
    PERMISSIONS.KPI_APPROVE,
    PERMISSIONS.ADMIN_AUDIT_LOGS,
  ],
  OPERATION_MANAGER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.KPI_SCORING_OFFICE_SUPPORT,
    PERMISSIONS.KPI_PERSONAL_VIEW,
  ],
  PROGRAM_MANAGER_HS: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.KPI_SCORING_TEACHER_HS,
    PERMISSIONS.KPI_PERSONAL_VIEW,
  ],
  PROGRAM_MANAGER_ST: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.KPI_SCORING_TEACHER_ST,
    PERMISSIONS.KPI_PERSONAL_VIEW,
  ],
  EMPLOYEE: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.KPI_PERSONAL_VIEW],
};