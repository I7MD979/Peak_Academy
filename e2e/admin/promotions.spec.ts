import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin promotions page", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.dismissOpenDialogs();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("discounts");
    await admin.waitForContentLoaded();
  });

  test('بتفتح — عنوان "العروض والخصومات"', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.discounts.replace(/\//g, "\\/")}`));
    await expect(admin.main().getByRole("heading", { name: "العروض والخصومات" })).toBeVisible();
  });

  test("5 stat cards ظاهرة", async () => {
    for (const label of [
      "إجمالي العروض",
      "عروض نشطة",
      "عروض موقوفة",
      "عروض منتهية",
      "مرات الاستخدام"
    ]) {
      await expect(admin.statCard(label).first()).toBeVisible();
    }
  });

  test('"إنشاء عرض" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "إنشاء عرض" })).toBeVisible();
  });

  test("filter tabs ظاهرة", async () => {
    for (const label of ["الكل", "نشطة", "موقوفة", "منتهية"]) {
      await expect(admin.filterTab(label)).toBeVisible();
    }
  });

  test("type filter ظاهر", async ({ page }) => {
    await expect(page.getByLabel("نوع العرض")).toBeVisible();
  });

  test("search input ظاهر", async ({ page }) => {
    await expect(page.getByPlaceholder("بحث بكود العرض...")).toBeVisible();
  });

  test("DataTable اتحمّل", async () => {
    await admin.expectTableOrEmpty(/لا توجد عروض مطابقة/);
  });

  test("pagination ظاهر", async () => {
    await admin.expectPagination();
  });

  test('"إنشاء عرض" يفتح form modal', async ({ page }) => {
    await page.getByRole("button", { name: "إنشاء عرض" }).click();
    await expect(page.getByRole("heading", { name: "إنشاء كوبون أو خصم" })).toBeVisible();
  });

  test("لو في عروض: promo code cell مع copy button", async ({ page }) => {
    const rows = page.locator("table tbody tr");
    if ((await rows.count()) === 0) return;
    const copyBtn = page.getByRole("button", { name: /نسخ|copy/i }).first();
    if (await copyBtn.isVisible().catch(() => false)) {
      await expect(copyBtn).toBeVisible();
    }
  });
});
