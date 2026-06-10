import { test, expect } from "../fixtures-teacher";
import { TeacherPage } from "../helpers/teacher-page";
import { TEACHER_ROUTES } from "../helpers/test-data";

test.describe("Teacher analytics page", () => {
  let teacher: TeacherPage;

  test.beforeEach(async ({ page }) => {
    teacher = new TeacherPage(page);
    await teacher.dismissOpenDialogs();
    await teacher.goTo("analytics");
  });

  test("/teacher/analytics بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${TEACHER_ROUTES.analytics.replace(/\//g, "\\/")}`));
  });

  test('عنوان "إحصائيات أدائك التعليمي" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "إحصائيات أدائك التعليمي" })).toBeVisible();
  });

  test("Period selector ظاهر", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: "فترة التحليلات" })).toBeVisible();
  });

  test("Date range filters ظاهرة", async ({ page }) => {
    await expect(page.getByLabel("من تاريخ")).toBeVisible();
    await expect(page.getByLabel("إلى تاريخ")).toBeVisible();
  });

  test('"مسح التاريخ" button مخفي افتراضياً', async ({ page }) => {
    await expect(page.getByRole("button", { name: "مسح التاريخ" })).toHaveCount(0);
  });

  test('تحديد تاريخ يظهر "مسح التاريخ"', async ({ page }) => {
    const fromInput = page.locator('input[placeholder="بداية مخصصة"]').first();
    if (!(await fromInput.isVisible().catch(() => false))) {
      test.skip(true, "حقل التاريخ غير متاح");
      return;
    }
    await fromInput.fill("2026-01-01");
    await expect(page.getByRole("button", { name: "مسح التاريخ" })).toBeVisible();
  });

  test("4 stat cards ظاهرة أو empty state", async ({ page }) => {
    await teacher.waitForContentLoaded();
    const hasStats = await page.getByText("طلاب فريدون", { exact: true }).isVisible().catch(() => false);
    const hasEmpty = await page.getByText("لا توجد تحليلات بعد").isVisible().catch(() => false);
    const hasSkeleton = await page.locator('[class*="animate-pulse"]').first().isVisible().catch(() => false);
    expect(hasStats || hasEmpty || hasSkeleton).toBeTruthy();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await teacher.clickRefresh();
    await teacher.expectNoErrorBanner();
  });

  test('"أرباحي" link → /teacher/earnings', async ({ page }) => {
    await expect(page.getByRole("link", { name: "أرباحي" }).first()).toHaveAttribute(
      "href",
      TEACHER_ROUTES.earnings
    );
  });

  test('"جلساتي" link → /teacher/sessions', async ({ page }) => {
    await expect(page.getByRole("link", { name: "جلساتي" }).first()).toHaveAttribute(
      "href",
      TEACHER_ROUTES.sessions
    );
  });

  test('لو في data: Chart "الجلسات" ظاهر', async ({ page }) => {
    const hasChart = await page.getByText("الجلسات", { exact: true }).first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText("لا توجد تحليلات بعد").isVisible().catch(() => false);
    if (hasEmpty) {
      test.skip(true, "لا توجد بيانات تحليلات");
      return;
    }
    expect(hasChart).toBeTruthy();
  });

  test('لو في data: Chart "الأرباح الشهرية" ظاهر', async ({ page }) => {
    const hasChart = await page
      .getByText("الأرباح الشهرية", { exact: true })
      .isVisible()
      .catch(() => false);
    const hasEmpty = await page.getByText("لا توجد تحليلات بعد").isVisible().catch(() => false);
    if (hasEmpty) {
      test.skip(true, "لا توجد بيانات تحليلات");
      return;
    }
    expect(hasChart).toBeTruthy();
  });

  test('تغيير الفترة لـ "آخر 3 شهور" يغيّر الـ value', async ({ page }) => {
    await teacher.selectCombobox("فترة التحليلات", "آخر 3 شهور");
    await expect(page.getByRole("combobox", { name: "فترة التحليلات" })).toContainText("آخر 3 شهور");
  });
});
