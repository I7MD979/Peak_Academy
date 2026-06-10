import { test, expect } from "@playwright/test";
import { ADMIN_CREDENTIALS, INVALID_CREDENTIALS, ROUTES } from "../helpers/test-data";
import { AuthPage } from "../helpers/auth-page";
import { loginAsAdmin } from "../helpers/admin-ready";

test.describe("Admin login & logout", () => {
  test("صفحة تسجيل الدخول تفتح بشكل صحيح", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.assertOnLoginPage();
  });

  test("تسجيل دخول ناجح يوجّه إلى لوحة التحكم", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await auth.assertLoggedInDashboard();
  });

  test("كلمة مرور خاطئة تعرض رسالة خطأ", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.login(ADMIN_CREDENTIALS.email, INVALID_CREDENTIALS.password);
    await expect(page).toHaveURL(new RegExp(`${ROUTES.login.replace(/\//g, "\\/")}`));
    await expect(page.getByText(/غير صحيح|خطأ|فشل/i)).toBeVisible();
  });

  test("بريد غير موجود يعرض رسالة خطأ", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.login(INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password);
    await expect(page).toHaveURL(new RegExp(`${ROUTES.login.replace(/\//g, "\\/")}`));
    await expect(page.getByText(/غير صحيح|خطأ|فشل/i)).toBeVisible();
  });

  test("حقول فارغة تمنع الإرسال", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.loginButton.click();
    await expect(page).toHaveURL(new RegExp(`${ROUTES.login.replace(/\//g, "\\/")}`));
    await expect(auth.emailInput).toBeVisible();
  });

  test("حقل كلمة المرور من نوع password افتراضياً", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await expect(page.locator("#login-password")).toHaveAttribute("type", "password");
  });

  test("تسجيل الخروج يعيد التوجيه لصفحة الدخول", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await auth.assertLoggedInDashboard();

    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(
      new RegExp(`(${ROUTES.login}|${ROUTES.home})`.replace(/\//g, "\\/"))
    );
  });

  test("مستخدم مسجّل يُحوَّل من /auth/login إلى لوحة التحكم", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(ROUTES.login);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\//, { timeout: 15_000 });
  });

  test("بعد تسجيل الخروج لا يمكن الوصول للوحة التحكم", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await page.waitForLoadState("networkidle");

    await page.goto(ROUTES.dashboard);
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(new RegExp(`${ROUTES.dashboard.replace(/\//g, "\\/")}`));
  });

});
