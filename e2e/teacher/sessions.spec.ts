import { test, expect } from "../fixtures-teacher";
import { TeacherPage } from "../helpers/teacher-page";
import { TEACHER_ROUTES } from "../helpers/test-data";

test.describe("Teacher sessions page", () => {
  let teacher: TeacherPage;

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
    teacher = new TeacherPage(page);
    await teacher.dismissOpenDialogs();
    await teacher.goTo("sessions");
  });

  test("/teacher/sessions بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${TEACHER_ROUTES.sessions.replace(/\//g, "\\/")}`));
  });

  test('عنوان "إدارة جلساتك التعليمية" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "إدارة جلساتك التعليمية" })).toBeVisible();
  });

  test('"جلسة جديدة" link ظاهر', async ({ page }) => {
    await expect(page.getByRole("link", { name: "جلسة جديدة" }).first()).toHaveAttribute(
      "href",
      TEACHER_ROUTES.sessionsNew
    );
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await teacher.clickRefresh();
    await teacher.expectTableOrEmpty(/لا توجد جلسات/);
  });

  test("Stats cards ظاهرة (TeacherSessionsStats)", async () => {
    for (const label of ["قادمة", "مباشرة", "منتهية", "ملغاة"]) {
      await expect(teacher.statCard(label).first()).toBeVisible();
    }
  });

  test("Filter tabs ظاهرة", async () => {
    for (const label of ["الكل", "قادمة", "مباشرة الآن", "منتهية", "ملغاة"]) {
      await expect(teacher.filterTab(label)).toBeVisible();
    }
  });

  test("Search input ظاهر", async ({ page }) => {
    await expect(page.getByPlaceholder("ابحث بعنوان الجلسة...")).toBeVisible();
  });

  test("Sessions list أو empty state ظاهر", async () => {
    await teacher.expectTableOrEmpty(/لا توجد جلسات/);
  });

  test("Pagination ظاهر لو في sessions", async () => {
    await teacher.expectPaginationIfPresent();
  });

  test('فلتر "قادمة" يغيّر الـ active tab', async () => {
    await teacher.clickFilterTab("قادمة");
    await teacher.expectFilterTabActive("قادمة");
  });

  test('فلتر "منتهية" يغيّر الـ active tab', async () => {
    await teacher.clickFilterTab("الكل");
    await teacher.clickFilterTab("منتهية");
    await teacher.expectFilterTabActive("منتهية");
  });

  test("الضغط على session card يفتح details modal لو في sessions", async ({ page }) => {
    const detailsBtn = page.getByRole("button", { name: "التفاصيل" }).first();
    if (!(await detailsBtn.isVisible().catch(() => false))) {
      test.skip(true, "لا توجد جلسات لعرض التفاصيل");
      return;
    }
    await detailsBtn.click();
    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("تفاصيل الجلسة")).toBeVisible();
  });

  test("الـ details modal بيتقفل بـ Escape أو close button", async ({ page }) => {
    const detailsBtn = page.getByRole("button", { name: "التفاصيل" }).first();
    if (!(await detailsBtn.isVisible().catch(() => false))) {
      test.skip(true, "لا توجد جلسات لعرض التفاصيل");
      return;
    }
    await detailsBtn.click();
    const dialog = page.getByRole("dialog").first();
    await dialog.waitFor({ state: "visible", timeout: 15_000 });
    await page.keyboard.press("Escape");
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole("button", { name: "إغلاق" }).click();
    }
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  });
});
