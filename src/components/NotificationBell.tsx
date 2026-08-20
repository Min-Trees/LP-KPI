import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/api/notifications";
import { Bell, Check, CheckCheck, X, ExternalLink, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { formatDateTime } from "@/utils";

const TYPE_CONFIG = {
  INFO: { icon: Info, color: "text-blue-500 bg-blue-50", label: "Thông tin" },
  SUCCESS: { icon: CheckCircle, color: "text-emerald-500 bg-emerald-50", label: "Thành công" },
  WARNING: { icon: AlertTriangle, color: "text-amber-500 bg-amber-50", label: "Cảnh báo" },
  ERROR: { icon: XCircle, color: "text-rose-500 bg-rose-50", label: "Lỗi" },
};

export function NotificationBell() {
  const { appUser } = useAuth();
  const { data: notifications = [] } = useNotifications(appUser?.uid);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleOpen() {
    setOpen((v) => !v);
  }

  function handleMarkRead(id: string) {
    if (!appUser?.uid) return;
    markRead.mutate({ id, userId: appUser.uid });
  }

  function handleMarkAllRead() {
    if (!appUser?.uid) return;
    markAllRead.mutate(appUser.uid);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200"
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-12 z-50 w-96 max-h-[80vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    <CheckCheck size={13} />
                    Đọc hết
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Bell size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">Chưa có thông báo nào</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((notif) => {
                    const config = TYPE_CONFIG[notif.type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={notif.id}
                        className={`group flex items-start gap-3 px-4 py-3 transition-colors ${
                          !notif.read ? "bg-brand-50/50 hover:bg-brand-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`shrink-0 rounded-full p-2 ${config.color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${!notif.read ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <button
                                onClick={() => handleMarkRead(notif.id)}
                                className="shrink-0 rounded p-0.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-brand-600"
                                title="Đánh dấu đã đọc"
                              >
                                <Check size={12} />
                              </button>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{notif.body}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            <p className="text-[10px] text-slate-400">
                              {formatDateTime(notif.createdAt)}
                            </p>
                            {notif.link && (
                              <a
                                href={notif.link}
                                className="flex items-center gap-1 text-[10px] text-brand-600 hover:text-brand-700"
                              >
                                Xem <ExternalLink size={9} />
                              </a>
                            )}
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
          </div>
        </>
      )}
    </div>
  );
}
