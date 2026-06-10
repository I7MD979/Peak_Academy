import path from "node:path";
import { test as base, type Page } from "@playwright/test";
import { loginAsStudent } from "./helpers/student-ready";
import { waitForStudentShell } from "./helpers/student-auth";
import { STUDENT_ROUTES } from "./helpers/test-data";

const STUDENT_AUTH_FILE = path.join(__dirname, "../.auth/student.json");

let studentPage: Page | undefined;

async function ensureStudentSession(page: Page) {
  if (await page.getByRole("navigation", { name: "لوحة الطالب" }).isVisible().catch(() => false)) {
    return;
  }

  await page.goto(STUDENT_ROUTES.dashboard, { waitUntil: "load", timeout: 45_000 });
  await waitForStudentShell(page, 45_000).catch(() => undefined);

  if (page.url().includes("/auth/login")) {
    await loginAsStudent(page);
  }
}

export const test = base.extend({
  page: async ({ browser }, use) => {
    if (
      !studentPage ||
      studentPage.isClosed() ||
      /\/auth\/login|\/onboarding/.test(studentPage.url())
    ) {
      if (studentPage && !studentPage.isClosed()) {
        await studentPage.context().close();
      }
      const context = await browser.newContext({ storageState: STUDENT_AUTH_FILE });
      studentPage = await context.newPage();
      await ensureStudentSession(studentPage);
    }
    await use(studentPage);
  }
});

export { expect } from "@playwright/test";
