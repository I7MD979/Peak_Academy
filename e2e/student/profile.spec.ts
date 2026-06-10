import { test, expect } from "../fixtures-student";
import { StudentPage } from "../helpers/student-page";
import { STUDENT_ROUTES } from "../helpers/test-data";

test.describe("Student profile page", () => {
  let student: StudentPage;

  test.beforeEach(async ({ page }) => {
    student = new StudentPage(page);
    await student.dismissOpenDialogs();
    await student.goTo("profile");
  });

  test("/student/profile بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${STUDENT_ROUTES.profile.replace(/\//g, "\\/")}`));
  });

  test('عنوان "حسابي" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "حسابي" })).toBeVisible();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await student.clickRefresh();
    await student.expectNoErrorBanner();
  });

  test('"لوحتي" link → /student/dashboard', async ({ page }) => {
    await expect(page.getByRole("link", { name: "لوحتي" }).first()).toHaveAttribute(
      "href",
      STUDENT_ROUTES.dashboard
    );
  });

  test("4 stat cards ظاهرة", async () => {
    for (const label of ["ستريك المذاكرة", "جلسات قادمة", "جلسات مكتملة", "أسئلتي"]) {
      await expect(student.statCard(label).first()).toBeVisible();
    }
  });

  test("Section tabs ظاهرة", async ({ page }) => {
    for (const label of ["الكل", "البيانات الشخصية", "البيانات الدراسية", "الأمان"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
    }
  });

  test('"البيانات الشخصية" section ظاهر', async ({ page }) => {
    await expect(page.getByText("البيانات الشخصية", { exact: true }).first()).toBeVisible();
    await expect(page.locator("#full_name").first()).toBeVisible();
  });

  test('"البيانات الدراسية" section ظاهر', async ({ page }) => {
    await expect(page.getByText("البيانات الدراسية", { exact: true }).first()).toBeVisible();
  });

  test('"الأمان" tab يعرض password section', async ({ page }) => {
    await page.getByRole("button", { name: "الأمان", exact: true }).click();
    await expect(page.getByText("الأمان وكلمة المرور", { exact: true })).toBeVisible();
    await expect(page.locator("#student_new_password")).toBeVisible();
  });

  test('"حفظ التغييرات" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "حفظ التغييرات" })).toBeVisible();
  });

  test('"تراجع" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "تراجع" })).toBeVisible();
  });

  test('"إدارة الاشتراك" link → /student/subscription', async ({ page }) => {
    await expect(page.getByRole("link", { name: "إدارة الاشتراك" })).toHaveAttribute(
      "href",
      STUDENT_ROUTES.subscription
    );
  });

  test('كود ربط ولي الأمر ظاهر لو موجود مع "نسخ الكود" button', async ({ page }) => {
    const hasCode = await page.getByText("كود ربط ولي الأمر").isVisible().catch(() => false);
    if (!hasCode) {
      test.skip(true, "لا يوجد كود ربط على حساب الاختبار");
      return;
    }
    await expect(page.getByRole("button", { name: "نسخ الكود" })).toBeVisible();
  });

  test("اختصارات سريعة ظاهرة", async ({ page }) => {
    for (const label of ["الجلسات", "اسأل مدرس", "غرف المذاكرة"]) {
      await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
    }
  });

  test("لو الملف مش مكتمل: warning banner ظاهر", async ({ page }) => {
    const incomplete = await student.isProfileIncomplete();
    if (!incomplete) {
      test.skip(true, "ملف الطالب مكتمل — لا يظهر التحذير");
      return;
    }
    await expect(page.getByText("أكمل ملفك الدراسي", { exact: true }).first()).toBeVisible();
  });
});
