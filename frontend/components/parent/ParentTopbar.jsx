"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/shared/NotificationBell";
import Icon from "@/components/shared/Icon";
import MenuButton from "@/components/shared/MenuButton";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarProfile } from "@/hooks/useSidebarProfile";
import { getTopbarMeta } from "@/lib/topbar";
import { cn } from "@/lib/utils";
import { parentInput } from "@/lib/parent-styles";

function TopbarAvatar({ fullName, avatarUrl }) {
  const initial = (fullName || "و").trim().slice(0, 1);
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-peak-orange/40 bg-auth-surface-highest">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-peak-orange">{initial}</span>
      )}
    </div>
  );
}

export default function ParentTopbar({ onOpenMobile }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const profile = useSidebarProfile();
  const meta = getTopbarMeta(pathname || "", "parent");

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-auth-outline-variant/30 bg-auth-surface-high px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onOpenMobile ? (
          <div className="shrink-0 md:hidden">
            <MenuButton onClick={onOpenMobile} label="فتح قائمة التنقل" />
          </div>
        ) : null}

        <div className="relative hidden max-w-md flex-1 sm:block">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-auth-on-surface-variant"
          />
          <input
            type="search"
            placeholder="البحث..."
            className={cn(parentInput, "h-10 pe-10")}
            aria-label="بحث"
          />
        </div>

        <div className="min-w-0 sm:hidden">
          <p className="truncate text-sm font-bold text-auth-on-surface">{meta.title}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <NotificationBell theme="brand" />

        <div className="mx-1 hidden h-8 w-px bg-auth-outline-variant/40 sm:block" />

        <Link
          href="/parent/profile"
          className="flex items-center gap-3 rounded-full border border-auth-outline-variant/30 bg-auth-surface py-1.5 pe-1.5 ps-4 transition-colors hover:bg-auth-surface-high"
        >
          <div className="hidden text-end md:block">
            <p className="text-sm font-bold text-auth-on-surface">{profile.full_name || "ولي أمر"}</p>
            <p className="text-[10px] text-auth-on-surface-variant">{profile.roleLabel || "ولي أمر"}</p>
          </div>
          <TopbarAvatar fullName={profile.full_name} avatarUrl={profile.avatar_url} />
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="hidden rounded-lg p-2 text-auth-on-surface-variant transition-colors hover:text-danger lg:flex"
          aria-label="تسجيل الخروج"
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    </header>
  );
}
