import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin withdrawals page", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.dismissOpenDialogs();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("withdrawals");
    await admin.waitForContentLoaded();
  });

  test('بتفتح — عنوان "طلبات السحب"', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.withdrawals.replace(/\//g, "\\/")}`));
    await expect(admin.main().getByRole("heading", { name: "طلبات السحب" })).toBeVisible();
  });

  test("5 stat cards ظاهرة", async () => {
    for (const label of [
      "طلبات معلقة",
      "مقبولة",
      "مدفوعة",
      "مرفوضة",
      "إجمالي الطلبات"
    ]) {
      await expect(admin.statCard(label).first()).toBeVisible();
    }
  });

  test('الـ "معلقة" tab active افتراضياً', async () => {
    await admin.expectFilterTabActive("معلقة");
  });

  test("filter tabs ظاهرة", async () => {
    for (const label of ["معلقة", "مقبولة", "مدفوعة", "مرفوضة", "الكل"]) {
      await expect(admin.filterTab(label)).toBeVisible();
    }
  });

  test("method filter ظاهر", async ({ page }) => {
    await expect(page.getByLabel("طريقة السحب")).toBeVisible();
  });

  test("date range filters ظاهرة", async ({ page }) => {
    await expect(page.getByText("من تاريخ", { exact: true })).toBeVisible();
    await expect(page.getByText("إلى تاريخ", { exact: true })).toBeVisible();
  });

  test("search input ظاهر", async ({ page }) => {
    await expect(page.getByPlaceholder("بحث بالمدرس أو رقم الحساب...")).toBeVisible();
  });

  test("DataTable اتحمّل", async () => {
    await admin.expectTableOrEmpty(/لا توجد طلبات سحب/);
  });

  test("pagination ظاهر", async () => {
    await admin.expectPagination();
  });

  test('الضغط على stat card "مدفوعة" يغيّر الـ active filter', async () => {
    await admin.clickStatCard("مدفوعة");
    await admin.expectFilterTabActive("مدفوعة");
  });
});
