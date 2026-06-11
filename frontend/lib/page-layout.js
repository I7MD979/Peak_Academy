/** Shared app shell — applied once in role layouts via AppLayoutFrame */

export const APP_SHELL =
  "min-h-screen bg-background font-cairo text-on-background [color-scheme:dark]";

export const APP_CONTENT_COLUMN = "flex min-h-screen flex-col md:ps-[260px]";

export const APP_MAIN = "flex flex-1 flex-col overflow-y-auto";

export const APP_PAGE =
  "mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 md:p-8";

/** Extra bottom padding when a mobile bottom nav is present */
export const APP_PAGE_MOBILE_NAV_PADDING = "pb-20 md:pb-8";

const IMMERSIVE_PATH_PATTERNS = [
  /^\/teacher\/live\/[^/]+$/,
  /^\/teacher\/study-rooms\/[^/]+$/,
  /^\/teacher\/study-rooms\/[^/]+\/voice$/,
  /^\/student\/live\/[^/]+$/,
  /^\/student\/study-rooms\/[^/]+$/,
  /^\/student\/study-rooms\/[^/]+\/voice$/,
];

export function isImmersiveAppPath(pathname) {
  return IMMERSIVE_PATH_PATTERNS.some((pattern) => pattern.test(pathname ?? ""));
}

/** Vertical spacing between page sections (shell padding lives in APP_PAGE) */
export const PAGE_STACK = "space-y-8";

export const PAGE_STACK_COMPACT = "space-y-6";

/** @deprecated Use PAGE_STACK — kept for existing imports */
export const PAGE_CONTAINER = PAGE_STACK;

/** @deprecated Use PAGE_STACK_COMPACT */
export const PAGE_CONTAINER_COMPACT = PAGE_STACK_COMPACT;

/** @deprecated Use PAGE_STACK_COMPACT */
export const PAGE_LOADING_CONTAINER = PAGE_STACK_COMPACT;
