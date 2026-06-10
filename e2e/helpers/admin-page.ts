import { expect, type Locator, type Page } from "@playwright/test";
import { ROUTES, type AdminRouteKey } from "./test-data";

export class AdminPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  sidebarLink(label: string): Locator {
    const mainNav = this.page.getByRole("navigation", { name: "القائمة الرئيسية" });
    const accountNav = this.page.getByRole("navigation", { name: "الحساب" });
    return mainNav
      .getByRole("link", { name: label })
      .or(accountNav.getByRole("link", { name: label }));
  }

  private dashboardSidebarLink(): Locator {
    return this.page
      .getByRole("navigation", { name: "القائمة الرئيسية" })
      .getByRole("link", { name: "لوحة التحكم" });
  }

  async goTo(section: AdminRouteKey) {
    const path = ROUTES[section];
    const pathRegex = new RegExp(path.replace(/\//g, "\\/"));

    await this.dismissOpenDialogs();

    if (!pathRegex.test(this.page.url())) {
      try {
        await this.page.goto(path, { waitUntil: "load" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("ERR_ABORTED") && !message.includes("NS_BINDING_ABORTED")) {
          throw err;
        }
        await this.page.waitForLoadState("load").catch(() => undefined);
      }
    }

    await this.main().waitFor({ state: "visible", timeout: 30_000 });
    await this.waitForContentLoaded();
    await expect(this.page).toHaveURL(pathRegex, { timeout: 30_000 });
  }

  private routeLabel(section: AdminRouteKey): string {
    const labels: Partial<Record<AdminRouteKey, string>> = {
      dashboard: "لوحة التحكم",
      users: "المستخدمون",
      sessions: "الجلسات",
      withdrawals: "طلبات السحب",
      reports: "التقارير",
      plans: "خطط الاشتراك",
      discounts: "العروض والخصومات",
      landing: "صفحة الهبوط",
      permissions: "الصلاحيات",
      account: "حسابي"
    };
    return labels[section] ?? section;
  }

  async navigateViaSidebar(label: string, expectedPath: string) {
    const pathRegex = new RegExp(expectedPath.replace(/\//g, "\\/"));
    await this.dismissOpenDialogs();
    await this.page.waitForLoadState("load").catch(() => undefined);

    if (pathRegex.test(this.page.url())) {
      await this.main().waitFor({ state: "visible", timeout: 30_000 });
      await this.waitForContentLoaded();
      return;
    }

    await this.sidebarLink(label).click();
    await this.page.waitForURL(pathRegex, { timeout: 30_000 });
    await this.main().waitFor({ state: "visible", timeout: 30_000 });
    await this.waitForContentLoaded();
    await expect(this.page).toHaveURL(pathRegex);
    await this.dashboardSidebarLink().waitFor({ state: "visible", timeout: 30_000 });
  }

  async openFirstUserProfile() {
    await this.dismissOpenDialogs();

    const firstRow = this.page.locator("table tbody tr").first();
    await firstRow.waitFor({ state: "visible", timeout: 30_000 });

    await this.page.evaluate(() => {
      const firstTd = document.querySelector("table tbody tr td:first-child");
      const btn = firstTd?.querySelector("button");
      if (btn) (btn as HTMLButtonElement).click();
    });

    await expect(this.page.getByRole("dialog").first()).toBeVisible({ timeout: 15_000 });
  }

  async switchTab(label: string) {
    const dialog = this.page.getByRole("dialog").first();
    await dialog.getByRole("button", { name: label, exact: true }).click();
  }

  async filterStudents() {
    if ((await this.page.getByRole("dialog").count()) > 0) return;
    const studentsBtn = this.page.getByRole("button", { name: "طلاب", exact: true });
    if (await studentsBtn.isVisible().catch(() => false)) {
      await studentsBtn.click();
      await this.page.waitForLoadState("load");
    }
  }

  private async hasOpenOverlay(): Promise<boolean> {
    const hasDialog = await this.page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false);
    const hasAddSupervisor = await this.page
      .getByRole("heading", { name: "إضافة مشرف جديد" })
      .isVisible()
      .catch(() => false);
    return hasDialog || hasAddSupervisor;
  }

  private async clickDialogBackdrop(): Promise<void> {
    await this.page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const backdrop = dialog?.querySelector('button[aria-label="إغلاق"]');
      if (backdrop instanceof HTMLElement) backdrop.click();
    });
  }

  async dismissOpenDialogs(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (!(await this.hasOpenOverlay())) return;

      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(200);

      if (!(await this.hasOpenOverlay())) return;

      await this.clickDialogBackdrop();
      await this.page.waitForTimeout(200);
    }
  }

  /** Strong cleanup after modal tests — used in afterEach hooks. */
  async forceCloseModalsAfterTest(): Promise<void> {
    await this.dismissOpenDialogs();
    await expect(this.page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 5_000 }).catch(
      () => undefined
    );
  }

  async closeModal() {
    await this.clickDialogBackdrop();
    await expect(this.page.getByRole("dialog")).toHaveCount(0, { timeout: 10_000 });
  }

  async openAssignSubscriptionModal() {
    const assign = this.page.getByRole("button", { name: "تعيين اشتراك" });
    const replace = this.page.getByRole("button", { name: "استبدال بخطة أخرى" });
    const trigger = assign.or(replace);
    await expect(trigger.first()).toBeVisible({ timeout: 30_000 });
    await trigger.first().click();
    await expect(this.page.getByLabel("الخطة", { exact: true })).toBeVisible({ timeout: 15_000 });
  }

  async waitForContentLoaded() {
    await this.page
      .getByText("جاري التحميل...", { exact: false })
      .waitFor({ state: "hidden", timeout: 60_000 })
      .catch(() => undefined);
    const spinner = this.page.getByText(
      /جاري( التحديث| الإغلاق)|جارٍ التحميل|جاري تحميل/
    );
    await spinner
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
    await this.page
      .waitForFunction(() => !document.querySelector('[data-loading="true"]'), {
        timeout: 15_000
      })
      .catch(() => undefined);
  }

  main() {
    return this.page.getByRole("main");
  }

  async selectCombobox(name: string | RegExp, optionLabel: string) {
    const combo = this.page.getByRole("combobox", { name });
    await combo.click();
    await this.page.getByRole("option", { name: optionLabel, exact: true }).click();
    await this.waitForContentLoaded();
  }

  async expectTableOrEmpty(emptyPattern = /لا يوجد|لا توجد/) {
    await this.waitForContentLoaded();
    const table = this.page.locator("table");
    const empty = this.page.getByText(emptyPattern);
    await expect(table.or(empty.first())).toBeVisible({ timeout: 30_000 });
  }

  async expectPagination() {
    await expect(this.page.getByRole("button", { name: "التالي" })).toBeVisible();
    await expect(this.page.getByText(/صفحة \d+ من/)).toBeVisible();
  }

  filterTab(label: string) {
    return this.page.getByRole("button", { name: label, exact: true });
  }

  async clickFilterTab(label: string) {
    await this.filterTab(label).click();
    await this.waitForContentLoaded();
  }

  async expectFilterTabActive(label: string) {
    await expect(this.filterTab(label)).toHaveClass(/bg-peak-orange/);
  }

  statCard(label: string | RegExp) {
    return this.page
      .getByRole("button")
      .filter({ hasText: label })
      .or(this.page.getByRole("link").filter({ hasText: label }));
  }

  statLabel(label: string | RegExp) {
    return this.main().getByText(label, { exact: true });
  }

  async clickStatCard(label: string | RegExp) {
    await this.statCard(label).first().click();
    await this.waitForContentLoaded();
  }

  async clickRefresh() {
    const refresh = this.page.getByRole("button", { name: /^تحديث$/ });
    await refresh.click();
    await this.waitForContentLoaded();
  }

  async openFormModal(buttonName: string | RegExp) {
    await this.page.getByRole("button", { name: buttonName }).click();
    await expect(this.page.getByRole("dialog").last()).toBeVisible({ timeout: 15_000 });
  }

  async closeTopDialog() {
    if ((await this.page.getByRole("dialog").count()) === 0) return;
    const dialog = this.page.getByRole("dialog").last();
    await dialog.getByRole("button", { name: "إغلاق" }).first().click();
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.locator("button.absolute.inset-0").click({ force: true });
    }
    await expect(this.page.getByRole("dialog")).toHaveCount(0, { timeout: 10_000 });
  }

  async assignSubscriptionFirstPlan() {
    const planSelect = this.page.getByLabel("الخطة", { exact: true });
    await expect(planSelect.locator('option:not([value=""])').first()).toBeAttached({
      timeout: 30_000
    });
    const firstPlan = planSelect.locator('option:not([value=""])').first();
    const planId = await firstPlan.getAttribute("value");
    if (!planId) throw new Error("No subscription plans available for assignment");
    await planSelect.selectOption(planId);
    const assignResponse = this.page.waitForResponse(
      (res) => res.url().includes("/admin/") && res.request().method() === "POST" && res.ok(),
      { timeout: 30_000 }
    );
    await this.page.getByRole("button", { name: "تعيين الاشتراك" }).click();
    await assignResponse.catch(() => null);
  }
}
