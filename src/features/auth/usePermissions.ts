import { useMemo } from "react";
import { useAuth } from "./AuthProvider";
import {
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  type Permission,
} from "@/constants/permissions";
import { ROLE } from "@/constants/roles";

/**
 * Hook kiểm tra quyền của user hiện tại.
 * - Admin luôn có full quyền (không thể bị override hạn chế).
 * - User khác: nếu có `permissions` override trong users/{uid} → dùng danh sách đó.
 *   Nếu không → dùng `ROLE_DEFAULT_PERMISSIONS[role]`.
 */
export function usePermissions() {
  const { appUser } = useAuth();

  const permissions = useMemo<Set<Permission>>(() => {
    if (!appUser) return new Set();

    // Admin luôn có full quyền
    if (appUser.role === ROLE.ADMIN) {
      return new Set(ALL_PERMISSIONS);
    }

    if (appUser.permissions && Array.isArray(appUser.permissions)) {
      return new Set(appUser.permissions);
    }

    return new Set(ROLE_DEFAULT_PERMISSIONS[appUser.role] ?? []);
  }, [appUser]);

  const has = (perm: Permission): boolean => permissions.has(perm);
  const hasAny = (perms: Permission[]): boolean => perms.some((p) => permissions.has(p));
  const hasAll = (perms: Permission[]): boolean => perms.every((p) => permissions.has(p));

  return { permissions, has, hasAny, hasAll };
}