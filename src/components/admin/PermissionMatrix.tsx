import { useEffect, useMemo, useState } from "react";
import { Check, Square } from "lucide-react";
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABEL,
  ROLE_DEFAULT_PERMISSIONS,
  type Permission,
} from "@/constants/permissions";
import { useUserPermissions } from "@/api/hooks";
import type { Role } from "@/constants/roles";

interface Props {
  uid: string;
  role: Role;
  onSave: (permissions: Permission[]) => void;
  saving: boolean;
}

/**
 * UI phân quyền chi tiết cho 1 user.
 * - Tick vào từng permission để cấp.
 * - "Mặc định theo role" để reset về role defaults.
 * - "Cấp tất cả" / "Thu hồi tất cả".
 * - Lưu sẽ ghi vào users/{uid}.permissions.
 */
export function PermissionMatrix({ uid, role, onSave, saving }: Props) {
  const { data: userDoc } = useUserPermissions(uid);
  const roleDefaults = useMemo(() => ROLE_DEFAULT_PERMISSIONS[role] ?? [], [role]);

  const initial = useMemo<Permission[]>(() => {
    if (userDoc?.permissions && Array.isArray(userDoc.permissions)) {
      return userDoc.permissions;
    }
    return roleDefaults;
  }, [userDoc, roleDefaults]);

  const [selected, setSelected] = useState<Set<Permission>>(new Set(initial));

  useEffect(() => {
    setSelected(new Set(initial));
  }, [initial]);

  const isCustomized = useMemo(() => {
    const sorted = (arr: Permission[]) => [...arr].sort().join(",");
    return sorted(Array.from(selected)) !== sorted(roleDefaults);
  }, [selected, roleDefaults]);

  function toggle(p: Permission) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function toggleGroup(groupPerms: Permission[], enable: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      groupPerms.forEach((p) => {
        if (enable) next.add(p);
        else next.delete(p);
      });
      return next;
    });
  }

  function grantAll() {
    setSelected(new Set(ALL_PERMISSIONS));
  }

  function revokeAll() {
    setSelected(new Set());
  }

  function resetToDefaults() {
    setSelected(new Set(roleDefaults));
  }

  function handleSave() {
    onSave(Array.from(selected));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-xs text-slate-600">
          Đã chọn: <strong>{selected.size}</strong> / {ALL_PERMISSIONS.length} quyền
        </div>
        {isCustomized && (
          <span className="badge bg-amber-100 text-amber-700">Đã tùy chỉnh</span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={resetToDefaults}
            disabled={saving}
          >
            Mặc định theo role
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={grantAll}
            disabled={saving}
          >
            Cấp tất cả
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={revokeAll}
            disabled={saving}
          >
            Thu hồi tất cả
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {PERMISSION_GROUPS.map((group) => {
          const allChecked = group.permissions.every((p) => selected.has(p));
          const someChecked = group.permissions.some((p) => selected.has(p));
          return (
            <div key={group.id} className="rounded-lg border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-slate-700">{group.label}</div>
                <button
                  type="button"
                  className="text-xs text-brand-600 hover:underline"
                  onClick={() => toggleGroup(group.permissions, !allChecked)}
                  disabled={saving}
                >
                  {allChecked ? "Bỏ chọn nhóm" : someChecked ? "Chọn tất cả trong nhóm" : "Chọn cả nhóm"}
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {group.permissions.map((p) => {
                  const checked = selected.has(p);
                  const isDefault = roleDefaults.includes(p);
                  return (
                    <label
                      key={p}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-brand-600"
                        checked={checked}
                        onChange={() => toggle(p)}
                        disabled={saving}
                      />
                      <div className="flex-1">
                        <div className="text-sm text-slate-800">
                          {PERMISSION_LABEL[p]}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">{p}</div>
                      </div>
                      {isDefault && (
                        <span className="badge bg-slate-100 text-slate-500">Mặc định</span>
                      )}
                      {checked ? (
                        <Check size={14} className="text-brand-600" />
                      ) : (
                        <Square size={14} className="text-slate-300" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white pt-3">
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Đang lưu..." : "Lưu phân quyền"}
        </button>
      </div>
    </div>
  );
}