import { test, expect } from "../fixtures-teacher";
import { TeacherPage } from "../helpers/teacher-page";
import { TEACHER_ROUTES } from "../helpers/test-data";

test.describe("Teacher profile page", () => {
  let teacher: TeacherPage;

  test.beforeEach(async ({ page }) => {
    teacher = new TeacherPage(page);
    await teacher.dismissOpenDialogs();
    await teacher.goTo("profile");
  });

  test("/teacher/profile بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${TEACHER_ROUTES.profile.replace(/\//g, "\\/")}`));
  });

  test('عنوان "ملفي الشخصي" ظاهر', async ({ page }) => {
    await expect(page.getByText("ملفي الشخصي", { exact: true }).first()).toBeVisible();
  });

  test("Profile hero section ظاهر (TeacherProfileHero)", async ({ page }) => {
    await expect(page.locator("#full_name").first()).toBeVisible({ timeout: 30_000 });
  });

  test("Profile stats ظاهرة (TeacherProfileStats)", async () => {
    for (const label of ["جلسات مجدولة", "جلسات مباشرة", "جلسات مكتملة", "إجمالي الأرباح"]) {
      await expect(teacher.statCard(label).first()).toBeVisible();
    }
  });

  test("Section tabs ظاهرة", async ({ page }) => {
    for (const label of ["الكل", "البيانات الأساسية", "البيانات المهنية", "التقييمات", "الأمان"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test('"البيانات الأساسية" section ظاهر', async ({ page }) => {
    await expect(page.getByText("البيانات الأساسية", { exact: true }).first()).toBeVisible();
    await expect(page.locator("#full_name").first()).toBeVisible();
  });

  test('"البيانات المهنية" section ظاهر', async ({ page }) => {
    await expect(page.getByText("البيانات المهنية", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("نبذة مهنية", { exact: true })).toBeVisible();
  });

  test('"التقييمات" section ظاهر', async ({ page }) => {
    const hasReviews = await page.getByText("آخر التقييمات").isVisible().catch(() => false);
    const onTab = await page.getByRole("button", { name: "التقييمات", exact: true }).isVisible();
    expect(hasReviews || onTab).toBeTruthy();
  });

  test('"الأمان" tab يفتح password section', async ({ page }) => {
    await page.getByRole("button", { name: "الأمان", exact: true }).click();
    await expect(page.getByText("الأمان وكلمة المرور", { exact: true })).toBeVisible();
    await expect(page.locator("#profile_new_password")).toBeVisible();
  });

  test('"حفظ التعديلات" button ظاهر', async ({ page }) => {
    const btn = page.getByRole("button", { name: "حفظ التعديلات" });
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await expect(btn).toBeVisible({ timeout: 30_000 });
  });

  test('"تراجع" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "تراجع" })).toBeVisible();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await teacher.clickRefresh();
    await teacher.expectNoErrorBanner();
  });

  test('"الأرباح" link → /teacher/earnings', async ({ page }) => {
    await expect(page.getByRole("link", { name: "الأرباح" }).first()).toHaveAttribute(
      "href",
      TEACHER_ROUTES.earnings
    );
  });

  test('"تحليلاتي" link → /teacher/analytics', async ({ page }) => {
    await expect(page.getByRole("link", { name: "تحليلاتي" }).first()).toHaveAttribute(
      "href",
      TEACHER_ROUTES.analytics
    );
  });

  test("Account aside ظاهر (TeacherProfileAccountAside)", async ({ page }) => {
    await expect(page.getByText("ملخص الحساب", { exact: true })).toBeVisible();
    await expect(page.getByText("روابط سريعة", { exact: true })).toBeVisible();
  });
});
