import type { Page } from "@playwright/test";
import { AuthPage } from "./auth-page";
import { parentSidebar, waitForParentShell } from "./parent-auth";
import { PARENT_CREDENTIALS, PARENT_ROUTES } from "./test-data";

/** Fresh Supabase login — reliable for parent E2E (storageState alone does not hydrate the client). */
export async function loginAsParent(page: Page) {
  if (await parentSidebar(page).isVisible().catch(() => false)) {
    return;
  }

  const auth = new AuthPage(page);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await auth.gotoLogin();
    await auth.login(PARENT_CREDENTIALS.email, PARENT_CREDENTIALS.password);
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 30_000 });
    await page.waitForLoadState("load");
    try {
      await waitForParentShell(page);
      return;
    } catch {
      if (attempt === 1) throw new Error("Parent login did not reach dashboard");
    }
  }
}

export async function ensureParentOnDashboard(page: Page) {
  await page.goto(PARENT_ROUTES.dashboard, { waitUntil: "load", timeout: 45_000 });
  await waitForParentShell(page, 45_000).catch(() => undefined);
  if (page.url().includes("/auth/login")) {
    await loginAsParent(page);
  }
}
