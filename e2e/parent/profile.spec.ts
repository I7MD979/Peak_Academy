import { test, expect } from "../fixtures-parent";
import { ParentPage } from "../helpers/parent-page";
import { PARENT_ROUTES } from "../helpers/test-data";

test.describe("Parent profile page", () => {
  let parent: ParentPage;

  test.beforeEach(async ({ page }) => {
    parent = new ParentPage(page);
    await parent.dismissOpenDialogs();
    await parent.goTo("profile");
  });

  test("/parent/profile بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${PARENT_ROUTES.profile.replace(/\//g, "\\/")}`));
  });

  test('عنوان "إعدادات ولي الأمر" أو الاسم ظاهر', async ({ page }) => {
    await expect(page.getByText("إعدادات ولي الأمر", { exact: true }).first()).toBeVisible();
    await expect(parent.main().getByRole("heading", { level: 1 })).toBeVisible();
  });

  test('"تحديث" button ظاهر وشغّال', async () => {
    await parent.clickRefresh();
    await parent.expectNoErrorBanner();
  });

  test('"الرئيسية" link → /parent/dashboard', async ({ page }) => {
    await expect(page.getByRole("link", { name: "الرئيسية" }).first()).toHaveAttribute(
      "href",
      PARENT_ROUTES.dashboard
    );
  });

  test("ParentProfileStats ظاهر (3 stat cards)", async () => {
    for (const label of ["الأبناء المربوطون", "الدور", "عضو منذ"]) {
      await expect(parent.statCard(label).first()).toBeVisible({ timeout: 30_000 });
    }
  });

  test("Section tabs ظاهرة", async () => {
    for (const label of ["الكل", "البيانات الشخصية", "أبنائي", "ربط طالب", "الأمان"]) {
      await expect(parent.filterTab(label)).toBeVisible();
    }
  });

  test('"ربط طالب" section ظاهر مع input لكود الربط', async () => {
    await expect(parent.page.getByText("ربط ابن/ابنة", { exact: true })).toBeVisible();
    await expect(parent.linkCodeInput()).toBeVisible();
    await expect(parent.page.getByRole("button", { name: "ربط الطالب" })).toBeVisible();
  });

  test('"الأبناء المربوطون" section ظاهر', async ({ page }) => {
    const hasChildren = await parent.hasLinkedChildren();
    if (hasChildren) {
      await expect(page.getByRole("heading", { name: "أبنائي المربوطون" })).toBeVisible();
      return;
    }
    await expect(page.getByText("لم تربط أي طالب بعد")).toBeVisible();
  });

  test("لو في أبناء: children list ظاهرة", async ({ page }) => {
    if (!(await parent.hasLinkedChildren())) {
      test.skip(true, "لا يوجد أبناء مربوطين");
      return;
    }
    expect(await page.locator("a[href*='/parent/report?student=']").count()).toBeGreaterThan(0);
  });

  test('لو مفيش أبناء: "لم تربط أي طالب بعد" أو رابط لـ section الربط', async ({ page }) => {
    if (await parent.hasLinkedChildren()) {
      test.skip(true, "يوجد أبناء مربوطين");
      return;
    }
    await expect(page.getByText("لم تربط أي طالب بعد")).toBeVisible();
    await expect(page.getByRole("button", { name: "الذهاب لربط طالب" })).toBeVisible();
  });

  test('"البيانات الشخصية" section ظاهر', async ({ page }) => {
    await expect(page.getByText("البيانات الشخصية", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel(/الاسم الكامل|الاسم/)).toBeVisible();
  });

  test('"حفظ التغييرات" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "حفظ التغييرات" })).toBeVisible();
  });

  test('"تراجع" button ظاهر', async ({ page }) => {
    await expect(page.getByRole("button", { name: "تراجع" })).toBeVisible();
  });

  test('"الأمان" tab يعرض password section', async ({ page }) => {
    await expect(page.getByText("الأمان وكلمة المرور", { exact: true })).toBeVisible();
    await expect(page.getByLabel("كلمة المرور الجديدة")).toBeVisible();

    await parent.clickFilterTab("الأمان");
    await expect(page).toHaveURL(/section=security/, { timeout: 15_000 });
    await expect(page.getByLabel("كلمة المرور الجديدة")).toBeVisible();
  });

  test("ParentProfileAccountSummary ظاهر", async ({ page }) => {
    await expect(page.getByText("ملخص الحساب", { exact: true })).toBeVisible();
    await expect(page.getByText("حالة الحساب", { exact: true })).toBeVisible();
    await expect(parent.main().getByRole("link", { name: "التقارير" })).toBeVisible();
  });
});
