import type { Page } from "@playwright/test";

export const TEACHER_NAV = "لوحة المعلّم";
export const TEACHER_SIDEBAR_LINK = "لوحتي";

export function teacherSidebar(page: Page) {
  return page
    .getByRole("navigation", { name: TEACHER_NAV })
    .getByRole("link", { name: TEACHER_SIDEBAR_LINK });
}

/** Wait for RoleGate / PageLoader to finish and teacher shell to render. */
export async function waitForTeacherShell(page: Page, timeout = 60_000) {
  await page
    .getByText("جاري التحميل...", { exact: false })
    .waitFor({ state: "hidden", timeout })
    .catch(() => undefined);
  await teacherSidebar(page).waitFor({ state: "visible", timeout });
}
