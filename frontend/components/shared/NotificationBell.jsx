"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import { useNotificationsContext } from "@/components/providers/NotificationsProvider";
import { getNotificationTypeMeta } from "@/lib/notification-types";
import { cn } from "@/lib/utils";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

function notifyThemeClasses(theme) {
  if (theme === "brand") {
    return {
      btn: "border-white/15 text-white/80 hover:bg-white/10 hover:text-white",
      btnOpen: "ring-2 ring-white/20",
      badge: "ring-primary",
      panel: "border-outline-variant/40 bg-surface-container shadow-xl ring-1 ring-black/5",
      panelHeader: "border-outline-variant/40 bg-surface-container-low/60",
      title: "text-on-surface",
      muted: "text-on-surface-variant",
      unread: "bg-accent/5"
    };
  }
  if (theme === "surface") {
    return {
      btn: "border-outline-variant/60 bg-surface-container-high text-on-surface-variant hover:border-primary-container/40 hover:text-md-primary",
      btnOpen: "border-primary-container/40 ring-2 ring-primary-container/15",
      badge: "ring-surface-container-high",
      panel: "border-outline-variant bg-surface-container-high shadow-xl shadow-black/25",
      panelHeader: "border-outline-variant/50 bg-surface-container",
      title: "text-on-surface",
      muted: "text-on-surface-variant",
      unread: "bg-primary-container/10"
    };
  }
  return {
    btn: "border-outline-variant/40 bg-surface-container text-on-surface-variant hover:border-accent/30 hover:bg-accent/5 hover:text-accent",
    btnOpen: "border-accent/30 ring-2 ring-accent/10",
    badge: "ring-card",
    panel: "border-outline-variant/40 bg-surface-container shadow-xl ring-1 ring-black/5",
    panelHeader: "border-outline-variant/40 bg-surface-container-low/60",
    title: "text-on-surface",
    muted: "text-on-surface-variant",
    unread: "bg-accent/5"
  };
}

export default function NotificationBell({ theme = "light" }) {
  const router = useRouter();
  const { items, unreadCount, loading, error, markRead, markAllRead } = useNotificationsContext();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const styles = notifyThemeClasses(theme);
  const isSurface = theme === "surface";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="الإشعارات"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative rounded-xl border p-2 transition-colors",
          styles.btn,
          open && styles.btnOpen
        )}
        aria-label="الإشعارات"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 ? (
          <span className={cn("absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-container px-1 text-[10px] font-black text-on-primary-container ring-2", styles.badge)}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="قائمة الإشعارات"
          className={cn(
            "absolute end-0 top-[calc(100%+8px)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl animate-[fadeIn_0.2s_ease-out]",
            styles.panel
          )}
        >
          <div className={cn("flex items-center justify-between border-b px-4 py-3", styles.panelHeader)}>
            <h2 className={cn("text-sm font-black", styles.title)}>الإشعارات</h2>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs font-bold text-md-primary hover:underline"
              >
                تعليم الكل كمقروء
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <SectionLoader message="جاري التحميل..." />
            ) : error ? (
              <p className="p-4 text-center text-sm text-error">{error}</p>
            ) : items.length === 0 ? (
              <p className={cn("p-6 text-center text-sm", styles.muted)}>لا توجد إشعارات بعد</p>
            ) : (
              <ul className={cn("divide-y divide-outline-variant/40")}>
                {items.map((item) => {
                  const typeMeta = getNotificationTypeMeta(item.type);
                  return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.is_read) markRead(item.id);
                        if (item.action_url) {
                          setOpen(false);
                          router.push(item.action_url);
                        }
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-start transition-colors hover:bg-primary-container/5",
                        !item.is_read && styles.unread
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            isSurface ? "bg-primary-container/15 text-md-primary" : "bg-accent/10 text-accent"
                          )}
                          aria-hidden
                        >
                          <Icon name={typeMeta.icon} size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm font-bold", styles.title)}>{item.title}</p>
                            {!item.is_read ? (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-primary-container" aria-hidden />
                            ) : null}
                          </div>
                          {typeMeta.label && item.type !== "general" ? (
                            <p className={cn("mt-0.5 text-[10px] font-bold uppercase tracking-wide opacity-70", styles.muted)}>
                              {typeMeta.label}
                            </p>
                          ) : null}
                          {item.body ? (
                            <p className={cn("mt-0.5 text-xs leading-relaxed", styles.muted)}>{item.body}</p>
                          ) : null}
                          <p className={cn("mt-1 text-[11px]", styles.muted)}>{formatWhen(item.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
