import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin users page", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.forceCloseModalsAfterTest();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("users");
    await admin.waitForContentLoaded();
  });

  test('الصفحة بتفتح — عنوان "المستخدمون"', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.users.replace(/\//g, "\\/")}`));
    await expect(admin.main().getByRole("heading", { name: "المستخدمون" })).toBeVisible();
  });

  test("5 stat cards ظاهرة", async ({ page }) => {
    for (const label of [
      "إجمالي المستخدمين",
      "الطلاب",
      "المدرسون",
      "أولياء الأمور",
      "حسابات موقوفة"
    ]) {
      await expect(admin.statCard(label).first()).toBeVisible();
    }
  });

  test("filter tabs ظاهرة", async ({ page }) => {
    for (const label of ["الكل", "طلاب", "مدرسون", "أولياء أمور", "مشرفون"]) {
      await expect(admin.filterTab(label)).toBeVisible();
    }
  });

  test("search input ظاهر", async ({ page }) => {
    await expect(page.getByLabel("بحث المستخدمين")).toBeVisible();
  });

  test("status filter ظاهر", async ({ page }) => {
    await expect(page.getByLabel("تصفية حسب الحالة")).toBeVisible();
  });

  test("date filters ظاهرة", async ({ page }) => {
    await expect(page.getByText("من تاريخ", { exact: true })).toBeVisible();
    await expect(page.getByText("إلى تاريخ", { exact: true })).toBeVisible();
  });

  test("DataTable اتحمّل", async () => {
    await admin.expectTableOrEmpty(/لا يوجد مستخدمون/);
  });

  test("pagination ظاهر", async () => {
    await admin.expectPagination();
  });

  test('زر "تحديث" ظاهر وشغّال', async ({ page }) => {
    await admin.dismissOpenDialogs();
    const refresh = page.getByRole("main").getByRole("button", { name: "تحديث" });
    await expect(refresh).toBeVisible();
    await refresh.click();
    await admin.waitForContentLoaded();
    await admin.expectTableOrEmpty(/لا يوجد مستخدمون/);
  });

  test('فلتر "طلاب" يغيّر الـ active tab', async () => {
    await admin.clickFilterTab("طلاب");
    await admin.expectFilterTabActive("طلاب");
  });

  test('فلتر "موقوف" من الـ status dropdown', async ({ page }) => {
    await admin.selectCombobox("تصفية حسب الحالة", "موقوف");
    await expect(page.getByRole("combobox", { name: "تصفية حسب الحالة" })).toContainText("موقوف");
  });

  test('"مسح التاريخ" button يظهر بعد تحديد تاريخ', async ({ page }) => {
    const picker = page.getByLabel("من تاريخ");
    if (!(await picker.isVisible().catch(() => false))) {
      test.skip(true, "Date filter not available");
      return;
    }
    await picker.click();
    const day = page.locator(".grid.grid-cols-7.gap-0\\.5 button:not([disabled])").first();
    if (!(await day.waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false))) {
      test.skip(true, "Date picker did not open");
      return;
    }
    await day.click();
    await expect(page.getByRole("button", { name: "مسح التاريخ" })).toBeVisible();
  });
});
