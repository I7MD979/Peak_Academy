import { test, expect } from "../fixtures-parent";
import { ParentPage } from "../helpers/parent-page";
import { PARENT_ROUTES } from "../helpers/test-data";

test.describe("Parent report page", () => {
  let parent: ParentPage;

  test.beforeEach(async ({ page }) => {
    parent = new ParentPage(page);
    await parent.dismissOpenDialogs();
    await parent.goTo("report");
  });

  test("/parent/report بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${PARENT_ROUTES.report.replace(/\//g, "\\/")}`));
  });

  test('عنوان "تقرير الطالب" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "تقرير الطالب" })).toBeVisible();
  });

  test('"تحديث" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: /^تحديث$/ })).toBeVisible();
  });

  test('"الرئيسية" link → /parent/dashboard', async ({ page }) => {
    await expect(page.getByRole("link", { name: "الرئيسية" }).first()).toHaveAttribute(
      "href",
      PARENT_ROUTES.dashboard
    );
  });

  test("ParentReportLinkPanel ظاهر (input لكود الربط)", async () => {
    await expect(parent.linkCodeInput()).toBeVisible();
    await expect(parent.page.getByRole("button", { name: "ربط الطالب" })).toBeVisible();
  });

  test('لو مفيش أبناء مربوطين: "لا يوجد طالب مربوط بعد" empty state ظاهر', async ({ page }) => {
    if (!(await parent.hasNoLinkedChildren())) {
      test.skip(true, "يوجد أبناء مربوطين على حساب الاختبار");
      return;
    }
    await expect(page.getByText("لا يوجد طالب مربوط بعد", { exact: true })).toBeVisible();
  });

  test("لو في أبناء مربوطين: ParentReportFilters ظاهر", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await expect(page.getByRole("heading", { name: "تصفية التقرير" })).toBeVisible();
  });

  test("لو في أبناء مربوطين: Student selector ظاهر", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await expect(page.getByText("اختر الطالب", { exact: true })).toBeVisible();
  });

  test("لو في أبناء مربوطين: Period selector ظاهر", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await expect(page.getByText("الفترة الزمنية", { exact: true })).toBeVisible();
    for (const label of ["آخر 30 يوماً", "آخر 7 أيام", "فترة مخصصة"]) {
      await expect(page.getByRole("option", { name: label })).toBeAttached();
    }
  });

  test("لو في أبناء مربوطين: Date range filters ظاهرة عند فترة مخصصة", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    const periodSelect = page.locator("select").filter({ has: page.getByRole("option", { name: "فترة مخصصة" }) });
    await periodSelect.selectOption("custom");
    await expect(page.getByLabel("من تاريخ")).toBeVisible();
    await expect(page.getByLabel("إلى تاريخ")).toBeVisible();
  });

  test("لو في أبناء مربوطين: ParentDashboardStudentHero ظاهر", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await parent.waitForContentLoaded();
    await expect(page.getByText(/ستريك المذاكرة:/).first()).toBeVisible({ timeout: 30_000 });
  });

  test("لو في أبناء مربوطين: ParentReportStats ظاهر", async () => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await expect(parent.statCard(/جلسات الشهر|جلسات الأسبوع/).first()).toBeVisible({ timeout: 30_000 });
    await expect(parent.statCard("متوسط التقدم").first()).toBeVisible();
  });

  test("لو في أبناء مربوطين: ParentReportSubjects ظاهر", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await expect(page.getByRole("heading", { name: "الأداء حسب المادة" })).toBeVisible({ timeout: 30_000 });
  });

  test("لو في أبناء مربوطين: ParentReportRecentSessions أو empty", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await parent.waitForContentLoaded();
    const hasSessions = await page.getByRole("heading", { name: "آخر الجلسات" }).isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText(/لا توجد جلسات مسجّلة|لا توجد بيانات للتقرير/)
      .isVisible()
      .catch(() => false);
    expect(hasSessions || hasEmpty).toBeTruthy();
  });

  test('لو في أبناء مربوطين: "تنزيل التقرير" button ظاهر (ParentReportActions)', async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    await expect(page.getByRole("button", { name: /تنزيل التقرير/ })).toBeVisible({ timeout: 30_000 });
  });

  test('لو في أبناء مربوطين: تغيير الفترة لـ "آخر 7 أيام" يغيّر الـ value', async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    const periodSelect = page.locator("select").filter({ has: page.getByRole("option", { name: "آخر 7 أيام" }) });
    await periodSelect.selectOption("week");
    await expect(page).toHaveURL(/period=week/, { timeout: 15_000 });
    await expect(page.getByText(/آخر 7 أيام/).first()).toBeVisible();
  });
});
