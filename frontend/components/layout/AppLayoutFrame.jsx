"use client";

import { usePathname } from "next/navigation";
import {
  APP_CONTENT_COLUMN,
  APP_MAIN,
  APP_PAGE,
  APP_PAGE_MOBILE_NAV_PADDING,
  APP_SHELL,
  isImmersiveAppPath,
} from "@/lib/page-layout";
import { cn } from "@/lib/utils";

export default function AppLayoutFrame({
  sidebar,
  topbar,
  footer = null,
  children,
  shellClassName,
  mobileNavPadding = false,
}) {
  const pathname = usePathname();
  const immersive = isImmersiveAppPath(pathname);

  return (
    <div className={cn(APP_SHELL, shellClassName)} dir="rtl">
      {sidebar}
      <div className={APP_CONTENT_COLUMN}>
        {topbar}
        <main className={cn(APP_MAIN, immersive && "overflow-hidden")}>
          {immersive ? (
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          ) : (
            <div
              className={cn(
                APP_PAGE,
                mobileNavPadding && APP_PAGE_MOBILE_NAV_PADDING
              )}
            >
              {children}
            </div>
          )}
        </main>
        {footer}
      </div>
    </div>
  );
}
