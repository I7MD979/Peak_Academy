import { test as base, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin-ready";

let adminPage: Page | undefined;

export const test = base.extend({
  page: async ({ browser }, use) => {
    if (!adminPage || adminPage.isClosed()) {
      const context = await browser.newContext();
      adminPage = await context.newPage();
      await loginAsAdmin(adminPage);
    }
    await use(adminPage);
  }
});

export { expect } from "@playwright/test";
