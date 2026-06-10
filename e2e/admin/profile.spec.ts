import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin profile page", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.dismissOpenDialogs();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("account");
    await admin.waitForContentLoaded();
  });

  test("/admin/profile بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.account.replace(/\//g, "\\/")}`));
  });

  test('"ملخص الحساب" section ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "ملخص الحساب" })).toBeVisible();
  });

  test("الدور ظاهر في الـ summary", async ({ page }) => {
    await expect(page.getByText("الدور", { exact: true })).toBeVisible();
  });

  test("البريد الإلكتروني ظاهر", async ({ page }) => {
    await expect(page.getByText("البريد", { exact: true })).toBeVisible();
  });

  test("حالة الحساب ظاهرة", async ({ page }) => {
    await expect(page.getByText("حالة الحساب", { exact: true })).toBeVisible();
  });

  test('"اختصارات سريعة" section ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "اختصارات سريعة" })).toBeVisible();
  });

  test("الـ quick links موجودة وشغّالة", async ({ page }) => {
    const quickLinks = page.getByRole("heading", { name: "اختصارات سريعة" }).locator("..");
    for (const label of ["لوحة التحكم", "المستخدمون", "الجلسات", "طلبات السحب"]) {
      const link = quickLinks.getByRole("link", { name: label });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", /.+/);
    }
  });
});
