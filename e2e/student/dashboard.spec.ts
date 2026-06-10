import { test, expect } from "../fixtures-student";
import { studentBottomNav } from "../helpers/student-auth";
import { StudentPage } from "../helpers/student-page";
import { STUDENT_ROUTES } from "../helpers/test-data";

test.describe("Student dashboard", () => {
  let student: StudentPage;

  test.beforeEach(async ({ page }) => {
    student = new StudentPage(page);
    await student.dismissOpenDialogs();
    await student.goTo("dashboard");
  });

  test("/student/dashboard بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${STUDENT_ROUTES.dashboard.replace(/\//g, "\\/")}`));
  });

  test("مفيش redirect لـ /auth/login (protected route شغّال)", async ({ page }) => {
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test('"تصفح الجلسات" أو quick actions ظاهرة', async ({ page }) => {
    await expect(page.getByRole("link", { name: "تصفح الجلسات" }).first()).toBeVisible();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await student.clickRefresh();
    await student.expectNoErrorBanner();
  });

  test("Stats section ظاهر أو loading state", async ({ page }) => {
    const hasStats = await student.statCard("جلسات قادمة").first().isVisible().catch(() => false);
    const hasSkeleton = await page.locator('[class*="animate-pulse"]').first().isVisible().catch(() => false);
    expect(hasStats || hasSkeleton).toBeTruthy();
  });

  test('"جلساتي القادمة" section ظاهر أو empty state', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "جلساتي القادمة" })).toBeVisible();
    const hasCards = (await page.locator("a[href*='/student/sessions/']").count()) > 0;
    const hasEmpty = await page.getByText("لا توجد جلسات قادمة").isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('"جلسات مكتملة" stat أو section ظاهر', async () => {
    await expect(student.statCard("جلسات مكتملة").first()).toBeVisible();
  });

  test("مفيش error box ظاهر", async () => {
    await student.expectNoErrorBanner();
  });

  test("bottom nav ظاهر على الصفحة (StudentBottomNav)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(studentBottomNav(page)).toBeVisible();
    await expect(page.getByRole("link", { name: "الرئيسية" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "حسابي" }).first()).toBeVisible();
  });
});
