import { expect, type Locator, type Page } from "@playwright/test";
import { PARENT_ROUTES, type ParentRouteKey } from "./test-data";

function parentPathname(page: Page): string {
  try {
    return new URL(page.url()).pathname.replace(/\/$/, "") || "/";
  } catch {
    return "";
  }
}

export class ParentPage {
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
      .getByText(/جاري تحميل (لوحة ولي الأمر|التقارير|التقرير|الملف)/)
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
    await main
      .getByText("جاري التحديث…", { exact: false })
      .waitFor({ state: "hidden", timeout: 15_000 })
      .catch(() => undefined);
    await this.page
      .locator(".animate-pulse")
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
  }

  async goTo(section: ParentRouteKey) {
    const path = PARENT_ROUTES[section];
    const pathRegex = new RegExp(`${path.replace(/\//g, "\\/")}\\/?(?:\\?|$)`);

    await this.dismissOpenDialogs();

    let currentSearch = "";
    try {
      currentSearch = new URL(this.page.url()).search;
    } catch {
      currentSearch = "";
    }

    if (parentPathname(this.page) !== path || currentSearch) {
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
    return this.main().getByRole("button", { name: new RegExp(`^${escaped}(\\s|$)`) });
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

  linkCodeInput() {
    return this.page.getByLabel("كود الربط");
  }

  async clickRefresh() {
    const refresh = this.page.getByRole("button", { name: /^تحديث$/ });
    await refresh.click();
    await this.waitForContentLoaded();
  }

  async expectNoErrorBanner() {
    await expect(this.page.getByText(/^تعذر تحميل/)).toHaveCount(0);
  }

  async hasLinkedChildren(): Promise<boolean> {
    const hasSubtitle = await this.page
      .getByText(/ابن مربوط|أبناء مربوطين/)
      .first()
      .isVisible()
      .catch(() => false);
    const hasChildCards = (await this.page.locator("a[href*='/parent/report?student=']").count()) > 0;
    const hasCount = await this.page
      .getByText(/[١١٢٣٤٥٦٧٨٩٠1-9]+ طالب مربوط/)
      .first()
      .isVisible()
      .catch(() => false);
    if (hasSubtitle || hasChildCards) return true;
    if (hasCount) {
      const text = (await this.page.getByText(/طالب مربوط/).first().textContent()) || "";
      return !/٠\s*طالب|0\s*طالب/.test(text);
    }
    return false;
  }

  async hasNoLinkedChildren(): Promise<boolean> {
    return this.page
      .getByText("لا يوجد طالب مربوط بعد", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
  }

  async expectChildrenState() {
    await this.waitForContentLoaded();
    const hasChildren = await this.hasLinkedChildren();
    const hasNoChildren = await this.hasNoLinkedChildren();
    const hasLoading = await this.page
      .getByText(/جاري تحميل لوحة ولي الأمر|جاري تحميل التقارير/)
      .isVisible()
      .catch(() => false);
    expect(hasChildren || hasNoChildren || hasLoading).toBeTruthy();
  }
}
