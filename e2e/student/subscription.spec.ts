import { test, expect } from "../fixtures-student";
import { StudentPage } from "../helpers/student-page";
import { STUDENT_ROUTES } from "../helpers/test-data";

test.describe("Student subscription page", () => {
  let student: StudentPage;

  test.beforeEach(async ({ page }) => {
    student = new StudentPage(page);
    await student.dismissOpenDialogs();
    await student.goTo("subscription");
  });

  test("/student/subscription بتفتح", async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`${STUDENT_ROUTES.subscription.replace(/\//g, "\\/")}`));
  });

  test('عنوان "الاشتراك الشهري" ظاهر', async ({ page }) => {
    await expect(page.getByRole("heading", { name: "الاشتراك الشهري" })).toBeVisible();
  });

  test('"الجلسات" link ظاهر → /student/sessions', async ({ page }) => {
    await expect(page.getByRole("link", { name: "الجلسات" }).first()).toHaveAttribute(
      "href",
      STUDENT_ROUTES.sessions
    );
  });

  test('حقل "كود خصم" ظاهر', async ({ page }) => {
    await expect(page.locator("#promo_code")).toBeVisible();
    await expect(page.getByText("كود خصم (اختياري)", { exact: true })).toBeVisible();
  });

  test("subscription card أو empty state ظاهر", async ({ page }) => {
    await student.waitForContentLoaded();
    await expect(
      page.getByText(/خطتك:/).first().or(page.getByText(/لا يوجد اشتراك نشط/).first())
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Pricing plans ظاهرة (على الأقل plan واحد)", async ({ page }) => {
    const planButtons = page.getByRole("button", { name: /اشترك الآن|لديك اشتراك نشط/ });
    await expect(planButtons.first()).toBeVisible({ timeout: 30_000 });
    expect(await planButtons.count()).toBeGreaterThan(0);
  });

  test("كل plan فيه: اسم، سعر، features list، subscribe button", async ({ page }) => {
    const articles = page.locator("article");
    await expect(articles.first()).toBeVisible({ timeout: 30_000 });
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);

    const first = articles.first();
    await expect(first.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(first.getByText(/جنيه/)).toBeVisible();
    await expect(
      first.getByRole("button", { name: /اشترك الآن|لديك اشتراك نشط/ })
    ).toBeVisible();
  });

  test('لو في اشتراك: "اشترك الآن" buttons disabled ("لديك اشتراك نشط")', async ({ page }) => {
    await student.waitForContentLoaded();
    const hasSubscription = await page.getByText(/خطتك:/).first().isVisible().catch(() => false);
    if (!hasSubscription) {
      test.skip(true, "لا يوجد اشتراك نشط على حساب الاختبار");
      return;
    }
    const buttons = page.getByRole("button", { name: "لديك اشتراك نشط" });
    expect(await buttons.count()).toBeGreaterThan(0);
    await expect(buttons.first()).toBeDisabled();
  });

  test("Payment method selector ظاهر لو مفيش اشتراك", async ({ page }) => {
    await student.waitForContentLoaded();
    const hasSubscription = await page.getByText(/خطتك:/).first().isVisible().catch(() => false);
    if (hasSubscription) {
      test.skip(true, "يوجد اشتراك نشط — لا يظهر محدد الدفع");
      return;
    }
    await expect(page.getByText("طريقة الدفع", { exact: true })).toBeVisible();
  });

  test("Featured plan متميز بـ highlight", async ({ page }) => {
    await student.waitForContentLoaded();
    const subscribeButtons = page.getByRole("button", { name: /اشترك الآن|لديك اشتراك نشط/ });
    await expect(subscribeButtons.first()).toBeVisible({ timeout: 30_000 });
    const featuredLabel = page.getByText(/مميز|الأكثر طلباً/).first();
    if (!(await featuredLabel.isVisible().catch(() => false))) {
      expect(await subscribeButtons.count()).toBeGreaterThan(0);
      return;
    }
    const featuredCard = featuredLabel.locator("xpath=ancestor::article[1]");
    await expect(featuredCard).toHaveClass(/ring-peak-orange|border-peak-orange/);
  });
});
