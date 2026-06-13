"use client";

import { useNotificationsContext } from "@/components/providers/NotificationsProvider";

/** @deprecated Prefer useNotificationsContext inside NotificationsProvider layouts. */
export function useNotifications() {
  try {
    return useNotificationsContext();
  } catch {
    return {
      items: [],
      unreadCount: 0,
      loading: false,
      error: "",
      refresh: async () => {},
      markRead: async () => {},
      markAllRead: async () => {}
    };
  }
}
