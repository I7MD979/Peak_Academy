import { test, expect } from "../fixtures-student";
import { StudentPage } from "../helpers/student-page";
import { STUDENT_ROUTES } from "../helpers/test-data";

test.describe("Student study rooms page", () => {
  let student: StudentPage;

  test.beforeEach(async ({ page }) => {
    student = new StudentPage(page);
    await student.dismissOpenDialogs();
    await student.goTo("studyRooms");
  });

  test("/student/study-rooms بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${STUDENT_ROUTES.studyRooms.replace(/\//g, "\\/")}`));
  });

  test('عنوان "ذاكر مع زملائك" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "ذاكر مع زملائك" })).toBeVisible();
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

  test("لو الملف مكتمل: 3 stat cards ظاهرة", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    for (const label of ["غرف متاحة", "حالتك", "أعضاء غرفتك"]) {
      await expect(student.statCard(label).first()).toBeVisible();
    }
  });

  test('لو الملف مكتمل: "انضمام سريع" section ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByText("انضمام سريع", { exact: true })).toBeVisible();
  });

  test("لو الملف مكتمل: Subject select ظاهر في الـ quick join", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByRole("combobox", { name: "اختر المادة للانضمام السريع" })).toBeVisible();
  });

  test('لو الملف مكتمل: "انضم الآن" button ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByRole("button", { name: "انضم الآن" })).toBeVisible();
  });

  test('لو الملف مكتمل: "الغرف المفتوحة" section ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(page.getByText("الغرف المفتوحة", { exact: true })).toBeVisible();
  });

  test("لو الملف مكتمل: Filter tabs للمواد ظاهرة", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    await expect(student.filterTab("كل المواد")).toBeVisible();
  });

  test("لو الملف مكتمل: Room cards أو empty state ظاهر", async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    const hasRooms = (await page.getByRole("button", { name: /انضم للغرفة|دخول/ }).count()) > 0;
    const hasEmpty = await page.getByText("لا توجد غرف مفتوحة حالياً").isVisible().catch(() => false);
    expect(hasRooms || hasEmpty).toBeTruthy();
  });

  test('لو في active room: "أنت داخل غرفة الآن" banner ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    const inRoom = await page.getByText("أنت داخل غرفة الآن").isVisible().catch(() => false);
    if (!inRoom) {
      test.skip(true, "الطالب ليس داخل غرفة حالياً");
      return;
    }
    await expect(page.getByText("أنت داخل غرفة الآن")).toBeVisible();
  });

  test('لو في active room: "دخول الغرفة" button ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    const enterBtn = page.getByRole("button", { name: "دخول الغرفة" });
    if (!(await enterBtn.isVisible().catch(() => false))) {
      test.skip(true, "لا توجد غرفة نشطة");
      return;
    }
    await expect(enterBtn).toBeVisible();
  });

  test('لو في active room: "مغادرة الغرفة" button ظاهر', async ({ page }) => {
    if (await student.isProfileIncomplete()) {
      test.skip(true, "الملف غير مكتمل");
      return;
    }
    const leaveBtn = page.getByRole("button", { name: "مغادرة الغرفة" });
    if (!(await leaveBtn.isVisible().catch(() => false))) {
      test.skip(true, "لا توجد غرفة نشطة");
      return;
    }
    await expect(leaveBtn).toBeVisible();
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
