"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/shared/Icon";
import { useNotifications } from "@/hooks/useNotifications";
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

export default function NotificationBell({ theme = "light" }) {
  const { items, unreadCount, loading, error, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isBrand = theme === "brand";

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
          isBrand
            ? "border-white/15 text-white/80 hover:bg-white/10 hover:text-white"
            : "border-border bg-card text-text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-accent",
          open && !isBrand && "border-accent/30 ring-2 ring-accent/10"
        )}
        aria-label="الإشعارات"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black text-white ring-2 ring-card">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="قائمة الإشعارات"
          className="absolute end-0 top-[calc(100%+8px)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl ring-1 ring-black/5 animate-[fadeIn_0.2s_ease-out]"
        >
          <div className="flex items-center justify-between border-b border-border bg-bg/60 px-4 py-3">
            <h2 className="text-sm font-black text-text">الإشعارات</h2>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs font-bold text-accent hover:underline"
              >
                تعليم الكل كمقروء
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-sm text-text-muted">جاري التحميل...</p>
            ) : error ? (
              <p className="p-4 text-center text-sm text-danger">{error}</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-center text-sm text-text-muted">لا توجد إشعارات بعد</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.is_read) markRead(item.id);
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-start transition-colors hover:bg-accent/5",
                        !item.is_read && "bg-accent/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!item.is_read ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
                        ) : (
                          <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-text">{item.title}</p>
                          {item.body ? (
                            <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{item.body}</p>
                          ) : null}
                          <p className="mt-1 text-[11px] text-text-muted">{formatWhen(item.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
