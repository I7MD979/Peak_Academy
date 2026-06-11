import { expect, type Locator, type Page } from "@playwright/test";
import { STUDENT_ROUTES, type StudentRouteKey } from "./test-data";

function studentPathname(page: Page): string {
  try {
    return new URL(page.url()).pathname.replace(/\/$/, "") || "/";
  } catch {
    return "";
  }
}

export class StudentPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  main() {
    return this.page.getByRole("main");
  }

  async dismissOpenDialogs(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const hasDialog = await this.page
        .locator('[role="dialog"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (!hasDialog) return;
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(200);
    }
  }

  async waitForContentLoaded() {
    const main = this.main();
    await main
      .getByText(/جاري تحميل (لوحة|الجلسات|غرف|صفحة|الملف)/)
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
    await main
      .getByText("جاري التحديث…", { exact: false })
      .waitFor({ state: "hidden", timeout: 15_000 })
      .catch(() => undefined);
  }

  async goTo(section: StudentRouteKey) {
    const path = STUDENT_ROUTES[section];
    const pathRegex = new RegExp(`${path.replace(/\//g, "\\/")}\\/?(?:\\?|$)`);

    await this.dismissOpenDialogs();

    let currentSearch = "";
    try {
      currentSearch = new URL(this.page.url()).search;
    } catch {
      currentSearch = "";
    }

    if (studentPathname(this.page) !== path || currentSearch) {
      try {
        await this.page.goto(path, { waitUntil: "load", timeout: 45_000 });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("ERR_ABORTED") && !message.includes("NS_BINDING_ABORTED")) {
          throw err;
        }
      }
      await this.page.waitForURL(pathRegex, { timeout: 30_000 });
    }

    await this.main().waitFor({ state: "visible", timeout: 30_000 });
    await this.waitForContentLoaded();
    await expect(this.page).toHaveURL(pathRegex, { timeout: 30_000 });
  }

  filterTab(label: string): Locator {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.page.getByRole("button", { name: new RegExp(`^${escaped}(\\s|$)`) });
  }

  async clickFilterTab(label: string) {
    const tab = this.filterTab(label);
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
    await this.page.waitForLoadState("load").catch(() => undefined);
  }

  async expectFilterTabActive(label: string) {
    await expect(this.filterTab(label)).toHaveClass(/bg-peak-orange/);
  }

  statCard(label: string | RegExp) {
    return this.main().getByText(label, { exact: typeof label === "string" });
  }

  async clickRefresh() {
    const refresh = this.page.getByRole("button", { name: /^تحديث$/ });
    await refresh.click();
    await this.waitForContentLoaded();
  }

  async expectListOrEmpty(emptyPattern = /لا توجد|لا يوجد|لم ت/) {
    await this.waitForContentLoaded();
    const cards = this.page.locator('[class*="rounded-2xl"]').filter({ hasText: /جلسة|سؤال|غرفة/i });
    const empty = this.page.getByText(emptyPattern);
    const hasCards = (await cards.count()) > 0;
    const hasEmpty = await empty.first().isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBeTruthy();
  }

  async expectPaginationIfPresent() {
    const next = this.page.getByRole("button", { name: "التالي" });
    if (await next.isVisible().catch(() => false)) {
      await expect(next).toBeVisible();
      await expect(this.page.getByText(/صفحة \d+ من/)).toBeVisible();
    }
  }

  async expectNoErrorBanner() {
    await expect(this.page.getByText(/^تعذر تحميل/)).toHaveCount(0);
  }

  async isProfileIncomplete(): Promise<boolean> {
    return this.page
      .getByText("أكمل ملفك الدراسي", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
  }
}
