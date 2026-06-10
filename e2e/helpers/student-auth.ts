import type { Page } from "@playwright/test";

export const STUDENT_NAV = "لوحة الطالب";
export const STUDENT_BOTTOM_NAV = "تنقل سفلي للطالب";
export const STUDENT_HOME_LINK = "الرئيسية";

export function studentSidebar(page: Page) {
  return page
    .getByRole("navigation", { name: STUDENT_NAV })
    .getByRole("link", { name: STUDENT_HOME_LINK });
}

export function studentBottomNav(page: Page) {
  return page.getByRole("navigation", { name: STUDENT_BOTTOM_NAV });
}

/** Wait for RoleGate / PageLoader to finish and student shell to render. */
export async function waitForStudentShell(page: Page, timeout = 60_000) {
  await page
    .getByText("جاري التحميل...", { exact: false })
    .waitFor({ state: "hidden", timeout })
    .catch(() => undefined);
  const sidebar = studentSidebar(page);
  const bottomNav = studentBottomNav(page);
  await sidebar.or(bottomNav).first().waitFor({ state: "visible", timeout });
}
