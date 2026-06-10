import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin landing page", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.dismissOpenDialogs();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("landing");
    await admin.waitForContentLoaded();
  });

  test('بتفتح — عنوان "صفحة الهبوط"', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.landing.replace(/\//g, "\\/")}`));
    await expect(admin.main().getByRole("heading", { name: "صفحة الهبوط" })).toBeVisible();
  });

  test("5 stat cards ظاهرة", async () => {
    for (const label of [
      "إجمالي الإحصائيات",
      "ظاهرة على الهبوط",
      "مخفية",
      "خطط نشطة",
      "عروض نشطة"
    ]) {
      await expect(admin.statCard(label).first()).toBeVisible();
    }
  });

  test("filter tabs ظاهرة", async () => {
    for (const label of ["الكل", "ظاهرة", "مخفية"]) {
      await expect(admin.filterTab(label)).toBeVisible();
    }
  });

  test("search input ظاهر", async ({ page }) => {
    await expect(page.getByPlaceholder("بحث بالعنوان أو المفتاح...")).toBeVisible();
  });

  test("DataTable اتحمّل", async () => {
    await admin.expectTableOrEmpty(/لا توجد إحصائيات مطابقة/);
  });

  test('"معاينة الموقع" link ظاهر وهريف /', async ({ page }) => {
    const preview = page.getByRole("link", { name: "معاينة الموقع" });
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("href", "/");
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await admin.clickRefresh();
    await admin.expectTableOrEmpty(/لا توجد إحصائيات مطابقة/);
  });

  test('"خطط الاشتراك" linked card مع "إدارة الخطط"', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "خطط الاشتراك" })).toBeVisible();
    await expect(page.getByRole("link", { name: "إدارة الخطط" })).toHaveAttribute(
      "href",
      ROUTES.plans
    );
  });

  test('"العروض والخصومات" linked card مع "إدارة العروض"', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "العروض والخصومات" })).toBeVisible();
    await expect(page.getByRole("link", { name: "إدارة العروض" })).toHaveAttribute(
      "href",
      ROUTES.discounts
    );
  });

  test('الضغط على stat card "ظاهرة" يغيّر الـ active filter', async () => {
    await admin.clickStatCard("ظاهرة على الهبوط");
    await admin.expectFilterTabActive("ظاهرة");
  });
});
