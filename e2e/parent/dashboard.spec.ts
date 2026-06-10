import { test, expect } from "../fixtures-parent";
import { ParentPage } from "../helpers/parent-page";
import { PARENT_ROUTES } from "../helpers/test-data";

test.describe("Parent dashboard", () => {
  let parent: ParentPage;

  test.beforeEach(async ({ page }) => {
    parent = new ParentPage(page);
    await parent.dismissOpenDialogs();
    await parent.goTo("dashboard");
  });

  test("/parent/dashboard بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${PARENT_ROUTES.dashboard.replace(/\//g, "\\/")}`));
  });

  test("مفيش redirect لـ /auth/login", async ({ page }) => {
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test('عنوان "لوحة ولي الأمر" أو "أهلاً" ظاهر', async ({ page }) => {
    await expect(page.getByText("لوحة ولي الأمر", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /^أهلاً/ })).toBeVisible();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await parent.clickRefresh();
    await parent.expectNoErrorBanner();
  });

  test('"التقرير" link ظاهر → /parent/report', async ({ page }) => {
    await expect(page.getByRole("link", { name: "التقرير" }).first()).toHaveAttribute(
      "href",
      /\/parent\/report/
    );
  });

  test("ParentDashboardChildrenPanel ظاهر", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "الأبناء المربوطون" })).toBeVisible();
    await expect(page.getByRole("button", { name: /ربط طالب|إخفاء/ })).toBeVisible();
  });

  test("children state: مربوطين أو empty أو loading", async () => {
    await parent.expectChildrenState();
  });

  test("لو في أبناء مربوطين: Children selector ظاهر", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين على حساب الاختبار");
      return;
    }
    const childLinks = page.locator("a[href*='/parent/report?student='], button").filter({
      hasText: /./
    });
    expect(await childLinks.count()).toBeGreaterThan(0);
    await expect(page.getByText(/طالب مربوط/).first()).toBeVisible();
  });

  test("لو في أبناء مربوطين: ParentDashboardStats ظاهر", async () => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await expect(parent.statCard("جلسات هذا الشهر").first()).toBeVisible({ timeout: 30_000 });
    await expect(parent.statCard("متوسط التقدم").first()).toBeVisible();
  });

  test("لو في أبناء مربوطين: ParentDashboardSecondaryStats ظاهر", async () => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    for (const label of ["جلسات قادمة", "جلسات مكتملة", "إجمالي التسجيلات"]) {
      await expect(parent.statCard(label).first()).toBeVisible();
    }
  });

  test("لو في أبناء مربوطين: ParentDashboardSubjects أو hero ظاهر", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    const hasSubjects = await page.getByText("ملخص المواد").isVisible().catch(() => false);
    const hasHero = await page.getByText(/ستريك المذاكرة:/).isVisible().catch(() => false);
    expect(hasSubjects || hasHero).toBeTruthy();
  });

  test("لو في أبناء مربوطين: ParentDashboardRecentActivity أو quick actions", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    const hasActivity = await page.getByText("آخر النشاط").isVisible().catch(() => false);
    const hasQuickActions = await page.getByText("إجراءات سريعة").isVisible().catch(() => false);
    expect(hasActivity || hasQuickActions).toBeTruthy();
  });

  test("لو في أبناء مربوطين: ParentDashboardQuickActions ظاهر", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await expect(page.getByText("إجراءات سريعة", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /التقرير|تقرير/ }).first()).toBeVisible();
  });

  test('لو مفيش أبناء مربوطين: "لا يوجد طالب مربوط بعد" empty state ظاهر', async ({ page }) => {
    if (!(await parent.hasNoLinkedChildren())) {
      test.skip(true, "يوجد أبناء مربوطين على حساب الاختبار");
      return;
    }
    await expect(page.getByText("لا يوجد طالب مربوط بعد", { exact: true })).toBeVisible();
  });

  test("لو مفيش أبناء مربوطين: Link form toggle button ظاهر", async ({ page }) => {
    if (!(await parent.hasNoLinkedChildren())) {
      test.skip(true, "يوجد أبناء مربوطين");
      return;
    }
    await expect(page.getByRole("button", { name: "ربط طالب" })).toBeVisible();
  });

  test("لو مفيش أبناء مربوطين: input لكود الربط ظاهر بعد الضغط على toggle", async ({ page }) => {
    if (!(await parent.hasNoLinkedChildren())) {
      test.skip(true, "يوجد أبناء مربوطين");
      return;
    }
    await page.getByRole("button", { name: "ربط طالب" }).click();
    await expect(parent.linkCodeInput()).toBeVisible();
    await expect(page.getByRole("button", { name: "ربط الطالب" })).toBeVisible();
  });

  test("مفيش error box ظاهر", async () => {
    await parent.expectNoErrorBanner();
  });
});
