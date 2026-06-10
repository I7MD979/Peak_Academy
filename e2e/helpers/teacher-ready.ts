import type { Page } from "@playwright/test";
import { AuthPage } from "./auth-page";
import { teacherSidebar, waitForTeacherShell } from "./teacher-auth";
import { TEACHER_CREDENTIALS } from "./test-data";

/** Fresh Supabase login — reliable for teacher E2E (storageState alone does not hydrate the client). */
export async function loginAsTeacher(page: Page) {
  if (await teacherSidebar(page).isVisible().catch(() => false)) {
    return;
  }

  const auth = new AuthPage(page);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await auth.gotoLogin();
    await auth.login(TEACHER_CREDENTIALS.email, TEACHER_CREDENTIALS.password);
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 30_000 });
    await page.waitForLoadState("load");
    try {
      await waitForTeacherShell(page);
      return;
    } catch {
      if (attempt === 1) throw new Error("Teacher login did not reach dashboard");
    }
  }
}
