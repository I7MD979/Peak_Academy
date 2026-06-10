import { test, expect } from "../fixtures-teacher";
import { TeacherPage } from "../helpers/teacher-page";
import { TEACHER_ROUTES } from "../helpers/test-data";

test.describe("Teacher dashboard", () => {
  let teacher: TeacherPage;

  test.beforeEach(async ({ page }) => {
    teacher = new TeacherPage(page);
    await teacher.dismissOpenDialogs();
    await teacher.goTo("dashboard");
    await teacher.waitForContentLoaded();
  });

  test("/teacher/dashboard بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${TEACHER_ROUTES.dashboard.replace(/\//g, "\\/")}`));
    await expect(page.getByText("لوحة المعلم", { exact: true }).first()).toBeVisible();
  });

  test('عنوان "لوحة المعلم" أو "أهلاً" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: /أهلاً/ })).toBeVisible();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await teacher.clickRefresh();
    await teacher.expectNoErrorBanner();
  });

  test('"جلسة جديدة" link ظاهر → /teacher/sessions/new', async ({ page }) => {
    const link = page.getByRole("link", { name: "جلسة جديدة" }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", TEACHER_ROUTES.sessionsNew);
  });

  test("Stats section ظاهر (TeacherDashboardStats)", async () => {
    for (const label of ["جلسات مجدولة", "جلسات مباشرة", "جلسات مكتملة", "إجمالي الأرباح"]) {
      await expect(teacher.statCard(label).first()).toBeVisible();
    }
  });

  test("Quick actions ظاهرة (TeacherDashboardQuickActions)", async ({ page }) => {
    for (const label of ["جلساتي", "تحليلاتي", "أرباحي", "ملفي الشخصي"]) {
      await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
    }
  });

  test('"الجلسات القادمة" table أو empty state ظاهر', async ({ page }) => {
    await expect(page.getByText("الجلسات القادمة", { exact: true })).toBeVisible();
    const hasTable = (await page.locator("table").count()) > 0;
    const hasEmpty = await page.getByText("لا توجد جلسات قادمة").isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('"الجلسات المكتملة" table أو empty state ظاهر', async ({ page }) => {
    await expect(page.getByText("آخر الجلسات المكتملة", { exact: true })).toBeVisible();
    const hasRows = (await page.locator("table tbody tr").count()) > 0;
    const hasEmpty = await page.getByText("لا توجد جلسات مكتملة بعد").isVisible().catch(() => false);
    expect(hasRows || hasEmpty).toBeTruthy();
  });

  test("مفيش error box ظاهر", async () => {
    await teacher.expectNoErrorBanner();
  });
});
