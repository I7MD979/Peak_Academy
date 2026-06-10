import { test, expect } from "../fixtures-student";
import { StudentPage } from "../helpers/student-page";
import { STUDENT_ROUTES } from "../helpers/test-data";

test.describe("Student ask page", () => {
  let student: StudentPage;

  test.beforeEach(async ({ page }) => {
    student = new StudentPage(page);
    await student.dismissOpenDialogs();
    await student.goTo("ask");
  });

  test("/student/ask بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${STUDENT_ROUTES.ask.replace(/\//g, "\\/")}`));
  });

  test('عنوان "اطرح سؤالك" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "اطرح سؤالك" })).toBeVisible();
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

  test('لو الملف مكتمل: 3 stat cards ظاهرة', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    for (const label of ["إجمالي الأسئلة", "تم الرد", "بانتظار الرد"]) {
      await expect(student.statCard(label).first()).toBeVisible();
    }
  });

  test('لو الملف مكتمل: "سؤال جديد" form ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByText("سؤال جديد", { exact: true })).toBeVisible();
  });

  test("لو الملف مكتمل: Subject select ظاهر", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByRole("combobox", { name: "اختر المادة" })).toBeVisible();
  });

  test('لو الملف مكتمل: textarea "نص السؤال" ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.locator("#question_content")).toBeVisible();
    await expect(page.getByText("نص السؤال", { exact: true })).toBeVisible();
  });

  test("لو الملف مكتمل: character counter ظاهر (X/2000)", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByText(/\d+\/2000/)).toBeVisible();
  });

  test('لو الملف مكتمل: "إرسال السؤال" أو "ادفع وأرسل" button ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    const submit = page.getByRole("button", { name: /إرسال السؤال|ادفع وأرسل/ });
    await expect(submit.first()).toBeVisible();
  });

  test("لو الملف مكتمل: submit button disabled لو النص أقل من 10 أحرف", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await page.locator("#question_content").fill("x".repeat(5));
    const submitBtn = page.getByRole("button", { name: /إرسال السؤال|ادفع وأرسل/ }).first();
    await expect(submitBtn).toBeDisabled();

    await page.locator("#question_content").fill("x".repeat(15));
    await expect(submitBtn).toBeEnabled();
  });

  test('لو الملف مكتمل: "أسئلتي السابقة" section ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByText("أسئلتي السابقة", { exact: true })).toBeVisible();
  });

  test("لو الملف مكتمل: Filter tabs ظاهرة", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    for (const label of ["الكل", "بانتظار الرد", "تم الرد"]) {
      await expect(student.filterTab(label)).toBeVisible();
    }
  });

  test("لو الملف مكتمل: Subject filter ظاهر", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByRole("combobox", { name: "فلتر المادة في القائمة" })).toBeVisible();
  });

  test("لو الملف مكتمل: Date range filters ظاهرة", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByLabel("من تاريخ")).toBeVisible();
    await expect(page.getByLabel("إلى تاريخ")).toBeVisible();
  });

  test("لو الملف مكتمل: Questions list أو empty state ظاهر", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await student.waitForContentLoaded();
    await page
      .locator(".animate-pulse")
      .first()
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
    await expect(
      page
        .getByText("لم تطرح أي سؤال بعد")
        .or(page.getByRole("button", { name: /التفاصيل|إخفاء/ }).first())
    ).toBeVisible({ timeout: 15_000 });
  });

  test("لو الملف مكتمل: Pagination ظاهر لو في أسئلة", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await student.expectPaginationIfPresent();
  });

  test('لو الملف مكتمل: "مسح الفلاتر" button يظهر بعد تحديد فلتر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    const picker = page.getByLabel("من تاريخ");
    if (!(await picker.isVisible().catch(() => false))) {
      test.skip(true, "حقل التاريخ غير متاح");
      return;
    }
    await picker.click();
    const day = page.locator(".grid.grid-cols-7.gap-0\\.5 button:not([disabled])").first();
    if (!(await day.waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false))) {
      test.skip(true, "Date picker did not open");
      return;
    }
    await day.click();
    await expect(page.getByRole("button", { name: "مسح الفلاتر" })).toBeVisible();
  });

  test('لو الملف مش مكتمل: "أكمل ملفك الدراسي" banner ظاهر', async ({ page }) => {
    if (!(await student.isProfileIncomplete())) {
      test.skip(true, "الملف مكتمل");
      return;
    }
    await expect(page.getByText("أكمل ملفك الدراسي", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "إكمال الملف" })).toHaveAttribute(
      "href",
      STUDENT_ROUTES.profile
    );
  });
});
