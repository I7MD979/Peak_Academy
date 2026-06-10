import path from "node:path";
import { test as base, type Page } from "@playwright/test";
import { waitForParentShell } from "./helpers/parent-auth";
import { loginAsParent } from "./helpers/parent-ready";
import { PARENT_ROUTES } from "./helpers/test-data";

const PARENT_AUTH_FILE = path.join(__dirname, "../.auth/parent.json");

let parentPage: Page | undefined;

async function ensureParentSession(page: Page) {
  if (await page.getByRole("navigation", { name: "لوحة وليّ الأمر" }).isVisible().catch(() => false)) {
    return;
  }

  await page.goto(PARENT_ROUTES.dashboard, { waitUntil: "load", timeout: 45_000 });
  await waitForParentShell(page, 45_000).catch(() => undefined);

  if (page.url().includes("/auth/login")) {
    await loginAsParent(page);
  }
}

export const test = base.extend({
  page: async ({ browser }, use) => {
    if (
      !parentPage ||
      parentPage.isClosed() ||
      /\/auth\/login|\/onboarding/.test(parentPage.url())
    ) {
      if (parentPage && !parentPage.isClosed()) {
        await parentPage.context().close();
      }
      const context = await browser.newContext({ storageState: PARENT_AUTH_FILE });
      parentPage = await context.newPage();
      await ensureParentSession(parentPage);
    }
    await use(parentPage);
  }
});

export { expect } from "@playwright/test";
