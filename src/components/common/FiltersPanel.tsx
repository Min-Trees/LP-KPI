import type { Branch } from "@/types/branch";
import type { Program } from "@/constants/programs";
import type { KpiRecordStatus, KpiTemplateType } from "@/types";
import { BranchSelector } from "./BranchSelector";
import { ProgramSelector } from "./ProgramSelector";

export interface FiltersState {
  branch: Branch | "";
  program: Program | "";
  status: KpiRecordStatus | "";
  templateType: KpiTemplateType | "";
  search: string;
}

interface FiltersPanelProps {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  showBranch?: boolean;
  showProgram?: boolean;
  showStatus?: boolean;
  showTemplateType?: boolean;
  branches?: Branch[];
  className?: string;
}

export function FiltersPanel({
  filters,
  onChange,
  showBranch = true,
  showProgram = true,
  showStatus = true,
  showTemplateType = false,
  branches,
  className = "",
}: FiltersPanelProps) {
  const update = (key: keyof FiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {showBranch && (
        <BranchSelector
          value={filters.branch}
          onChange={(v) => update("branch", v)}
          branches={branches}
          placeholder="Tất cả cơ sở"
          className="w-44"
        />
      )}
      {showProgram && (
        <ProgramSelector
          value={filters.program}
          onChange={(v) => update("program", v)}
          placeholder="Tất cả chương trình"
          className="w-40"
        />
      )}
      {showStatus && (
        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className="input w-40"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="IN_PROGRESS">Đang chấm</option>
          <option value="SUBMITTED">Đã gửi</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Bị từ chối</option>
          <option value="LOCKED">Đã khóa</option>
        </select>
      )}
      {showTemplateType && (
        <select
          value={filters.templateType}
          onChange={(e) => update("templateType", e.target.value)}
          className="input w-40"
        >
          <option value="">Tất cả loại</option>
          <option value="manager">Manager</option>
          <option value="office_support">Văn phòng + Hỗ trợ</option>
          <option value="teacher_hs">Giáo viên HS</option>
          <option value="teacher_st">Giáo viên ST</option>
        </select>
      )}
      <input
        type="text"
        placeholder="Tìm theo tên, mã NV..."
        value={filters.search}
        onChange={(e) => update("search", e.target.value)}
        className="input flex-1 min-w-48"
      />
    </div>
  );
}

export const defaultFilters: FiltersState = {
  branch: "",
  program: "",
  status: "",
  templateType: "",
  search: "",
};
