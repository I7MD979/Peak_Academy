import type { Page } from "@playwright/test";

export const PARENT_NAV = "لوحة وليّ الأمر";
export const PARENT_HOME_LINK = "الرئيسية";

export function parentSidebar(page: Page) {
  return page
    .getByRole("navigation", { name: PARENT_NAV })
    .getByRole("link", { name: PARENT_HOME_LINK });
}

/** Wait for RoleGate / PageLoader to finish and parent shell to render. */
export async function waitForParentShell(page: Page, timeout = 60_000) {
  await page
    .getByText("جاري التحميل...", { exact: false })
    .waitFor({ state: "hidden", timeout })
    .catch(() => undefined);
  await parentSidebar(page).waitFor({ state: "visible", timeout });
}
