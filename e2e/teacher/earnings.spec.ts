import { test, expect } from "../fixtures-teacher";
import { TeacherPage } from "../helpers/teacher-page";
import { TEACHER_ROUTES } from "../helpers/test-data";

test.describe("Teacher earnings page", () => {
  let teacher: TeacherPage;

  test.beforeEach(async ({ page }) => {
    teacher = new TeacherPage(page);
    await teacher.dismissOpenDialogs();
    await teacher.goTo("earnings");
    await page.getByRole("button", { name: "سجل الأرباح", exact: true }).click();
    await teacher.waitForContentLoaded();
  });

  test("/teacher/earnings بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${TEACHER_ROUTES.earnings.replace(/\//g, "\\/")}`));
  });

  test('عنوان "متابعة الأرباح وطلبات السحب" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "متابعة الأرباح وطلبات السحب" })).toBeVisible();
  });

  test("4 stat cards ظاهرة", async () => {
    for (const label of ["إجمالي الأرباح", "رصيد متاح للسحب", "أرباح هذا الشهر", "تم سحبه"]) {
      await expect(teacher.statCard(label).first()).toBeVisible();
    }
  });

  test('"طلب سحب جديد" form ظاهر', async ({ page }) => {
    await expect(page.getByText("طلب سحب جديد", { exact: true })).toBeVisible();
  });

  test('"الرصيد المتاح للسحب" ظاهر في الـ form', async ({ page }) => {
    await expect(page.getByText("الرصيد المتاح للسحب", { exact: true })).toBeVisible();
  });

  test('"المبلغ" input ظاهر', async ({ page }) => {
    await expect(page.locator("#withdraw_amount")).toBeVisible();
  });

  test('"طريقة السحب" select ظاهر', async ({ page }) => {
    await expect(page.getByLabel("طريقة السحب", { exact: true })).toBeVisible();
  });

  test('"إرسال طلب السحب" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "إرسال طلب السحب" })).toBeVisible();
  });

  test('"سحب كامل الرصيد" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "سحب كامل الرصيد" })).toBeVisible();
  });

  test('Tabs: "سجل الأرباح"، "طلبات السحب"، "عمولات الغرف" ظاهرة', async ({ page }) => {
    await expect(page.getByRole("button", { name: "سجل الأرباح", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "طلبات السحب", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "عمولات الغرف 🏠", exact: true })).toBeVisible();
  });

  test('Tab "سجل الأرباح" active افتراضياً', async ({ page }) => {
    await expect(page.getByRole("button", { name: "سجل الأرباح", exact: true })).toHaveClass(
      /bg-peak-orange/
    );
  });

  test('الضغط على "طلبات السحب" يغيّر الـ active tab', async ({ page }) => {
    await page.getByRole("button", { name: "طلبات السحب", exact: true }).click();
    await expect(page.getByRole("button", { name: "طلبات السحب", exact: true })).toHaveClass(
      /bg-peak-orange/
    );
  });

  test('الضغط على "عمولات الغرف 🏠" يغيّر الـ active tab', async ({ page }) => {
    await page.getByRole("button", { name: "عمولات الغرف 🏠", exact: true }).click();
    await expect(page.getByRole("button", { name: "عمولات الغرف 🏠", exact: true })).toHaveClass(
      /bg-peak-orange/
    );
  });

  test("Date range filters ظاهرة", async ({ page }) => {
    await expect(page.getByLabel("من تاريخ")).toBeVisible();
    await expect(page.getByLabel("إلى تاريخ")).toBeVisible();
  });

  test("DataTable أو empty state ظاهر", async () => {
    await teacher.expectTableOrEmpty(/لا توجد أرباح|لا توجد طلبات سحب|لا توجد بيانات/);
  });

  test("Pagination ظاهر", async () => {
    await teacher.expectPaginationIfPresent();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await teacher.clickRefresh();
    await teacher.expectTableOrEmpty(/لا توجد أرباح|لا توجد طلبات سحب/);
  });

  test('"تحليلاتي" link ظاهر → /teacher/analytics', async ({ page }) => {
    await expect(page.getByRole("link", { name: "تحليلاتي" }).first()).toHaveAttribute(
      "href",
      TEACHER_ROUTES.analytics
    );
  });

  test('لو الرصيد أقل من 50 جنيه: "إرسال طلب السحب" disabled', async ({ page }) => {
    const insufficient = await page
      .getByText(/لا يوجد رصيد كافٍ \(الحد الأدنى 50 جنيه\)/)
      .isVisible()
      .catch(() => false);
    if (!insufficient) {
      test.skip(true, "الرصيد المتاح يسمح بالسحب — لا يمكن اختبار التعطيل");
      return;
    }
    await expect(page.getByRole("button", { name: "إرسال طلب السحب" })).toBeDisabled();
  });
});
