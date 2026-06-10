import { test, expect } from "../fixtures";
import { AdminPage } from "../helpers/admin-page";
import { ROUTES } from "../helpers/test-data";

test.describe("Admin subscription plans page", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.forceCloseModalsAfterTest();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("plans");
    await admin.waitForContentLoaded();
  });

  test('بتفتح — عنوان "خطط الاشتراك"', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${ROUTES.plans.replace(/\//g, "\\/")}`));
    await expect(admin.main().getByRole("heading", { name: "خطط الاشتراك" })).toBeVisible();
  });

  test("5 stat cards ظاهرة", async () => {
    for (const label of [
      "إجمالي الخطط",
      "خطط نشطة",
      "خطط موقوفة",
      "خطط مميزة",
      "اشتراكات نشطة"
    ]) {
      await expect(admin.statCard(label).first()).toBeVisible();
    }
  });

  test('"إضافة خطة" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "إضافة خطة" })).toBeVisible();
  });

  test("filter tabs ظاهرة", async () => {
    for (const label of ["الكل", "نشطة", "موقوفة", "مميزة"]) {
      await expect(admin.filterTab(label)).toBeVisible();
    }
  });

  test("search input ظاهر", async ({ page }) => {
    await expect(page.getByPlaceholder("بحث بالاسم أو الوصف...")).toBeVisible();
  });

  test("sort dropdown ظاهر", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: "ترتيب الخطط" })).toBeVisible();
  });

  test("plan cards أو empty state", async ({ page }) => {
    const cards = page.locator("article").filter({ has: page.getByRole("button", { name: "تعديل الخطة" }) });
    const empty = page.getByText(/لا توجد خطط/);
    const hasCards = (await cards.count()) > 0;
    const hasEmpty = await empty.isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('كل plan card فيها "تعديل الخطة" button', async ({ page }) => {
    const editBtns = page.getByRole("button", { name: "تعديل الخطة" });
    if ((await editBtns.count()) === 0) {
      test.skip(true, "لا توجد خطط في البيئة");
    }
    await expect(editBtns.first()).toBeVisible();
  });

  test('"تعديل الخطة" يفتح form modal', async ({ page }) => {
    const editBtn = page.getByRole("button", { name: "تعديل الخطة" }).first();
    if (!(await editBtn.isVisible().catch(() => false))) {
      test.skip(true, "لا توجد خطط في البيئة");
    }
    await editBtn.click();
    await expect(page.getByRole("heading", { name: "تحديث خطة الاشتراك" })).toBeVisible();
  });

  test('إجراءات → "عرض التفاصيل" يفتح details modal', async ({ page }) => {
    const actions = page.getByRole("button", { name: "إجراءات" }).first();
    if (!(await actions.isVisible().catch(() => false))) {
      test.skip(true, "لا توجد خطط في البيئة");
    }
    await actions.click();
    const detailsItem = page.getByRole("menuitem", { name: "عرض التفاصيل" });
    await detailsItem.waitFor({ state: "visible", timeout: 10_000 });
    await detailsItem.click();
    await expect(page.getByRole("dialog").getByRole("heading").first()).toBeVisible();
  });

  test('"إضافة خطة" يفتح add form modal', async ({ page }) => {
    await page.getByRole("button", { name: "إضافة خطة" }).click();
    await expect(page.getByRole("heading", { name: "إنشاء خطة اشتراك" })).toBeVisible();
  });
});

test.describe("Admin subscription assignment", () => {
  let admin: AdminPage;

  test.afterEach(async () => {
    await admin?.forceCloseModalsAfterTest();
  });

  test.beforeEach(async ({ page }) => {
    admin = new AdminPage(page);
    await admin.dismissOpenDialogs();
    await admin.goTo("users");
    await admin.openFirstUserProfile();

    const subsTab = page.getByRole("button", { name: "الاشتراكات" });
    if (!(await subsTab.isVisible())) {
      test.skip(true, "أول مستخدم ليس طالباً — لا يوجد تبويب اشتراكات");
    }
    await admin.switchTab("الاشتراكات");
    await page
      .getByText("جارٍ التحميل", { exact: false })
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
  });

  test('تبويب "الاشتراكات" ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "الاشتراكات" })).toBeVisible();
  });

  test('زر "تعيين اشتراك" أو "استبدال بخطة أخرى" ظاهر', async ({ page }) => {
    const assign = page.getByRole("button", { name: "تعيين اشتراك" });
    const replace = page.getByRole("button", { name: "استبدال بخطة أخرى" });
    await expect(assign.or(replace)).toBeVisible();
  });

  test("قائمة الخطط تحتوي على خيارات", async ({ page }) => {
    await admin.openAssignSubscriptionModal();
    const planSelect = page.getByLabel("الخطة", { exact: true });
    await expect(planSelect).toBeVisible();
    expect(await planSelect.locator("option").count()).toBeGreaterThan(0);
  });

  test("تعيين اشتراك ينجح (استجابة API)", async ({ page }) => {
    await admin.openAssignSubscriptionModal();
    const planSelect = page.getByLabel("الخطة", { exact: true });
    const planCount = await planSelect.locator('option:not([value=""])').count();
    if (planCount === 0) {
      test.skip(true, "لا توجد خطط اشتراك متاحة في البيئة");
    }
    await admin.assignSubscriptionFirstPlan();
    await expect(planSelect).not.toBeVisible({ timeout: 15_000 });
  });
});
