import { test, expect } from "../fixtures-student";
import { StudentPage } from "../helpers/student-page";
import { STUDENT_ROUTES } from "../helpers/test-data";

test.describe("Student sessions page", () => {
  let student: StudentPage;

  test.afterEach(async ({ page }) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const hasDialog = await page
        .locator('[role="dialog"]')
        .first()
        .isVisible()
        .catch(() => false);
      if (!hasDialog) break;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  });

  test.beforeEach(async ({ page }) => {
    student = new StudentPage(page);
    await student.dismissOpenDialogs();
    await student.goTo("sessions");
  });

  test("/student/sessions بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${STUDENT_ROUTES.sessions.replace(/\//g, "\\/")}`));
  });

  test("Stats cards ظاهرة (StudentSessionsStats)", async () => {
    for (const label of ["متاحة للحجز", "جلساتي", "مباشرة الآن", "منتهية"]) {
      await expect(student.statCard(label).first()).toBeVisible();
    }
  });

  test("Filter tabs ظاهرة", async () => {
    for (const label of ["متاحة للحجز", "جلساتي", "مباشرة الآن", "منتهية"]) {
      await expect(student.filterTab(label)).toBeVisible();
    }
  });

  test("Search أو filters ظاهرة (StudentSessionsFilters)", async ({ page }) => {
    await expect(page.getByText("تصفية الجلسات", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/ابحث/)).toBeVisible();
  });

  test("Sessions list أو empty state ظاهر", async ({ page }) => {
    const hasCards = (await page.locator("a[href*='/student/sessions/'], a[href*='/sessions/']").count()) > 0;
    const hasEmpty = await page.getByText(/لا توجد جلسات|لم تسجّل/).isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test("Pagination ظاهر لو في sessions", async () => {
    await student.expectPaginationIfPresent();
  });

  test('فلتر "جلساتي" يغيّر الـ active tab', async () => {
    await student.clickFilterTab("جلساتي");
    await student.expectFilterTabActive("جلساتي");
  });

  test('فلتر "منتهية" يغيّر الـ active tab', async ({ page }) => {
    await student.clickFilterTab("منتهية");
    await expect(page).toHaveURL(/tab=completed/, { timeout: 15_000 });
    await student.expectFilterTabActive("منتهية");
  });

  test("Live banner ظاهر لو في جلسات مباشرة", async ({ page }) => {
    const hasBanner = await page.getByText(/جلسات? مباشرة.*الآن/).isVisible().catch(() => false);
    if (!hasBanner) {
      test.skip(true, "لا توجد جلسات مباشرة حالياً");
      return;
    }
    await expect(page.getByRole("button", { name: /عرض الجلسات المباشرة/ })).toBeVisible();
  });

  test("مفيش error box ظاهر", async () => {
    await student.expectNoErrorBanner();
  });
});
