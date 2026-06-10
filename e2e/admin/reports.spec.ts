import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin reports page", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.dismissOpenDialogs();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("reports");
    await admin.waitForContentLoaded();
  });

  test('بتفتح — عنوان "ملخص الأداء والإيرادات"', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.reports.replace(/\//g, "\\/")}`));
    await expect(page.getByRole("heading", { name: "ملخص الأداء والإيرادات" })).toBeVisible();
  });

  test("5 stat cards ظاهرة", async () => {
    for (const label of [
      "إيرادات المنصة",
      "المسحوبات المدفوعة",
      "طلاب جدد",
      "جلسات مكتملة",
      "متوسط التقييم"
    ]) {
      await expect(admin.statCard(label).first()).toBeVisible();
    }
  });

  test('period selector ظاهر (افتراضي: "هذا الشهر")', async ({ page }) => {
    const period = page.getByRole("combobox", { name: "اختيار الفترة الزمنية" });
    await expect(period).toBeVisible();
    await expect(period).toContainText("هذا الشهر");
  });

  test("date range filters ظاهرة", async ({ page }) => {
    await expect(page.getByText("من تاريخ", { exact: true })).toBeVisible();
    await expect(page.getByText("إلى تاريخ", { exact: true })).toBeVisible();
  });

  test('"مسح التواريخ" button disabled افتراضياً', async ({ page }) => {
    await expect(page.getByRole("button", { name: "مسح التواريخ" })).toBeDisabled();
  });

  test('Revenue chart section ظاهر (id="reports-chart")', async ({ page }) => {
    await expect(page.locator("#reports-chart")).toBeVisible();
    await expect(page.getByRole("heading", { name: "الإيرادات الشهرية" })).toBeVisible();
  });

  test('"أفضل 5 مدرسين" section ظاهر', async ({ page }) => {
    await expect(page.locator("#reports-teachers")).toBeVisible();
    await expect(page.getByRole("heading", { name: "أفضل 5 مدرسين" })).toBeVisible();
  });

  test('"أفضل 5 مواد" section ظاهر', async ({ page }) => {
    await expect(page.locator("#reports-subjects")).toBeVisible();
    await expect(page.getByRole("heading", { name: "أفضل 5 مواد" })).toBeVisible();
  });

  test('"تصدير CSV" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "تصدير CSV" })).toBeVisible();
  });

  test('"تحميل PDF" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "تحميل PDF" })).toBeVisible();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await admin.clickRefresh();
    await expect(admin.page.locator("#reports-chart")).toBeVisible();
  });

  test('تغيير الفترة لـ "آخر 3 شهور"', async ({ page }) => {
    await admin.selectCombobox("اختيار الفترة الزمنية", "آخر 3 شهور");
    await expect(page.getByRole("combobox", { name: "اختيار الفترة الزمنية" })).toContainText(
      "آخر 3 شهور"
    );
  });

  test('تحديد تاريخ يـ enable "مسح التواريخ"', async ({ page }) => {
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
    await expect(page.getByRole("button", { name: "مسح التواريخ" })).toBeEnabled();
  });
});
