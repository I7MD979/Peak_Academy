import type { Page } from "@playwright/test";
import { AuthPage } from "./auth-page";
import { ADMIN_CREDENTIALS } from "./test-data";

const SIDEBAR_LINK = "لوحة التحكم";

/** Fresh Supabase login — reliable for admin E2E (storageState alone does not hydrate the client). */
export async function loginAsAdmin(page: Page) {
  const sidebar = page
    .getByRole("navigation", { name: "القائمة الرئيسية" })
    .getByRole("link", { name: SIDEBAR_LINK });
  if (await sidebar.isVisible().catch(() => false)) {
    return;
  }

  const auth = new AuthPage(page);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await auth.gotoLogin();
    await auth.login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 30_000 });
    await page.waitForLoadState("load");
    try {
      await page
        .getByRole("navigation", { name: "القائمة الرئيسية" })
        .getByRole("link", { name: SIDEBAR_LINK })
        .waitFor({ state: "visible", timeout: 30_000 });
      return;
    } catch {
      if (attempt === 1) throw new Error("Admin login did not reach dashboard");
    }
  }
}
