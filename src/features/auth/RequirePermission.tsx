import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { usePermissions } from "./usePermissions";
import type { Permission } from "@/constants/permissions";

interface Props {
  /** Permission bắt buộc để vào trang. User chỉ cần có 1 trong các perm này. */
  permission?: Permission | Permission[];
  children: ReactNode;
}

/**
 * Guard route theo permission. Nếu không có quyền → redirect về /dashboard.
 * Admin luôn pass.
 */
export function RequirePermission({ permission, children }: Props) {
  const { appUser, loading } = useAuth();
  const { hasAny } = usePermissions();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Đang tải...
      </div>
    );
  }

  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  if (permission) {
    const perms = Array.isArray(permission) ? permission : [permission];
    if (!hasAny(perms)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}