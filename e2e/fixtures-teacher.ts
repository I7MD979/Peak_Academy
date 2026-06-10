import path from "node:path";
import { test as base, type Page } from "@playwright/test";
import { loginAsTeacher } from "./helpers/teacher-ready";
import { waitForTeacherShell } from "./helpers/teacher-auth";
import { TEACHER_ROUTES } from "./helpers/test-data";

const TEACHER_AUTH_FILE = path.join(__dirname, "../.auth/teacher.json");

let teacherPage: Page | undefined;

async function ensureTeacherSession(page: Page) {
  if (await page.getByRole("navigation", { name: "لوحة المعلّم" }).isVisible().catch(() => false)) {
    return;
  }

  await page.goto(TEACHER_ROUTES.dashboard, { waitUntil: "load", timeout: 45_000 });
  await waitForTeacherShell(page, 45_000).catch(() => undefined);

  if (page.url().includes("/auth/login")) {
    await loginAsTeacher(page);
  }
}

export const test = base.extend({
  page: async ({ browser }, use) => {
    if (
      !teacherPage ||
      teacherPage.isClosed() ||
      /\/auth\/login|\/onboarding/.test(teacherPage.url())
    ) {
      if (teacherPage && !teacherPage.isClosed()) {
        await teacherPage.context().close();
      }
      const context = await browser.newContext({ storageState: TEACHER_AUTH_FILE });
      teacherPage = await context.newPage();
      await ensureTeacherSession(teacherPage);
    }
    await use(teacherPage);
  }
});

export { expect } from "@playwright/test";
