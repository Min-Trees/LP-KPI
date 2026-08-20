import type { Rank, KpiRecordStatus } from "@/types";

export const RANK_LABEL: Record<Rank, string> = {
  XUAT_SAC: "Xuất sắc",
  TOT: "Tốt",
  DAT: "Đạt",
  CAN_CAI_THIEN: "Cần cải thiện",
};

export const RANK_COLOR: Record<Rank, string> = {
  XUAT_SAC: "bg-emerald-100 text-emerald-700",
  TOT: "bg-sky-100 text-sky-700",
  DAT: "bg-amber-100 text-amber-700",
  CAN_CAI_THIEN: "bg-rose-100 text-rose-700",
};

export const STATUS_LABEL: Record<KpiRecordStatus, string> = {
  DRAFT: "Nháp",
  IN_PROGRESS: "Đang chấm",
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  LOCKED: "Đã khóa",
  REJECTED: "Trả lại",
};

export const STATUS_COLOR: Record<KpiRecordStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SUBMITTED: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  LOCKED: "bg-slate-200 text-slate-900",
  REJECTED: "bg-rose-100 text-rose-700",
};