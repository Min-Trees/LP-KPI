import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABEL } from "@/constants/roles";
import { LogOut, Calendar, AlertCircle } from "lucide-react";
import { useCurrentPeriod } from "@/api/hooks";
import { formatDate } from "@/utils";
import { NotificationBell } from "@/components/NotificationBell";

export function Header() {
  const { appUser, signOut } = useAuth();
  const period = useCurrentPeriod();

  const periodStatus = period?.status ?? "NO_PERIOD";
  const statusColor: Record<string, string> = {
    OPEN: "bg-emerald-100 text-emerald-700",
    CLOSED: "bg-slate-100 text-slate-600",
    LOCKED: "bg-amber-100 text-amber-700",
    NO_PERIOD: "bg-rose-100 text-rose-700",
  };
  const statusLabel: Record<string, string> = {
    OPEN: "Đang mở",
    CLOSED: "Đã đóng",
    LOCKED: "Đã chốt",
    NO_PERIOD: "Chưa có kỳ",
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-5">
      {/* Left: Period info */}
      <div className="flex items-center gap-4">
        {period ? (
          <>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Calendar size={14} className="text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-800">{period.name}</p>
                <p className="text-[10px] text-slate-400">
                  {formatDate(period.startDate)} — {formatDate(period.endDate)}
                </p>
              </div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor[periodStatus]}`}>
              {statusLabel[periodStatus]}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-600">
            <AlertCircle size={12} />
            Chưa có kỳ KPI nào
          </div>
        )}
      </div>

      {/* Right: Notifications + User + logout */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        {appUser && (
          <div className="flex items-center gap-2">
            <div className="hidden text-right lg:block">
              <p className="text-sm font-medium text-slate-900">{appUser.displayName}</p>
              <p className="text-[10px] text-slate-400">{ROLE_LABEL[appUser.role]}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {appUser.displayName?.[0]?.toUpperCase() ?? "?"}
            </div>
          </div>
        )}
        <div className="h-5 w-px bg-slate-200" />
        <button
          onClick={() => void signOut()}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          aria-label="Đăng xuất"
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
