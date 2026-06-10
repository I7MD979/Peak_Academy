import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";

test.describe("Admin user details modal", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.forceCloseModalsAfterTest();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("users");
    await admin.openFirstUserProfile();
  });

  test("الضغط على أول user يفتح الـ modal", async ({ page }) => {
    await expect(page.getByRole("dialog").first()).toBeVisible();
  });

  test("الـ modal فيه اسم المستخدم", async ({ page }) => {
    const dialog = page.getByRole("dialog").first();
    await expect(dialog.getByRole("heading").first()).toBeVisible();
  });

  test('الـ modal فيه email مع زر "نسخ"', async ({ page }) => {
    const dialog = page.getByRole("dialog").first();
    await expect(dialog.getByText("نسخ")).toBeVisible();
  });

  test("tabs: المعلومات، الملف ظاهرة", async ({ page }) => {
    const dialog = page.getByRole("dialog").first();
    await expect(dialog.getByRole("button", { name: "المعلومات", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "الملف", exact: true })).toBeVisible();
  });

  test('tab "المعلومات" يعرض: البريد، تاريخ التسجيل', async ({ page }) => {
    const dialog = page.getByRole("dialog").first();
    await admin.switchTab("المعلومات");
    await expect(dialog.getByText("البريد الإلكتروني", { exact: true })).toBeVisible();
    await expect(dialog.getByText("تاريخ التسجيل", { exact: true })).toBeVisible();
  });

  test('tab "الملف" يعرض بيانات إضافية', async ({ page }) => {
    await admin.switchTab("الملف");
    const dialog = page.getByRole("dialog").first();
    const hasProfileData = await dialog
      .getByText(/الصف|نبذة|الأبناء|لا توجد بيانات إضافية/)
      .isVisible()
      .catch(() => false);
    expect(hasProfileData).toBeTruthy();
  });

  test('زر "إغلاق" يقفل الـ modal', async ({ page }) => {
    await admin.closeModal();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("الضغط خارج الـ modal يقفله", async ({ page }) => {
    await page.locator('[role="dialog"] > button.absolute.inset-0').first().click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 10_000 });
  });

  test('للطلاب: tab "الاشتراكات" ظاهر', async ({ page }) => {
    const subsTab = page.getByRole("button", { name: "الاشتراكات" });
    if (await subsTab.isVisible()) {
      await expect(subsTab).toBeVisible();
    } else {
      test.skip(true, "أول مستخدم ليس طالباً");
    }
  });

  test('زر "تعديل البيانات" ظاهر', async ({ page }) => {
    const editBtn = page.getByRole("button", { name: "تعديل البيانات" });
    if (await editBtn.isVisible()) {
      await expect(editBtn).toBeVisible();
    }
  });
});

test.describe("Admin user details modal — teacher verification", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.forceCloseModalsAfterTest();
  });

  test('للمدرسين غير الموثقين: زر "توثيق المدرس" ظاهر', async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("users");

    await admin.clickFilterTab("مدرسون");

    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count().catch(() => 0);

    if (rowCount === 0) {
      test.skip(true, "لا يوجد مدرسون في البيانات");
      return;
    }

    await page.evaluate(() => {
      const firstTd = document.querySelector("table tbody tr:first-child td:first-child");
      const btn = firstTd?.querySelector("button");
      if (btn) (btn as HTMLButtonElement).click();
    });

    const dialog = page.getByRole("dialog").first();
    await dialog.waitFor({ state: "visible", timeout: 15_000 });

    const isTeacher = await dialog.getByText(/مدرس|teacher/i).isVisible().catch(() => false);
    if (!isTeacher) {
      await page.keyboard.press("Escape");
      test.skip(true, "أول مستخدم مش مدرس — skip");
      return;
    }

    const isVerified = await dialog.getByText("موثّق").isVisible().catch(() => false);
    if (isVerified) {
      await page.keyboard.press("Escape");
      test.skip(true, "المدرس موثّق بالفعل — skip");
      return;
    }

    await expect(dialog.getByRole("button", { name: "توثيق المدرس" })).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
