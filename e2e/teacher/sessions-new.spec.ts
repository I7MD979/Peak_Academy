import { test, expect } from "../fixtures-teacher";
import { TeacherPage } from "../helpers/teacher-page";
import { TEACHER_ROUTES } from "../helpers/test-data";

test.describe("Teacher create session page", () => {
  let teacher: TeacherPage;

  test.beforeEach(async ({ page }) => {
    teacher = new TeacherPage(page);
    await teacher.dismissOpenDialogs();
    await teacher.goTo("sessionsNew");
  });

  test("/teacher/sessions/new بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${TEACHER_ROUTES.sessionsNew.replace(/\//g, "\\/")}`));
  });

  test("form إنشاء جلسة ظاهر", async ({ page }) => {
    await expect(page.getByText("بيانات الجلسة", { exact: true })).toBeVisible();
  });

  test("حقل العنوان ظاهر", async ({ page }) => {
    await expect(page.getByPlaceholder("مثال: مراجعة نهائية — كيمياء عضوية")).toBeVisible();
  });

  test("حقل المادة / الوصف ظاهر", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: "المادة" })).toBeVisible();
    await expect(page.getByText("وصف مختصر (اختياري)", { exact: true })).toBeVisible();
  });

  test("حقل التاريخ أو الوقت ظاهر", async ({ page }) => {
    await expect(page.getByText("موعد الجلسة", { exact: true })).toBeVisible();
  });

  test('زر "إنشاء" أو "حفظ" ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "إنشاء الجلسة" })).toBeVisible();
  });

  test("validation — لو submit من غير بيانات يظهر error", async ({ page }) => {
    await page.getByRole("button", { name: "إنشاء الجلسة" }).click();
    await expect(page.getByText(/يرجى مراجعة البيانات|اكتب عنواناً|اختر المادة|اختر موعد/i).first()).toBeVisible({
      timeout: 10_000
    });
  });
});
