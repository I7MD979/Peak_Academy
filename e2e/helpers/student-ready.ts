import type { Page } from "@playwright/test";
import { AuthPage } from "./auth-page";
import { studentSidebar, waitForStudentShell } from "./student-auth";
import { STUDENT_CREDENTIALS, STUDENT_ROUTES } from "./test-data";

/** Fresh Supabase login — reliable for student E2E (storageState alone does not hydrate the client). */
export async function loginAsStudent(page: Page) {
  if (await studentSidebar(page).isVisible().catch(() => false)) {
    return;
  }

  const auth = new AuthPage(page);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await auth.gotoLogin();
    await auth.login(STUDENT_CREDENTIALS.email, STUDENT_CREDENTIALS.password);
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 30_000 });
    await page.waitForLoadState("load");
    try {
      await waitForStudentShell(page);
      return;
    } catch {
      if (attempt === 1) throw new Error("Student login did not reach dashboard");
    }
  }
}

export async function ensureStudentOnDashboard(page: Page) {
  await page.goto(STUDENT_ROUTES.dashboard, { waitUntil: "load", timeout: 45_000 });
  await waitForStudentShell(page, 45_000).catch(() => undefined);
  if (page.url().includes("/auth/login")) {
    await loginAsStudent(page);
  }
}
