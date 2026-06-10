import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin sessions page", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.dismissOpenDialogs();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("sessions");
    await admin.waitForContentLoaded();
  });

  test('بتفتح — عنوان "الجلسات التعليمية"', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.sessions.replace(/\//g, "\\/")}`));
    await expect(page.getByRole("heading", { name: "الجلسات التعليمية" })).toBeVisible();
  });

  test("5 stat cards ظاهرة", async () => {
    for (const label of [
      "إجمالي الجلسات",
      "مجدولة",
      "مباشرة الآن",
      "مكتملة",
      "ملغاة"
    ]) {
      await expect(admin.statCard(label).first()).toBeVisible();
    }
  });

  test("filter tabs ظاهرة", async () => {
    for (const label of ["الكل", "قادمة", "مباشرة", "منتهية", "ملغاة"]) {
      await expect(admin.filterTab(label)).toBeVisible();
    }
  });

  test("school level select ظاهر", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: "تصفية حسب المرحلة" })).toBeVisible();
  });

  test("grade select ظاهر", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: "تصفية حسب الصف" })).toBeVisible();
  });

  test("date range filters ظاهرة", async ({ page }) => {
    await expect(page.getByText("بداية الموعد", { exact: true })).toBeVisible();
    await expect(page.getByText("نهاية الموعد", { exact: true })).toBeVisible();
  });

  test("search input ظاهر", async ({ page }) => {
    await expect(page.getByPlaceholder("بحث بالعنوان أو اسم المدرس...")).toBeVisible();
  });

  test("DataTable اتحمّل", async () => {
    await admin.expectTableOrEmpty(/لا توجد جلسات/);
  });

  test("pagination ظاهر", async () => {
    await admin.expectPagination();
  });

  test('"إغلاق المفتوحة" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: /إغلاق المفتوحة/ })).toBeVisible();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await admin.clickRefresh();
    await admin.expectTableOrEmpty(/لا توجد جلسات/);
  });

  test('اختيار "إعدادي" من school level يغيّر grade options', async ({ page }) => {
    await admin.selectCombobox("تصفية حسب المرحلة", "إعدادي");
    const gradeCombo = page.getByRole("combobox", { name: "تصفية حسب الصف" });
    await gradeCombo.click();
    await expect(page.getByRole("option")).toHaveCount(4);
  });

  test("الضغط على stat card يغيّر الـ active filter", async () => {
    await admin.clickStatCard("مكتملة");
    await admin.expectFilterTabActive("منتهية");
  });
});
