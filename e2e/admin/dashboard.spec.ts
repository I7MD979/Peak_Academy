import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin dashboard", () => {
  let admin: AdminPage;

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("dashboard");
    await admin.waitForContentLoaded();
  });

  test("/admin/dashboard بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.dashboard.replace(/\//g, "\\/")}`));
    await expect(page.getByText("لوحة التحكم", { exact: true }).first()).toBeVisible();
  });

  test("عنوان الترحيب ظاهر", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /أهلاً بك/ })).toBeVisible();
  });

  test('stat card "إجمالي المستخدمين" ظاهر', async ({ page }) => {
    await expect(page.getByRole("link", { name: /إجمالي المستخدمين/ })).toBeVisible();
  });

  test('stat card "الجلسات المباشرة" ظاهر', async ({ page }) => {
    await expect(page.getByRole("link", { name: /الجلسات المباشرة/ })).toBeVisible();
  });

  test('stat card "سحوبات معلقة" ظاهر', async ({ page }) => {
    await expect(page.getByRole("link", { name: /سحوبات معلقة/ })).toBeVisible();
  });

  test('stat card "إجمالي الإيرادات" ظاهر', async ({ page }) => {
    await expect(page.getByRole("link", { name: /إجمالي الإيرادات/ })).toBeVisible();
  });

  test("الـ cards links للصفحات الصح", async ({ page }) => {
    await expect(page.getByRole("link", { name: /إجمالي المستخدمين/ })).toHaveAttribute(
      "href",
      ROUTES.users
    );
    await expect(page.getByRole("link", { name: /الجلسات المباشرة/ })).toHaveAttribute(
      "href",
      ROUTES.sessions
    );
    await expect(page.getByRole("link", { name: /سحوبات معلقة/ })).toHaveAttribute(
      "href",
      ROUTES.withdrawals
    );
    await expect(page.getByRole("link", { name: /إجمالي الإيرادات/ })).toHaveAttribute(
      "href",
      ROUTES.reports
    );
  });
});
