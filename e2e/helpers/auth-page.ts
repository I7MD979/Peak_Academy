import { expect, type Locator, type Page } from "@playwright/test";
import { ROUTES } from "./test-data";

export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByRole("textbox", { name: "البريد الإلكتروني" });
    this.passwordInput = page.getByRole("textbox", { name: "كلمة المرور" });
    this.loginButton = page.getByRole("button", { name: /تسجيل الدخول/ });
    this.errorBanner = page.locator('[class*="border-danger"], [class*="text-danger"]').first();
  }

  async gotoLogin() {
    await this.page.goto(ROUTES.login);
    await this.page.waitForLoadState("load");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async assertOnLoginPage() {
    await expect(this.page).toHaveURL(new RegExp(`${ROUTES.login.replace(/\//g, "\\/")}`));
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  async assertLoggedInDashboard() {
    await expect(this.page).toHaveURL(new RegExp(`${ROUTES.dashboard.replace(/\//g, "\\/")}`));
  }
}
