import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Đang tải...
      </div>
    );
  }
  if (!firebaseUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}