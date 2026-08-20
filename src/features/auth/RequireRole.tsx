import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import type { Role } from "@/constants/roles";

interface Props {
  allow: Role[];
  children: ReactNode;
}

export function RequireRole({ allow, children }: Props) {
  const { appUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Đang tải...
      </div>
    );
  }
  if (!appUser || !allow.includes(appUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}