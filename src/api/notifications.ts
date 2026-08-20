import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCollection, getDocument, setDocument } from "@/api/firestore";
import type { AppNotification } from "@/types";
import { generateId } from "@/utils";

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  userNotifications: (userId: string) => ["notifications", userId] as const,
  unreadCount: (userId: string) => ["notifications", userId, "unread"] as const,
};

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? NOTIFICATION_KEYS.userNotifications(userId) : ["notifications", "none"],
    queryFn: async () => {
      if (!userId) return [];
      const all = await listCollection<AppNotification>("notifications");
      return all
        .filter((n) => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!userId,
  });
}

export function useUnreadCount(userId: string | undefined) {
  const { data } = useNotifications(userId);
  return data?.filter((n) => !n.read).length ?? 0;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const doc = await getDocument<AppNotification>("notifications", id);
      if (doc) {
        await setDocument("notifications", id, { ...doc, read: true });
      }
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const all = await listCollection<AppNotification>("notifications");
      const unread = all.filter((n) => n.userId === userId && !n.read);
      await Promise.all(
        unread.map((n) =>
          setDocument("notifications", n.id, { ...n, read: true }),
        ),
      );
      return unread.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

export async function createNotification(data: {
  userId: string;
  type: AppNotification["type"];
  title: string;
  body: string;
  link?: string;
}) {
  const id = generateId("notif");
  const notification: AppNotification = {
    id,
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    link: data.link,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await setDocument("notifications", id, notification);
  return id;
}
