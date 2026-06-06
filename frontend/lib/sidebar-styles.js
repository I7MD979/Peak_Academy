import { cn } from "@/lib/utils";

/** Unified MD3 dark sidebar tokens (all roles). */
export const sidebarShell =
  "flex h-full w-[260px] flex-col border-s border-outline-variant/60 bg-surface-container-lowest text-on-surface";

export const sidebarHeader = "border-b border-outline-variant/40 px-5 py-5";

export const sidebarNav = "flex-1 space-y-1 overflow-y-auto px-3 py-4";

export const sidebarSectionTitle =
  "mb-2 px-3 text-[11px] font-bold tracking-wide text-on-surface-variant";

export const sidebarNavLink = cn(
  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
  "text-on-surface-variant transition-all duration-200",
  "hover:bg-surface-container-high hover:text-on-surface"
);

export const sidebarNavLinkActive = cn(
  "border-s-4 border-primary-container bg-primary-container/10 font-bold text-md-primary",
  "hover:bg-primary-container/15 hover:text-md-primary"
);

export const sidebarFooter = "border-t border-outline-variant/40 px-4 pb-5 pt-4";

export const sidebarProfileLink = cn(
  "flex items-center gap-3 rounded-xl p-2 transition-all",
  "hover:bg-surface-container-high"
);

export const sidebarProfileLinkActive =
  "bg-surface-container-high ring-1 ring-primary-container/30";

export const sidebarLogoutBtn = cn(
  "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/60",
  "bg-surface-container py-2.5 text-sm font-bold text-on-surface-variant transition-all",
  "hover:border-error/40 hover:bg-error/10 hover:text-error"
);

export const sidebarCtaBtn = cn(
  "flex w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-4 py-3",
  "text-sm font-bold text-on-primary-container shadow-lg shadow-primary-container/20 transition-all hover:opacity-90"
);

export const sidebarAvatar = cn(
  "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full",
  "border-2 border-outline-variant/50 bg-surface-container-high"
);

export const sidebarMobileOverlay = "absolute inset-0 bg-black/55 backdrop-blur-[2px]";

export const sidebarMobilePanel = "absolute inset-y-0 start-0 w-[min(280px,88vw)] shadow-2xl";
