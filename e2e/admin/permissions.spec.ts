import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin permissions page", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.dismissOpenDialogs();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("permissions");
    await admin.waitForContentLoaded();
  });

  test('بتفتح — عنوان "إدارة الصلاحيات"', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.permissions.replace(/\//g, "\\/")}`));
    await expect(admin.main().getByText("إدارة الصلاحيات").first()).toBeVisible();
  });

  test("3 stat cards ظاهرة", async ({ page }) => {
    const grid = page.locator("main .sm\\:grid-cols-3");
    for (const label of ["إجمالي الفريق", "مدير النظام", "مشرف"]) {
      await expect(grid.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('"فريق الإدارة" section ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "فريق الإدارة" })).toBeVisible();
  });

  test('"إضافة مشرف" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "إضافة مشرف" })).toBeVisible();
  });

  test('"كيف تعمل الصلاحيات؟" card ظاهر', async ({ page }) => {
    await expect(page.getByText("كيف تعمل الصلاحيات؟")).toBeVisible();
  });

  test("staff table اتحمّل", async ({ page }) => {
    await expect(
      page
        .getByText("فريق الإدارة")
        .or(page.getByText("لا يوجد أعضاء في الفريق"))
        .or(page.getByRole("button", { name: "الصلاحيات" }))
        .first()
    ).toBeVisible({ timeout: 45_000 });
  });

  test('"إضافة مشرف" يفتح modal', async ({ page }) => {
    await page.getByRole("button", { name: "إضافة مشرف" }).click();
    await expect(page.getByRole("heading", { name: "إضافة مشرف جديد" })).toBeVisible();
  });
});
