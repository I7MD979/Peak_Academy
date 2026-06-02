"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/shared/Icon";
import MenuButton from "@/components/shared/MenuButton";
import PeakLogo from "@/components/shared/PeakLogo";
import { useAuth } from "@/hooks/useAuth";
import { getTopbarMeta } from "@/lib/topbar";
import { getUserDisplay } from "@/lib/user-display";
import { cn } from "@/lib/utils";

function UserAvatar({ fullName, avatarUrl, className }) {
  const initial = (fullName || "?").trim().slice(0, 1);
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-primary/10 text-sm font-bold text-primary",
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={fullName || "المستخدم"} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

function UserMenu({ profile, roleLabel, profileHref, onLogout, theme = "light" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

  const isBrand = theme === "brand";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors",
          isBrand
            ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
            : "border-border bg-card hover:bg-bg"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar
          fullName={profile.full_name}
          avatarUrl={profile.avatar_url}
          className={isBrand ? "border-white/20 bg-white/15 text-white" : undefined}
        />
        <span className={cn("hidden max-w-[120px] truncate text-sm font-bold sm:inline", isBrand ? "text-white" : "text-text")}>
          {profile.full_name || "مستخدم"}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-[calc(100%+8px)] z-50 min-w-[200px] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-bold text-text">{profile.full_name || "مستخدم"}</p>
            <p className="text-xs text-text-muted">{roleLabel}</p>
          </div>
          <div className="p-1">
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-text hover:bg-bg"
            >
              <Icon name="user" size={16} />
              الملف الشخصي
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
            >
              <Icon name="logout" size={16} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AppTopbar({
  role = "admin",
  onOpenMobile,
  variant = "light",
  menuBreakpoint = "md"
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const profile = getUserDisplay(user);

  const meta = useMemo(() => getTopbarMeta(pathname || "", role), [pathname, role]);
  const isBrand = variant === "brand";
  const showMenu = Boolean(onOpenMobile);
  const menuClass = menuBreakpoint === "lg" ? "lg:hidden" : "md:hidden";

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  if (isBrand) {
    return (
      <header className="sticky top-0 z-30 border-b border-white/10 bg-primary shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href={meta.homeHref}>
            <PeakLogo subtitle={meta.panelLabel} />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/parent/report"
              className={cn(
                "hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors sm:inline-flex",
                pathname?.startsWith("/parent/report")
                  ? "bg-accent/20 text-accent"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon name="barChart" size={16} />
              التقرير
            </Link>

            <button
              type="button"
              className="rounded-xl p-2 text-white/80 transition-colors hover:bg-white/10"
              aria-label="الإشعارات"
            >
              <Icon name="bell" size={20} />
            </button>

            <UserMenu
              profile={profile}
              roleLabel={meta.roleLabel}
              profileHref={meta.profileHref}
              onLogout={handleLogout}
              theme="brand"
            />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showMenu ? (
            <div className={menuClass}>
              <MenuButton onClick={onOpenMobile} />
            </div>
          ) : null}

          <div className="min-w-0">
            <p className="text-xs font-bold text-accent">{meta.panelLabel}</p>
            <h1 className="truncate text-lg font-black text-primary">{meta.title}</h1>
            {meta.subtitle ? (
              <p className="hidden truncate text-xs text-text-muted sm:block">{meta.subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary md:inline">
            {meta.roleLabel}
          </span>

          <button
            type="button"
            className="rounded-xl border border-border bg-card p-2 text-text-muted transition-colors hover:bg-bg hover:text-text"
            aria-label="الإشعارات"
          >
            <Icon name="bell" size={18} />
          </button>

          <UserMenu
            profile={profile}
            roleLabel={meta.roleLabel}
            profileHref={meta.profileHref}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}
