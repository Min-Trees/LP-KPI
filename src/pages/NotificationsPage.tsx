import { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/api/notifications";
import type { AppNotification } from "@/types";
import { formatDateTime } from "@/utils";

const TYPE_CONFIG = {
  INFO: { icon: Info, color: "text-blue-500 bg-blue-50", label: "Thông tin" },
  SUCCESS: { icon: CheckCircle, color: "text-emerald-500 bg-emerald-50", label: "Thành công" },
  WARNING: { icon: AlertTriangle, color: "text-amber-500 bg-amber-50", label: "Cảnh báo" },
  ERROR: { icon: XCircle, color: "text-rose-500 bg-rose-50", label: "Lỗi" },
};

type FilterType = "ALL" | AppNotification["type"];

export default function NotificationsPage() {
  const { appUser } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(appUser?.uid);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [filter, setFilter] = useState<FilterType>("ALL");

  const filtered = filter === "ALL"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleMarkRead(id: string) {
    if (!appUser?.uid) return;
    markRead.mutate({ id, userId: appUser.uid });
  }

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "ALL", label: `Tất cả (${notifications.length})` },
    { value: "INFO", label: "Thông tin" },
    { value: "SUCCESS", label: "Thành công" },
    { value: "WARNING", label: "Cảnh báo" },
    { value: "ERROR", label: "Lỗi" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thông báo</h1>
          <p className="text-sm text-slate-500">
            {unreadCount > 0
              ? `Bạn có ${unreadCount} thông báo chưa đọc`
              : "Tất cả thông báo đã được đọc"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void (appUser?.uid && markAllRead.mutate(appUser.uid))}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <CheckCheck size={16} />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              filter === opt.value
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          Đang tải...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <Bell size={40} className="mb-3 text-slate-300" />
          <p className="text-base font-medium text-slate-500">
            {filter === "ALL" ? "Chưa có thông báo nào" : "Không có thông báo loại này"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Thông báo sẽ xuất hiện khi có cập nhật về KPI của bạn
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 p-0">
          {filtered.map((notif) => {
            const config = TYPE_CONFIG[notif.type];
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`group flex items-start gap-4 px-5 py-4 transition-colors ${
                  !notif.read ? "bg-brand-50/40 hover:bg-brand-50" : "hover:bg-slate-50"
                }`}
              >
                <div className={`shrink-0 rounded-full p-2.5 ${config.color}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm leading-snug ${!notif.read ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                          {notif.title}
                        </p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 leading-relaxed">{notif.body}</p>
                      <p className="mt-1.5 text-xs text-slate-400">{formatDateTime(notif.createdAt)}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {notif.link && (
                        <a
                          href={notif.link}
                          className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-100"
                        >
                          Xem <ExternalLink size={11} />
                        </a>
                      )}
                      {!notif.read && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 opacity-0 transition-all hover:border-brand-200 hover:text-brand-600 group-hover:opacity-100"
                          title="Đánh dấu đã đọc"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {!notif.read && (
                  <div className="shrink-0 mt-2 h-2 w-2 rounded-full bg-brand-500" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
