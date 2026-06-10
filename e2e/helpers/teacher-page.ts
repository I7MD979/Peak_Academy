import { expect, type Locator, type Page } from "@playwright/test";
import { TEACHER_ROUTES, type TeacherRouteKey } from "./test-data";

function teacherPathname(page: Page): string {
  try {
    return new URL(page.url()).pathname.replace(/\/$/, "") || "/";
  } catch {
    return "";
  }
}

const SIDEBAR_LABELS: Partial<Record<TeacherRouteKey, string>> = {
  dashboard: "لوحتي",
  sessions: "جلساتي",
  sessionsNew: "جلسة جديدة",
  analytics: "تحليلاتي",
  earnings: "أرباحي",
  profile: "ملفي الشخصي",
  studyRooms: "غرف المذاكرة"
};

export class TeacherPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  sidebarLink(label: string): Locator {
    const mainNav = this.page.getByRole("navigation", { name: "لوحة المعلّم" });
    const accountNav = this.page.getByRole("navigation", { name: "الحساب" });
    return mainNav
      .getByRole("link", { name: label })
      .or(accountNav.getByRole("link", { name: label }));
  }

  async goTo(section: TeacherRouteKey) {
    const path = TEACHER_ROUTES[section];
    const pathRegex = new RegExp(`${path.replace(/\//g, "\\/")}\\/?(?:\\?|$)`);

    await this.dismissOpenDialogs();

    if (teacherPathname(this.page) !== path) {
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
    await expect(this.page).toHaveURL(pathRegex, { timeout: 30_000 });
  }

  async selectCombobox(name: string | RegExp, optionLabel: string) {
    const combo = this.page.getByRole("combobox", { name });
    await combo.click();
    await this.page.getByRole("option", { name: optionLabel, exact: true }).click();
    await this.waitForContentLoaded();
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
      .getByText(/جاري تحميل (لوحة|جلساتك|الملف|الرسم)/)
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
    await main
      .getByText("جاري التحديث…", { exact: false })
      .waitFor({ state: "hidden", timeout: 15_000 })
      .catch(() => undefined);
  }

  main() {
    return this.page.getByRole("main");
  }

  filterTab(label: string) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this.page.getByRole("button", { name: new RegExp(`^${escaped}(\\s|$)`) });
  }

  async clickFilterTab(label: string) {
    await this.filterTab(label).click();
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

  async expectTableOrEmpty(emptyPattern = /لا يوجد|لا توجد/) {
    await this.waitForContentLoaded();
    const table = this.page.locator("table");
    const empty = this.page.getByText(emptyPattern);
    await expect(table.or(empty.first())).toBeVisible({ timeout: 30_000 });
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
}
